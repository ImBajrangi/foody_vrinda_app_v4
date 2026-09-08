import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useFastNotify(shopId, role, onAlert) {
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Only subscribe if shopId and role are provided, and user is present
    if (!shopId || !role) return;

    let unsubscribe = null;
    let alarmSettings = { kitchenNew: true, kitchenReady: false, deliveryReady: true };
    let isCancelled = false;

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
          if (error.code === 'permission-denied') {
            // Permission restricted for unauthenticated/guest desk view - unsubscribe to prevent reconnect spam
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
          } else {
            console.warn("Fast Notify subscription warning:", error.message);
          }
        });
      } catch (err) {
        // Guard against synchronous subscription issues
      }
    };

    startListening();

    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [shopId, role, onAlert]);
}
