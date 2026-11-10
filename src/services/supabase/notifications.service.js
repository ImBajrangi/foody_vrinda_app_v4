import { supabase, isTableWriteForbidden, markTableWriteForbidden } from './client.js';
import { nativeNotify } from '../nativeNotificationService.js';
import { multiplexer } from './realtime.service.js';

// ========================================================================
// NOTIFICATIONS CREATION, READ & STAFF REALTIME BROADCAST
// ========================================================================

/**
 * Send customized staff-related notification to specifically categorized users
 * Dispatches via Supabase Database + Edge Function FCM + Supabase Realtime Stream
 */
export async function sendStaffBroadcastNotification({
  title,
  message,
  targetRole = 'all',
  targetShopId = 'all',
  targetUserId = null,
  priority = 'normal',
  sound = 'default',
  category = 'general',
  senderId = null,
  senderName = 'Developer',
  data = {}
}) {
  const notifId = `notif_staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const resolvedType = (category === 'app_update' || data?.type === 'app_update') ? 'app_update' : 'staff_custom';
  let rpcSuccess = false;
  let broadcastResult = null;

  // 1. First Attempt: Security Definer Stored Procedure RPC (Instant atomic dispatch + recipient query)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('send_staff_broadcast', {
      p_title: title,
      p_message: message,
      p_target_role: targetRole,
      p_target_shop_id: targetShopId,
      p_target_user_id: targetUserId,
      p_priority: priority,
      p_sound: sound,
      p_category: category,
      p_sender_id: senderId,
      p_sender_name: senderName,
      p_data: data
    });

    if (!rpcError && rpcData && rpcData.success !== false) {
      rpcSuccess = true;
      broadcastResult = rpcData;
    }
  } catch (rpcErr) {
    console.info('send_staff_broadcast RPC fallback note:', rpcErr?.message || rpcErr);
  }

  // 2. Fallback: Direct Table Insertion (Zero-fail compatibility even before SQL migration execution)
  if (!rpcSuccess) {
    try {
      // First try with full columns
      const fullPayload = {
        id: notifId,
        title,
        message,
        type: resolvedType,
        role: targetRole || 'all',
        shop_id: targetShopId || 'all',
        user_id: targetUserId || null,
        priority: priority || 'normal',
        sound: sound || 'default',
        category: category || 'general',
        sender_id: senderId || null,
        sender_name: senderName || 'Developer',
        data: data || {},
        read: false,
        created_at: new Date().toISOString()
      };

      let insertError = null;
      const { error: fullErr } = await supabase
        .from('foody_notifications')
        .insert([fullPayload]);

      if (fullErr) {
        insertError = fullErr;
        // If priority/category columns are missing in schema cache, fallback to base supported columns
        if (fullErr.code === 'PGRST204' || String(fullErr.message || '').includes('Could not find')) {
          const basePayload = {
            id: notifId,
            title,
            message,
            type: resolvedType,
            role: targetRole || 'all',
            shop_id: targetShopId || 'all',
            user_id: targetUserId || null,
            read: false,
            created_at: new Date().toISOString()
          };
          const { error: baseErr } = await supabase
            .from('foody_notifications')
            .insert([basePayload]);
          insertError = baseErr;
        }
      }

      if (!insertError) {
        rpcSuccess = true;
      }
    } catch (insertEx) {
      console.warn('Direct notification insert note:', insertEx);
    }
  }

  // 3. Ultra-low latency websocket broadcast across all connected devices
  try {
    const finalNotifId = broadcastResult?.notification_id || notifId;
    multiplexer.broadcastNotification({
      id: finalNotifId,
      title,
      message,
      type: resolvedType,
      role: targetRole || 'all',
      shopId: targetShopId || 'all',
      shop_id: targetShopId || 'all',
      userId: targetUserId || null,
      user_id: targetUserId || null,
      priority: priority || 'normal',
      sound: sound || 'default',
      category: category || 'general',
      senderId: senderId || null,
      sender_id: senderId || null,
      senderName: senderName || 'Developer',
      sender_name: senderName || 'Developer',
      data: data || {},
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (bcErr) {
    console.info('Multiplexer notification broadcast note:', bcErr?.message || bcErr);
  }

  // 4. Query Target Recipient Information & FCM Tokens from foody_logged_users
  let recipients = [];
  let fcmCount = 0;
  try {
    let query = supabase
      .from('foody_logged_users')
      .select('id, display_name, role, shop_id, phone, fcm_token');

    if (targetUserId) {
      query = query.eq('id', targetUserId);
    } else {
      if (targetRole && targetRole !== 'all') {
        if (targetRole === 'staff') {
          query = query.in('role', ['owner', 'kitchen', 'delivery', 'rider', 'developer', 'grand_admin', 'admin']);
        } else if (targetRole === 'delivery' || targetRole === 'rider') {
          query = query.in('role', ['delivery', 'rider']);
        } else {
          query = query.eq('role', targetRole);
        }
      }
      if (targetShopId && targetShopId !== 'all') {
        query = query.eq('shop_id', targetShopId);
      }
    }

    const { data: usersData } = await query;
    if (usersData && usersData.length > 0) {
      recipients = usersData.map(u => ({
        id: u.id,
        name: u.display_name || u.role,
        role: u.role,
        phone: u.phone,
        hasFcm: Boolean(u.fcm_token)
      }));
      fcmCount = recipients.filter(r => r.hasFcm).length;
    }
  } catch (userQueryErr) {
    console.warn('Recipient query note:', userQueryErr);
  }

  // 4. Background Best-Effort Push to Devices via Edge Function (FCM HTTP v1)
  Promise.resolve().then(async () => {
    try {
      await supabase.functions.invoke('order-push-notification', {
        body: {
          type: 'STAFF_BROADCAST',
          notification_id: broadcastResult?.notification_id || notifId,
          title,
          message,
          target_role: targetRole,
          target_shop_id: targetShopId,
          target_user_id: targetUserId,
          priority,
          sound,
          data
        }
      });
    } catch (fcmInvokeErr) {
      console.info('Background FCM invocation notice:', fcmInvokeErr?.message || fcmInvokeErr);
    }
  });

  return {
    success: true,
    notificationId: broadcastResult?.notification_id || notifId,
    title,
    message,
    targetRole,
    targetShopId,
    targetUserId,
    priority,
    totalTargetUsers: broadcastResult?.total_target_users || recipients.length,
    fcmTokensCount: broadcastResult?.fcm_tokens_count || fcmCount,
    recipients: broadcastResult?.recipients || recipients,
    dispatchedAt: new Date().toISOString()
  };
}

/**
 * Fetch staff & system notification history for live monitoring
 */
export async function fetchStaffBroadcastHistory(limitCount = 30) {
  try {
    const { data, error } = await supabase
      .from('foody_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) {
      console.warn('fetchStaffBroadcastHistory error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('fetchStaffBroadcastHistory exception:', err);
    return [];
  }
}

export async function createCloudNotification({ userId, role, shopId, orderId, message }) {
  if (isTableWriteForbidden('foody_notifications')) {
    return null;
  }

  try {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data, error } = await supabase
      .from('foody_notifications')
      .insert([{
        id: notifId,
        user_id: userId || null,
        role: role || 'customer',
        shop_id: shopId || null,
        order_id: orderId || null,
        message,
        read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '42501' || String(error.message || '').includes('violates row-level security') || error.status === 403) {
        markTableWriteForbidden('foody_notifications');
      }
      return null;
    }
    return data;
  } catch (err) {
    if (String(err?.message || '').includes('violates row-level security') || err?.status === 403) {
      markTableWriteForbidden('foody_notifications');
    }
    return null;
  }
}

export async function markCloudNotificationRead(notifId, isRead = true) {
  if (isTableWriteForbidden('foody_notifications')) {
    return;
  }
  try {
    const { error } = await supabase
      .from('foody_notifications')
      .update({ read: isRead })
      .eq('id', notifId);
    if (error && (error.code === '42501' || error.status === 403)) {
      markTableWriteForbidden('foody_notifications');
    }
  } catch (_) { }
}
