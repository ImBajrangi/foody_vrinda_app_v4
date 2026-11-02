import { supabase, isTableWriteForbidden, markTableWriteForbidden } from './client.js';

// ========================================================================
// NOTIFICATIONS CREATION & READ
// ========================================================================

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
