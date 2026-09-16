import { useEffect, useRef } from 'react';
import { subscribeCloudOrders } from '../supabase';

/**
 * High-speed Realtime Staff Notification Hook
 * Delivers instant auditory alarms & push alerts across Kitchen, Rider/Delivery, and Owner roles.
 */
export function useFastNotify(shopIds, role, onAlert) {
  const lastAlertedOrdersRef = useRef(new Set());

  useEffect(() => {
    if (!shopIds || !role || !onAlert) return;

    const targetShops = Array.isArray(shopIds) ? shopIds : [shopIds].filter(Boolean);
    if (targetShops.length === 0) return;

    const normalizedRole = (role || '').toLowerCase().trim();
    const isKitchenStaff = ['kitchen', 'chef', 'bhojanalaya', 'cook'].includes(normalizedRole);
    const isDeliveryStaff = ['delivery', 'transport', 'rider', 'sarathi', 'driver'].includes(normalizedRole);
    const isManagement = ['owner', 'admin', 'manager', 'developer', 'staff'].includes(normalizedRole);

    const unsubs = [];

    targetShops.forEach(sId => {
      try {
        const unsub = subscribeCloudOrders(sId, (order, eventType) => {
          if (!order || !order.id) return;

          const alertKey = `${order.id}-${order.status}`;
          if (lastAlertedOrdersRef.current.has(alertKey)) {
            return; // Deduplicate alert to prevent double ringing
          }

          let shouldAlarm = false;
          let alertTitle = "";

          if (order.status === 'new') {
            if (isKitchenStaff || isManagement) {
              shouldAlarm = true;
              alertTitle = "NEW ORDER IN KITCHEN!";
            }
          } else if (order.status === 'ready_for_pickup') {
            if (isDeliveryStaff || isManagement) {
              shouldAlarm = true;
              alertTitle = "ORDER READY FOR PICKUP!";
            }
          } else if (order.status === 'cancelled') {
            if (isKitchenStaff || isDeliveryStaff || isManagement) {
              shouldAlarm = true;
              alertTitle = "ORDER CANCELLED!";
            }
          }

          if (shouldAlarm) {
            lastAlertedOrdersRef.current.add(alertKey);
            // Prune set when exceeding threshold
            if (lastAlertedOrdersRef.current.size > 120) {
              lastAlertedOrdersRef.current.clear();
            }

            onAlert({ 
              order, 
              orderId: order.id, 
              title: alertTitle, 
              role: normalizedRole,
              status: order.status
            });

            // Native Browser Notification for staff when tab is in background
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(alertTitle, {
                  body: `Order #${(order.id || '').slice(-6).toUpperCase()} • ₹${order.total_amount || order.totalAmount || 0} (${order.customer_name || 'Customer'})`,
                  icon: '/favicon.ico',
                  tag: alertKey
                });
              } catch (e) {
                // Ignore notification construct failure
              }
            }
          }
        });

        if (unsub) unsubs.push(unsub);
      } catch (err) {
        console.warn("useFastNotify subscription note:", err.message);
      }
    });

    return () => {
      unsubs.forEach(fn => {
        try { fn(); } catch (e) {}
      });
    };
  }, [shopIds, role, onAlert]);
}

