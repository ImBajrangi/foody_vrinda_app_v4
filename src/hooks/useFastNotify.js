import { useEffect } from 'react';
import { subscribeCloudOrders } from '../supabase';

export function useFastNotify(shopId, role, onAlert) {
  useEffect(() => {
    if (!shopId || !role) return;

    let unsubscribeSupabase = null;

    try {
      unsubscribeSupabase = subscribeCloudOrders(shopId, (order, eventType) => {
        if (!order) return;

        let shouldAlarm = false;
        let alertTitle = "";

        if (eventType === 'INSERT' && order.status === 'new') {
          if (role === 'kitchen' || role === 'owner') {
            shouldAlarm = true;
            alertTitle = "NEW ORDER!";
          }
        } else if (order.status === 'ready_for_pickup') {
          if (role === 'delivery' || role === 'owner') {
            shouldAlarm = true;
            alertTitle = "ORDER READY FOR PICKUP!";
          }
        }

        if (shouldAlarm && onAlert) {
          onAlert({ order, orderId: order.id, title: alertTitle });
        }
      });
    } catch (sbErr) {
      console.warn("Supabase Realtime alert hook note:", sbErr.message);
    }

    return () => {
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [shopId, role, onAlert]);
}
