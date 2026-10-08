import { supabase } from './client.js';

// ========================================================================
// NOTIFICATIONS CREATION & READ
// ========================================================================

export async function createCloudNotification({ userId, role, shopId, orderId, message }) {
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

    if (error) console.warn('createCloudNotification note:', error.message);
    return data;
  } catch (err) {
    console.warn('createCloudNotification exception:', err.message);
    return null;
  }
}

export async function markCloudNotificationRead(notifId, isRead = true) {
  try {
    await supabase
      .from('foody_notifications')
      .update({ read: isRead })
      .eq('id', notifId);
  } catch (err) {
    console.warn('markCloudNotificationRead warning:', err.message);
  }
}
