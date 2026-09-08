import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useFastNotify(shopId, role, onAlert) {
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!shopId || !role) return;

    let unsubscribe = null;
    let alarmSettings = { kitchenNew: true, kitchenReady: false, deliveryReady: true };

    const startListening = async () => {
      // Fetch shop's alarm settings
      try {
        const shopDoc = await getDoc(doc(db, "shops", shopId));
        if (shopDoc.exists()) {
          alarmSettings = shopDoc.data().alarmSettings || alarmSettings;
        }
      } catch (e) {
        console.warn("Failed to fetch alarm settings, using defaults:", e);
      }

      console.log(`🔊 Listening to orders for Shop: ${shopId} | Role: ${role} | Settings:`, alarmSettings);

      const q = query(
        collection(db, "orders"),
        where("shopId", "==", shopId)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        // Skip triggering alarms for the initial records fetched on subscription
        if (isFirstRun.current) {
          isFirstRun.current = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;

          const order = change.doc.data();
          let shouldAlarm = false;
          let alertTitle = "";

          // Check if order is recent (less than 5 minutes old) to prevent historical alerts
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
        console.error("Fast Notify snapshot error: ", error);
      });
    };

    startListening();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [shopId, role, onAlert]);
}
