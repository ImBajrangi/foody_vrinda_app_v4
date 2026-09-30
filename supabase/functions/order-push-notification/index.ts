import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// Generate Google OAuth2 Access Token for FCM HTTP v1 using Service Account JSON
async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };

  const base64UrlEncode = (str: string) => {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const utf8ToBase64Url = (obj: object) => {
    return base64UrlEncode(JSON.stringify(obj));
  };

  const unsignedJwt = `${utf8ToBase64Url(header)}.${utf8ToBase64Url(claimSet)}`;

  // Clean and parse PEM private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  let pemContents = serviceAccount.private_key;
  if (pemContents.includes(pemHeader)) {
    pemContents = pemContents
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
  }

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKPKCS1-v1_5",
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  )}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenResp.ok || !tokenData.access_token) {
    throw new Error(`Failed to get Google Access Token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Send FCM HTTP v1 Notification
async function sendFCMMessage(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  notification: { title: string; body: string },
  channelId: string,
  sound: string,
  dataPayload: Record<string, string>
) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const soundName = sound.replace(/\.wav$/, ''); // Android resource raw name

  const payload = {
    message: {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: channelId,
          sound: soundName,
          default_sound: false,
          color: "#E0FF33",
          icon: "ic_stat_notification",
        },
      },
      data: dataPayload,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json; UTF-8",
    },
    body: JSON.stringify(payload),
  });

  const resJson = await resp.json();
  return { ok: resp.ok, status: resp.status, resJson };
}

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const serviceAccountJsonStr = Deno.env.get("FCM_SERVICE_ACCOUNT") || "";

    if (!serviceAccountJsonStr) {
      return new Response(
        JSON.stringify({ error: "Missing FCM_SERVICE_ACCOUNT in Edge Function secrets." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJsonStr);
    const projectId = serviceAccount.project_id || "vrinda-cloud-kitchen";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    // Supabase Webhook payload format
    const { type, record, old_record } = body;
    const order = record || body.order;

    if (!order || !order.id) {
      return new Response(
        JSON.stringify({ message: "No order record found in payload" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const orderIdShort = String(order.id).slice(-4).toUpperCase();
    const status = (order.status || "").toLowerCase();
    const oldStatus = (old_record?.status || "").toLowerCase();

    // Skip if status didn't change on UPDATE
    if (type === "UPDATE" && status === oldStatus) {
      return new Response(
        JSON.stringify({ message: "Status unchanged, skipping push" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const googleAccessToken = await getGoogleAccessToken(serviceAccount);
    const results = [];

    // 1. Fetch Customer FCM Token
    const customerId = order.customer_id || order.userId;
    const customerPhone = order.customer_phone || order.phone;
    const customerEmail = order.customer_email || order.email;

    let customerToken = body.fcm_token || order.fcm_token || null;
    let customerSound = "soft_pulse"; // Default refined sound

    if (!customerToken && (customerId || customerPhone || customerEmail)) {
      const { data: userProfile } = await supabase
        .from("foody_users")
        .select("fcm_token, id, email, phone")
        .or(`id.eq.${customerId || "00000000-0000-0000-0000-000000000000"},email.eq.${customerEmail || "none"},phone.eq.${customerPhone || "0"}`)
        .not("fcm_token", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      customerToken = userProfile?.fcm_token;

      if (!customerToken) {
        const { data: loggedProfile } = await supabase
          .from("foody_logged_users")
          .select("fcm_token, id, email, phone")
          .or(`id.eq.${customerId || "00000000-0000-0000-0000-000000000000"},email.eq.${customerEmail || "none"},phone.eq.${customerPhone || "0"}`)
          .not("fcm_token", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        customerToken = loggedProfile?.fcm_token;
      }
    }

    // Determine Customer Notification Message
    if (customerToken) {
      let title = `🍛 Order #${orderIdShort} Update`;
      let text = `Your order status changed to ${status}`;

      if (type === "INSERT" || status === "new") {
        title = `🙏 Prasad Order #${orderIdShort} Confirmed!`;
        text = `Thank you! Your Vedic prasad order is being prepared with pure Desi Ghee.`;
      } else if (status === "cooking" || status === "preparing") {
        title = `🔥 Kitchen Simmering #${orderIdShort}`;
        text = `Your prasad is being freshly cooked in pure Desi Ghee with devotion.`;
      } else if (status === "ready" || status === "ready_for_pickup") {
        title = `✨ Prasad Packed & Blessed #${orderIdShort}`;
        text = `Awaiting express Sarathi pickup from the kitchen.`;
      } else if (status === "out_for_delivery" || status === "dispatched") {
        title = `🛵 Sarathi En Route #${orderIdShort}`;
        text = `Your sacred prasad is on its way with live GPS tracking.`;
      } else if (status === "delivered" || status === "completed") {
        title = `🌸 Prasad Delivered Safely #${orderIdShort}`;
        text = `Savor the divine blessings of Sri Dham Vrindavan. Radhe Radhe! 🙏`;
      }

      const res = await sendFCMMessage(
        projectId,
        googleAccessToken,
        customerToken,
        { title, body: text },
        "order_updates",
        customerSound,
        { orderId: String(order.id), status: String(status) }
      );
      results.push({ recipient: "customer", res });
    }

    // 2. Alert Kitchen & Owner on New Orders
    if (type === "INSERT" || status === "new") {
      const { data: staffUsers } = await supabase
        .from("foody_users")
        .select("fcm_token, role")
        .in("role", ["kitchen", "owner", "admin"])
        .not("fcm_token", "is", null);

      if (staffUsers && staffUsers.length > 0) {
        for (const staff of staffUsers) {
          if (!staff.fcm_token) continue;
          const isKitchen = staff.role === "kitchen";
          const title = isKitchen
            ? `🔔 NEW BHOG ORDER #${orderIdShort} · ₹${order.total_amount || 0}`
            : `💰 NEW ORDER #${orderIdShort} · ₹${order.total_amount || 0}`;
          const bodyMsg = isKitchen
            ? `Items received! Tap to start cooking with pure Desi Ghee.`
            : `${order.customer_name || 'Customer'} ordered. Tap to view stream.`;
          const channel = isKitchen ? "kitchen_urgent" : "owner_urgent";
          const sound = isKitchen ? "kitchen_alert" : "owner_alert";

          const res = await sendFCMMessage(
            projectId,
            googleAccessToken,
            staff.fcm_token,
            { title, body: bodyMsg },
            channel,
            sound,
            { orderId: String(order.id), type: staff.role }
          );
          results.push({ recipient: staff.role, res });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("FCM Edge Function Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
