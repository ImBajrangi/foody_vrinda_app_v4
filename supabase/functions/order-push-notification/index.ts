// @ts-nocheck
// deno-lint-ignore-file
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
        direct_boot_ok: true,
        notification: {
          channel_id: channelId || "order_updates",
          sound: soundName || "soft_pulse",
          default_sound: true,
          default_vibrate_timings: true,
          priority: "PRIORITY_MAX",
          visibility: "PUBLIC",
          color: "#E0FF33",
          icon: "ic_stat_notification",
        },
      },
      data: {
        ...dataPayload,
        title: notification.title,
        body: notification.body,
        channelId: channelId || "order_updates",
        sound: soundName || "soft_pulse",
      },
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const serviceAccountJsonStr = Deno.env.get("FCM_SERVICE_ACCOUNT") || "";

    if (!serviceAccountJsonStr) {
      return new Response(
        JSON.stringify({ error: "Missing FCM_SERVICE_ACCOUNT in Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderIdShort = String(order.id).slice(-4).toUpperCase();
    const status = (order.status || "").toLowerCase();
    const oldStatus = (old_record?.status || "").toLowerCase();

    // Extract items summary & customer name for rich personalization
    const itemsList = Array.isArray(order.items)
      ? order.items
      : (typeof order.items === 'string' ? (() => { try { return JSON.parse(order.items); } catch (_) { return []; } })() : []);
    const firstItemName = itemsList[0]?.name || itemsList[0]?.title || "Vedic Prasad";
    const extraItemsCount = itemsList.length > 1 
      ? ` (+${itemsList.length - 1} more)` 
      : (itemsList[0]?.quantity > 1 ? ` (x${itemsList[0].quantity})` : "");
    const itemsSummary = `${firstItemName}${extraItemsCount}`;

    const customerFullName = (order.customer_name || order.customerName || order.user_name || order.userName || order.delivery_address?.name || "Bhakta").trim();
    const customerFirstName = customerFullName.split(" ")[0] || "Bhakta";

    // Skip if status didn't change on UPDATE
    if (type === "UPDATE" && status === oldStatus) {
      return new Response(
        JSON.stringify({ message: "Status unchanged, skipping push" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const googleAccessToken = await getGoogleAccessToken(serviceAccount);
    const results = [];

    // Fetch shop settings for multi-role preferences (self-chef, self-delivery)
    const orderShopId = order.shop_id || order.shopId || "shop-vrinda-main";
    let shopSettings: any = null;
    try {
      const { data: shopData } = await supabase
        .from("foody_shops")
        .select("id, name, alarm_settings, payment_settings")
        .eq("id", orderShopId)
        .limit(1)
        .maybeSingle();
      shopSettings = shopData;
    } catch (_) {}

    const isSelfChef = Boolean(shopSettings?.payment_settings?.self_chef_mode || shopSettings?.alarm_settings?.kitchenNew);
    const isSelfDelivery = Boolean(shopSettings?.payment_settings?.self_delivery_mode);

    // --- ESCALATION 1: UNRESPONSIVE KITCHEN WARNING (3-Minute Alert to Developer) ---
    if (type === "UNRESPONSIVE_ALERT") {
      const { data: devProfiles } = await supabase
        .from("foody_logged_users")
        .select("fcm_token")
        .eq("role", "developer")
        .not("fcm_token", "is", null);

      if (devProfiles && devProfiles.length > 0) {
        for (const dev of devProfiles) {
          if (!dev.fcm_token) continue;
          const shopName = shopSettings?.name || "Kitchen";
          const res = await sendFCMMessage(
            projectId,
            googleAccessToken,
            dev.fcm_token,
            {
              title: `⚠️ Kitchen Alert: ${shopName}`,
              body: `${customerFullName}'s order (${itemsSummary} · ₹${order.total_amount || 0}) pending 3+ mins without acceptance.`
            },
            "system_alerts",
            "owner_alert",
            { orderId: String(order.id), type: "unresponsive_escalation" }
          );
          results.push({ recipient: "developer_escalation", res });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ESCALATION 2: 5-MINUTE TIMEOUT AUTO-CANCEL (SHOP UNRESPONSIVE) ---
    if (type === "AUTO_CANCEL_UNRESPONSIVE" || status === "auto_cancelled_unresponsive") {
      // Notify Customer (Clear communication: Shop is currently not responding)
      if (customerToken) {
        const res = await sendFCMMessage(
          projectId,
          googleAccessToken,
          customerToken,
          {
            title: `⚠️ Order Not Accepted · ${itemsSummary}`,
            body: `Kshama karein ${customerFirstName}! Currently shop respond nahi kar rahi hai. Kripya thodi der baad try karein ya kisi dusri shop se order karein.`
          },
          "order_updates",
          customerSound,
          { orderId: String(order.id), status: "cancelled_unresponsive" }
        );
        results.push({ recipient: "customer_timeout", res });
      }

      // Notify Developer of Incident
      const { data: devProfiles } = await supabase
        .from("foody_logged_users")
        .select("fcm_token")
        .eq("role", "developer")
        .not("fcm_token", "is", null);

      if (devProfiles && devProfiles.length > 0) {
        for (const dev of devProfiles) {
          if (!dev.fcm_token) continue;
          const res = await sendFCMMessage(
            projectId,
            googleAccessToken,
            dev.fcm_token,
            {
              title: `⚠️ Shop Unresponsive: ${shopSettings?.name || 'Kitchen'}`,
              body: `${customerFullName}'s order for ${itemsSummary} (₹${order.total_amount || 0}) was not accepted within 5 mins. Order marked unaccepted.`
            },
            "system_alerts",
            "owner_alert",
            { orderId: String(order.id), type: "timeout_rejected" }
          );
          results.push({ recipient: "dev_timeout_notice", res });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Customer Notification Dispatch
    if (customerToken) {
      let title = `🍛 ${itemsSummary} Update`;
      let text = `Your order status changed to ${status}`;

      if (type === "INSERT" || status === "new") {
        title = `🙏 ${itemsSummary} Confirmed!`;
        text = `Thank you ${customerFirstName}! Freshly prepared with pure Desi Ghee.`;
      } else if (status === "cooking" || status === "preparing") {
        title = `🔥 Cooking: ${itemsSummary}`;
        text = `Your prasad is simmering with devotion in the sacred kitchen.`;
      } else if (status === "ready" || status === "ready_for_pickup") {
        title = `✨ ${itemsSummary} Packed & Blessed`;
        text = `Packed hot and ready for express Sarathi delivery, ${customerFirstName}!`;
      } else if (status === "out_for_delivery" || status === "dispatched") {
        title = `🛵 Sarathi En Route with ${itemsSummary}`;
        text = `Your sacred prasad is on its way with live GPS tracking.`;
      } else if (status === "delivered" || status === "completed") {
        title = `🌸 ${itemsSummary} Delivered!`;
        text = `Savor the divine blessings of Sri Dham Vrindavan, ${customerFirstName}. Radhe Radhe! 🙏`;
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

    // 2. Alert Kitchen & Self-Chef Owner on New Orders (INSERT or status: 'new')
    if (type === "INSERT" || status === "new") {
      const allowedRoles = ["kitchen"];
      if (isSelfChef) allowedRoles.push("owner");

      const [usersRes, loggedRes] = await Promise.all([
        supabase
          .from("foody_users")
          .select("fcm_token, role")
          .in("role", allowedRoles)
          .not("fcm_token", "is", null),
        supabase
          .from("foody_logged_users")
          .select("fcm_token, role")
          .in("role", allowedRoles)
          .not("fcm_token", "is", null)
      ]);

      const staffList = [...(usersRes.data || []), ...(loggedRes.data || [])];
      const seenTokens = new Set<string>();

      for (const staff of staffList) {
        if (!staff.fcm_token || seenTokens.has(staff.fcm_token)) continue;
        seenTokens.add(staff.fcm_token);

        const title = `🔔 NEW BHOG: ${itemsSummary} · ₹${order.total_amount || 0}`;
        const bodyMsg = `Ordered by ${customerFullName}. Tap to accept & start cooking!`;

        const res = await sendFCMMessage(
          projectId,
          googleAccessToken,
          staff.fcm_token,
          { title, body: bodyMsg },
          "kitchen_urgent",
          "kitchen_alert",
          { orderId: String(order.id), type: "kitchen" }
        );
        results.push({ recipient: staff.role, res });
      }
    }

    // 3. Predictive Early Dispatch for Sarathi Delivery Riders (status: 'cooking' / 'preparing')
    // Broadcasts early while kitchen cooks so rider arrives right on time!
    if (status === "cooking" || status === "preparing") {
      const riderRoles = ["delivery"];
      if (isSelfDelivery) riderRoles.push("owner");

      const [rUsers, rLogged] = await Promise.all([
        supabase
          .from("foody_users")
          .select("fcm_token, role, is_online, duty_status")
          .in("role", riderRoles)
          .not("fcm_token", "is", null),
        supabase
          .from("foody_logged_users")
          .select("fcm_token, role, is_online, duty_status")
          .in("role", riderRoles)
          .not("fcm_token", "is", null)
      ]);

      const riderList = [...(rUsers.data || []), ...(rLogged.data || [])];
      const seenRiderTokens = new Set<string>();

      for (const rider of riderList) {
        if (!rider.fcm_token || seenRiderTokens.has(rider.fcm_token)) continue;
        // Only notify online or on-duty riders
        if (rider.is_online === false || rider.duty_status === "off_duty") continue;
        seenRiderTokens.add(rider.fcm_token);

        const title = `🛵 Early Pickup: ${itemsSummary} · ₹${order.total_amount || 0}`;
        const bodyMsg = `Cooking for ${customerFullName} (~10m ready). Tap to claim delivery!`;

        const res = await sendFCMMessage(
          projectId,
          googleAccessToken,
          rider.fcm_token,
          { title, body: bodyMsg },
          "driver_dispatch",
          "delivery_alert",
          { orderId: String(order.id), type: "early_dispatch" }
        );
        results.push({ recipient: "rider_early", res });
      }
    }

    // 4. Hot & Ready Dispatch Handover (status: 'ready' / 'ready_for_pickup')
    if (status === "ready" || status === "ready_for_pickup") {
      const assignedRiderId = order.rider_id || order.riderId;
      const assignedRiderPhone = order.rider_phone || order.riderPhone;

      let targetRiderToken = null;
      if (assignedRiderId || assignedRiderPhone) {
        const { data: rProfile } = await supabase
          .from("foody_logged_users")
          .select("fcm_token")
          .or(`id.eq.${assignedRiderId || "00000000-0000-0000-0000-000000000000"},phone.eq.${assignedRiderPhone || "0"}`)
          .not("fcm_token", "is", null)
          .limit(1)
          .maybeSingle();
        targetRiderToken = rProfile?.fcm_token;
      }

      if (targetRiderToken) {
        const title = `✨ Ready for Pickup: ${itemsSummary}`;
        const bodyMsg = `Order for ${customerFullName} is packed & hot on counter. Show OTP to collect!`;

        const res = await sendFCMMessage(
          projectId,
          googleAccessToken,
          targetRiderToken,
          { title, body: bodyMsg },
          "driver_dispatch",
          "delivery_alert",
          { orderId: String(order.id), type: "pickup_ready" }
        );
        results.push({ recipient: "assigned_rider", res });
      }
    }

    // 5. Immediate Payment Received Alert to Store Owner (status: 'delivered' / 'completed')
    if (status === "delivered" || status === "completed") {
      const { data: ownerProfiles } = await supabase
        .from("foody_logged_users")
        .select("fcm_token, role")
        .eq("role", "owner")
        .not("fcm_token", "is", null);

      if (ownerProfiles && ownerProfiles.length > 0) {
        for (const owner of ownerProfiles) {
          if (!owner.fcm_token) continue;
          const payMode = (order.payment_method || "cash").toUpperCase();
          const title = `💰 ₹${order.total_amount || 0} Received · ${itemsSummary}`;
          const bodyMsg = `Delivered to ${customerFullName} via Sarathi. Method: ${payMode}.`;

          const res = await sendFCMMessage(
            projectId,
            googleAccessToken,
            owner.fcm_token,
            { title, body: bodyMsg },
            "owner_urgent",
            "owner_alert",
            { orderId: String(order.id), type: "payment_settled" }
          );
          results.push({ recipient: "owner_payment", res });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("FCM Edge Function Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
