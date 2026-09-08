import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { subscribeCloudOrders } from '../supabase';

export function useFastNotify(shopId, role, onAlert) {
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!shopId || !role) return;

    let unsubscribeFirebase = null;
    let unsubscribeSupabase = null;
    let alarmSettings = { kitchenNew: true, kitchenReady: false, deliveryReady: true };
    let isCancelled = false;

    // 1. Listen via Supabase Realtime Channel
    try {
      unsubscribeSupabase = subscribeCloudOrders(shopId, (payload) => {
        const order = payload.new;
        if (!order) return;

        let shouldAlarm = false;
        let alertTitle = "";

        if (payload.eventType === 'INSERT' && order.status === 'new') {
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

    const startListening = async () => {
      // Fetch shop's alarm settings if accessible
      try {
        const shopDoc = await getDoc(doc(db, "shops", shopId));
        if (shopDoc.exists()) {
          alarmSettings = shopDoc.data().alarmSettings || alarmSettings;
        }
      } catch (e) {
        // Silently fall back to default alarm settings
      }

      if (isCancelled) return;

      const q = query(
        collection(db, "orders"),
        where("shopId", "==", shopId)
      );

      try {
        unsubscribeFirebase = onSnapshot(q, (snapshot) => {
          if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type !== "added") return;

            const order = change.doc.data();
            let shouldAlarm = false;
            let alertTitle = "";

            const now = Date.now();
            const orderTime = order.createdAt?.toMillis ? order.createdAt.toMillis() : now;
            const isRecent = (now - orderTime) < (5 * 60 * 1000);

            if (!isRecent) return;

            if (order.status === 'new') {
              if ((role === 'kitchen' || role === 'owner') && alarmSettings.kitchenNew) {
                shouldAlarm = true;
                alertTitle = "NEW ORDER!";
              }
            } else if (order.status === 'ready_for_pickup') {
              if (role === 'delivery' && alarmSettings.deliveryReady) {
                shouldAlarm = true;
                alertTitle = "ORDER READY!";
              } else if ((role === 'kitchen' || role === 'owner') && alarmSettings.kitchenReady) {
                shouldAlarm = true;
                alertTitle = "ORDER READY!";
              }
            }

            if (shouldAlarm && onAlert) {
              onAlert({ order, orderId: change.doc.id, title: alertTitle });
            }
          });
        }, (error) => {
          if (error.code === 'permission-denied') {
            if (unsubscribeFirebase) {
              unsubscribeFirebase();
              unsubscribeFirebase = null;
            }
          }
        });
      } catch (err) {
        // Guard against synchronous subscription issues
      }
    };

    startListening();

    return () => {
      isCancelled = true;
      if (unsubscribeFirebase) unsubscribeFirebase();
      if (unsubscribeSupabase) unsubscribeSupabase();
    };
  }, [shopId, role, onAlert]);
}
