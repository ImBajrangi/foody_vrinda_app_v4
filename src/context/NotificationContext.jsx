/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  supabase,
  subscribeCloudNotifications, 
  markCloudNotificationRead, 
  createCloudNotification, 
  subscribeCloudOrders,
  getOrderItemSummary,
  getOrderCustomerName,
  getPurgedOrderIds
} from '../supabase';
import { nativeNotify } from '../services/nativeNotificationService';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'foody_vrinda_notifications_v3';

// Utility to filter out synthetic test order notifications and test probes
function isTestNotification(n) {
  if (!n) return true;
  const title = (n.title || '').toLowerCase();
  const msg = (n.message || '').toLowerCase();
  const id = String(n.id || '').toLowerCase();
  const orderId = String(n.orderId || n.order_id || '').toLowerCase();

  try {
    const purgedIds = typeof getPurgedOrderIds === 'function' ? getPurgedOrderIds() : [];
    if (orderId && purgedIds.includes(orderId)) return true;
  } catch (_) {}

  return (
    id.includes('test') ||
    id.includes('probe') ||
    id.includes('audit') ||
    orderId.includes('test') ||
    title.includes('test devo') ||
    title.includes('test cust') ||
    title.includes('test user') ||
    title.includes('order flow') ||
    msg.includes('test devo') ||
    msg.includes('test cust') ||
    msg.includes('test user') ||
    msg.includes('probe')
  );
}

// Clean, welcoming initial notification seeds (NO fake order IDs)
const DEFAULT_SEEDS = [
  {
    id: 'welcome-vrinda-blessing',
    title: 'Welcome to Foody Vrinda',
    message: '100% Pure Satvik Bhog & Prasad in A2 Desi Ghee.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  }
];

export function NotificationProvider({ children }) {
  const { 
    user, 
    userData, 
    userRole, 
    currentUserShopId, 
    currentUserShopIds, 
    isAuthorizedAdmin, 
    isAuthorizedDeveloper 
  } = useAuth();
  
  // Initial state with cleanup of any legacy mock order seeds & stale verbose strings
  const [notifications, setNotifications] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached !== null && cached !== undefined) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Filter out legacy mock seeds, synthetic test notifications, and streamline verbose legacy text
          const sanitized = parsed
            .filter(n => n.id !== 'seed-notif-1' && n.orderId !== 'W399A' && !isTestNotification(n))
            .map(n => {
              let msg = n.message || '';
              if (msg.includes('Experience 100% Satvik Divine Bhog & Prasad')) {
                msg = '100% Pure Satvik Bhog & Prasad in A2 Desi Ghee.';
              } else if (msg.includes('Received for preparation at')) {
                msg = msg.replace('Received for preparation at', 'Queued at') + ' • Kitchen prep';
              }
              return { ...n, message: msg };
            });
          return sanitized;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SEEDS;
  });

  // Owner Staff-Mode Sound Alert preference (saved per device/browser)
  const [ownerSoundAlerts, setOwnerSoundAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('foody_owner_sound_alerts');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleOwnerSoundAlerts = useCallback((enabled) => {
    setOwnerSoundAlerts(prev => {
      const next = typeof enabled === 'boolean' ? enabled : !prev;
      try {
        localStorage.setItem('foody_owner_sound_alerts', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Automatically sanitize any synthetic test order notifications on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(n => n.id !== 'seed-notif-1' && n.orderId !== 'W399A' && !isTestNotification(n));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            setNotifications(cleaned);
          }
        }
      }
      const sessionRaw = localStorage.getItem('foody_my_session_orders');
      if (sessionRaw) {
        const sessionOrders = JSON.parse(sessionRaw);
        if (Array.isArray(sessionOrders)) {
          const validSessionOrders = sessionOrders.filter(id => !String(id).toLowerCase().includes('test'));
          if (validSessionOrders.length !== sessionOrders.length) {
            localStorage.setItem('foody_my_session_orders', JSON.stringify(validSessionOrders));
          }
        }
      }
    } catch (_) {}
  }, []);

  // When user is a guest with no placed orders, sanitize away any leaked foreign order notifications
  useEffect(() => {
    const isGuest = !user || user.isAnonymous || !userData?.isLoggedInUser;
    if (isGuest) {
      try {
        const sessionOrders = JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
        setNotifications(prev => {
          const filtered = prev.filter(n => {
            if ((n.type === 'order' || n.type === 'delivery' || n.type === 'kitchen') && n.orderId) {
              return sessionOrders.includes(n.orderId);
            }
            return true;
          });
          return filtered;
        });
      } catch {
        // ignore
      }
    }
  }, [user, userData]);

  // Listen for local and realtime order purge events across windows / tabs
  useEffect(() => {
    const handleOrdersChanged = (e) => {
      const detail = e.detail || {};
      if (detail.purgedAll) {
        setNotifications(prev => {
          const nonOrderNotifs = prev.filter(n => !n.orderId && !n.order_id && !String(n.id || '').startsWith('order-status-'));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nonOrderNotifs));
          } catch (_) {}
          return nonOrderNotifs;
        });
      } else if (detail.purgedOrderId) {
        setNotifications(prev => {
          const remaining = prev.filter(n => (
            n.orderId !== detail.purgedOrderId && 
            n.order_id !== detail.purgedOrderId && 
            !String(n.id || '').includes(detail.purgedOrderId)
          ));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
          } catch (_) {}
          return remaining;
        });
      }
    };

    window.addEventListener('foody_orders_changed', handleOrdersChanged);
    return () => {
      window.removeEventListener('foody_orders_changed', handleOrdersChanged);
    };
  }, []);

  // Active Database Reconciliation: Sweep away orphaned notifications for purged/deleted orders
  useEffect(() => {
    let isMounted = true;

    async function pruneOrphanedOrderNotifications() {
      try {
        const purgedIds = new Set(typeof getPurgedOrderIds === 'function' ? getPurgedOrderIds() : []);
        
        // Find any notifications tied to an order ID
        const orderNotifs = notifications.filter(n => {
          const oid = n.orderId || n.order_id || (String(n.id || '').startsWith('order-status-') ? String(n.id).split('-')[2] : null);
          return Boolean(oid);
        });

        if (orderNotifs.length === 0) return;

        const candidateIds = Array.from(new Set(
          orderNotifs.map(n => n.orderId || n.order_id || (String(n.id || '').startsWith('order-status-') ? String(n.id).split('-')[2] : null)).filter(Boolean)
        ));

        if (candidateIds.length === 0) return;

        // Check against Supabase foody_orders
        const { data: existingRows, error } = await supabase
          .from('foody_orders')
          .select('id')
          .in('id', candidateIds);

        if (error) {
          console.debug('Prune orphaned order notifications check error:', error.message);
          return;
        }

        if (!isMounted) return;

        const liveOrderIdSet = new Set((existingRows || []).map(r => r.id));

        setNotifications(prev => {
          const valid = prev.filter(n => {
            const oid = n.orderId || n.order_id || (String(n.id || '').startsWith('order-status-') ? String(n.id).split('-')[2] : null);
            if (oid) {
              if (purgedIds.has(oid)) return false;
              if (!liveOrderIdSet.has(oid)) return false; // Order was purged/deleted from DB!
            }
            return true;
          });

          if (valid.length !== prev.length) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
            } catch (_) {}
          }
          return valid;
        });
      } catch (err) {
        console.debug('Prune orphaned order notifications exception:', err);
      }
    }

    pruneOrphanedOrderNotifications();

    return () => {
      isMounted = false;
    };
  }, [notifications.length]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Persist notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  /**
   * Checks if an order event is strictly related to the current user or their operational role.
   * For guest users: ONLY allows orders explicitly placed by this browser session.
   * Prevents any guest user from receiving notifications for other people's orders.
   */
  const isOrderRelatedToUser = useCallback((orderData) => {
    if (!orderData || !orderData.id) return false;

    const isGuest = !user || user.isAnonymous || !userData?.isLoggedInUser;
    const currentUserId = !isGuest ? (user?.id || user?.uid || userData?.id) : null;
    const userCleanPhone = (user?.phone || user?.phoneNumber || userData?.phone || '').replace(/\D/g, '');
    const userEmail = (user?.email || userData?.email || '').toLowerCase().trim();

    const orderUserId = orderData.user_id || orderData.userId || orderData.customer_id || orderData.uid;
    const orderPhone = (orderData.customer_phone || orderData.customerPhone || '').replace(/\D/g, '');
    const orderEmail = (orderData.customer_email || orderData.customerEmail || '').toLowerCase().trim();
    const orderRiderId = orderData.rider_id || orderData.riderId;
    const orderRiderPhone = (orderData.rider_phone || orderData.riderPhone || '').replace(/\D/g, '');
    const orderShopId = orderData.shop_id || orderData.shopId;

    // 1. Guest User: STRICT CHECK - Only allow if order ID was created on this device in session
    if (isGuest) {
      try {
        const sessionOrders = JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
        if (Array.isArray(sessionOrders) && sessionOrders.includes(orderData.id)) {
          return true;
        }
      } catch {
        // ignore
      }
      // Guest with no matching placed session order -> NEVER notify!
      return false;
    }

    // 2. Authenticated Customer Verification: Match against placed customer ID, Phone, or Email
    const isOwnerCustomer = Boolean(
      (currentUserId && orderUserId && String(currentUserId) === String(orderUserId)) ||
      (userCleanPhone && userCleanPhone.length >= 10 && orderPhone && orderPhone.length >= 10 && userCleanPhone.slice(-10) === orderPhone.slice(-10)) ||
      (userEmail && userEmail !== 'guest' && orderEmail && userEmail === orderEmail)
    );

    if (isOwnerCustomer) return true;

    // Also check session placed orders
    try {
      const sessionOrders = JSON.parse(localStorage.getItem('foody_my_session_orders') || '[]');
      if (Array.isArray(sessionOrders) && sessionOrders.includes(orderData.id)) {
        return true;
      }
    } catch {
      // ignore
    }

    // 3. Kitchen Staff Role: Orders belonging to their active kitchen / assigned shop
    if (userRole === 'kitchen') {
      if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
        return true;
      }
      if (Array.isArray(currentUserShopIds) && currentUserShopIds.includes(orderShopId)) {
        return true;
      }
      return false;
    }

    // 4. Delivery Rider Role: Assigned directly to rider OR live delivery order in operating fleet/hub
    if (userRole === 'delivery') {
      const isPickupOrder = orderData.fulfillment_type === 'pickup' || orderData.fulfillmentType === 'pickup';
      if (isPickupOrder) return false;

      const isAssignedRider = Boolean(
        (currentUserId && orderRiderId && String(currentUserId) === String(orderRiderId)) ||
        (userCleanPhone && userCleanPhone.length >= 10 && orderRiderPhone && userCleanPhone.slice(-10) === orderRiderPhone.slice(-10))
      );
      if (isAssignedRider) return true;

      // Delivery rider can see delivery tasks for their active hub or independent fleet across all outlets
      if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
        return true;
      }
      if (Array.isArray(currentUserShopIds) && currentUserShopIds.includes(orderShopId)) {
        return true;
      }
      return false;
    }

    // 5. Store Owner / Admin: Store management for their registered shop(s)
    if (userRole === 'owner' || isAuthorizedAdmin) {
      if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
        return true;
      }
      if (Array.isArray(currentUserShopIds) && currentUserShopIds.includes(orderShopId)) {
        return true;
      }
      return false;
    }

    // 6. Developer & Admin Master Consoles: Receive notifications for their active kitchen/store or placed orders
    if (userRole === 'developer' || isAuthorizedDeveloper || userRole === 'grand_admin') {
      if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
        return true;
      }
      return false;
    }

    // Default: Never show strangers' orders
    return false;
  }, [user, userData, userRole, currentUserShopId, currentUserShopIds, isAuthorizedAdmin, isAuthorizedDeveloper]);

  const [systemNotificationPermission, setSystemNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSystemNotificationPermission(Notification.permission);
    }
  }, []);

  // Direct dispatch of native OS notifications to desktop/mobile notification center
  const sendOSNotification = useCallback((title, options = {}) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notifOptions = {
      icon: '/foody-vrinda-logo.webp',
      badge: '/pwa-192x192.webp',
      vibrate: [200, 100, 200],
      renotify: true,
      tag: options.tag || `foody-notif-${Date.now()}`,
      silent: false,
      ...options
    };

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, notifOptions);
        }).catch(() => {
          if (!/Android|iPhone|iPad/i.test(navigator.userAgent || '') && typeof Notification === 'function') {
            try {
              const fallbackNotif = new Notification(title, notifOptions);
              fallbackNotif.onclick = () => {
                window.focus();
                fallbackNotif.close();
              };
            } catch (_) {}
          }
        });
      } else if (!/Android|iPhone|iPad/i.test(navigator.userAgent || '') && typeof Notification === 'function') {
        try {
          const nativeNotif = new Notification(title, notifOptions);
          nativeNotif.onclick = () => {
            window.focus();
            nativeNotif.close();
          };
        } catch (_) {}
      }
    } catch (e) {
      console.warn("Direct OS Notification error:", e);
    }
  }, []);

  // Request browser/OS system notification permission
  const requestSystemNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      setSystemNotificationPermission(Notification.permission);
      return Notification.permission;
    }
    try {
      const permission = await Notification.requestPermission();
      setSystemNotificationPermission(permission);
      return permission;
    } catch (_err) {
      return 'denied';
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback((notif) => {
    const newEntry = {
      id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: notif.title || 'Foody Vrinda Update',
      message: notif.message || '',
      type: notif.type || 'order',
      orderId: notif.orderId || null,
      statusTag: notif.statusTag || null,
      read: notif.read || false,
      createdAt: notif.createdAt || new Date().toISOString()
    };

    setNotifications(prev => [newEntry, ...prev.filter(n => n.id !== newEntry.id)]);

    // Trigger role-specific chime ONLY if caller hasn't already played audio (prevents dual audio)
    if (!notif.skipSound) {
      try {
        const role = userRoleRef.current;
        const chimeType = ['kitchen', 'owner', 'delivery', 'customer'].includes(newEntry.type)
          ? newEntry.type
          : (['kitchen', 'owner', 'delivery'].includes(role) ? role : 'customer');
        nativeNotify.playChime(chimeType);
      } catch {
        // ignore
      }
    }

    // Directly push to OS Notification Center / Lock Screen
    sendOSNotification(newEntry.title, {
      body: newEntry.message,
      tag: newEntry.id
    });
  }, [sendOSNotification]);

  const userRef = useRef(user);
  const userRoleRef = useRef(userRole);
  const addNotificationRef = useRef(addNotification);
  const isOrderRelatedToUserRef = useRef(isOrderRelatedToUser);
  const ownerSoundAlertsRef = useRef(ownerSoundAlerts);

  useEffect(() => {
    userRef.current = user;
    userRoleRef.current = userRole;
    addNotificationRef.current = addNotification;
    isOrderRelatedToUserRef.current = isOrderRelatedToUser;
    ownerSoundAlertsRef.current = ownerSoundAlerts;
  }, [user, userRole, addNotification, isOrderRelatedToUser, ownerSoundAlerts]);

  // Subscribe to Cloud Notifications targeted specifically to this authenticated user
  useEffect(() => {
    const targetUserId = user?.id || user?.uid;
    if (!targetUserId || user?.isAnonymous) return;

    const unsubSupabase = subscribeCloudNotifications(targetUserId, (newNotif) => {
      if (newNotif && addNotificationRef.current) {
        addNotificationRef.current({
          id: newNotif.id,
          title: newNotif.title || 'Dispatch Update',
          message: newNotif.message,
          type: newNotif.type || 'order',
          orderId: newNotif.order_id || newNotif.orderId,
          read: newNotif.read || false,
          createdAt: newNotif.created_at || new Date().toISOString()
        });
      }
    });

    return () => {
      if (unsubSupabase) unsubSupabase();
    };
  }, [user?.id, user?.uid]);

  // Subscribe to Application-Wide Realtime Broadcast Events (Staff alerts, dev announcements)
  useEffect(() => {
    const handleBroadcastNotification = (e) => {
      const notif = e.detail;
      if (!notif) return;
      if (isTestNotification(notif)) return;

      if (addNotificationRef.current) {
        addNotificationRef.current({
          id: notif.id,
          title: notif.title || 'Foody Vrinda Notice',
          message: notif.message,
          type: notif.type || 'staff_custom',
          orderId: notif.order_id || notif.orderId || null,
          read: notif.read || false,
          createdAt: notif.created_at || notif.createdAt || new Date().toISOString(),
          skipSound: true // Native notification service already triggered audio chime
        });
      }
    };

    window.addEventListener('foody:notification-received', handleBroadcastNotification);
    return () => {
      window.removeEventListener('foody:notification-received', handleBroadcastNotification);
    };
  }, []);

  // Initialize native hardware notifications (Android channels & permissions)
  useEffect(() => {
    nativeNotify.init();
  }, []);

  // Listen to Realtime Order Events & Local in-app Order Events (Single stable subscription)
  useEffect(() => {
    const handleOrderEvent = (orderData, eventType) => {
      if (!orderData || !orderData.id) return;

      // STRICT CHECK: Ensure this order belongs to the user or their authorized role
      if (isOrderRelatedToUserRef.current && !isOrderRelatedToUserRef.current(orderData)) {
        return;
      }

      const activeRole = userRoleRef.current;
      const isOwnerRole = activeRole === 'owner' || activeRole === 'admin' || activeRole === 'grand_admin';
      const itemSummary = getOrderItemSummary(orderData) || 'Satvik Meal';
      const customerName = getOrderCustomerName(orderData);
      const riderName = orderData.rider_name || orderData.riderName || 'Sarathi Rider';
      const shopName = orderData.shopName || orderData.shop_name || 'Kitchen';
      let title = itemSummary;
      let msg = '';
      let statusTag = '';

      if (eventType === 'INSERT' || orderData.status === 'new' || orderData.status === 'pending' || orderData.status === 'placed') {
        const isDeliveryOrder = orderData.fulfillment_type !== 'pickup' && orderData.fulfillmentType !== 'pickup';
        if (activeRole === 'kitchen') {
          title = `New Order: ${customerName}`;
          msg = `${itemSummary} queued for cooking`;
          statusTag = 'New';
          nativeNotify.notifyKitchenNewOrder(orderData);
        } else if (activeRole === 'delivery' && isDeliveryOrder) {
          title = `New Delivery Order: ${customerName}`;
          msg = `${itemSummary} (₹${orderData.total_amount || orderData.totalAmount || 0}) placed for delivery`;
          statusTag = 'New';
          nativeNotify.notifyDriverNewOrder(orderData);
        } else if (isOwnerRole) {
          title = `New Order: ${customerName}`;
          msg = `${itemSummary} (₹${orderData.total_amount || orderData.totalAmount || 0})`;
          statusTag = 'New';
          if (ownerSoundAlertsRef.current) {
            nativeNotify.notifyOwnerNewOrder(orderData);
          }
        } else {
          title = `Confirmed: ${itemSummary}`;
          msg = `Accepted by ${shopName}`;
          statusTag = 'Placed';
          nativeNotify.notifyCustomerOrderUpdate(orderData, 'Confirmed');
        }
      } else if (orderData.status === 'preparing') {
        title = `Cooking: ${itemSummary}`;
        msg = activeRole === 'kitchen' ? `In preparation for ${customerName}` : `Fresh preparation in progress`;
        statusTag = 'Cooking';
        if (activeRole !== 'kitchen' && !isOwnerRole) {
          nativeNotify.notifyCustomerOrderUpdate(orderData, 'Cooking');
        }
      } else if (orderData.status === 'ready_for_pickup' || orderData.status === 'ready' || orderData.status === 'out_of_kitchen') {
        if (activeRole === 'delivery') {
          title = `Pickup Ready: ${itemSummary}`;
          msg = `Ready at ${shopName} for ${customerName}`;
          statusTag = 'Ready';
          nativeNotify.notifyDriverOrderReady(orderData);
        } else {
          title = `Packed & Ready: ${itemSummary}`;
          msg = `Packed & awaiting courier dispatch`;
          statusTag = 'Ready';
          if (!isOwnerRole && activeRole !== 'kitchen') {
            nativeNotify.notifyCustomerOrderUpdate(orderData, 'Ready');
          }
        }
      } else if (orderData.status === 'out_for_delivery') {
        if (activeRole === 'delivery') {
          title = `Delivering: ${itemSummary}`;
          msg = `On the way to ${customerName}`;
          statusTag = 'On Way';
        } else {
          title = `On The Way: ${itemSummary}`;
          msg = `${riderName} is heading to your address`;
          statusTag = 'On Way';
          if (!isOwnerRole && activeRole !== 'kitchen') {
            nativeNotify.notifyCustomerOrderUpdate(orderData, 'On The Way');
          }
        }
      } else if (orderData.status === 'completed') {
        if (activeRole === 'kitchen' || isOwnerRole) {
          title = `Delivered: ${customerName}`;
          msg = `${itemSummary} completed successfully`;
          statusTag = 'Delivered';
        } else {
          title = `Delivered: ${itemSummary}`;
          msg = `Delivered safely at your doorstep`;
          statusTag = 'Delivered';
          nativeNotify.notifyCustomerOrderUpdate(orderData, 'Delivered');
        }
      } else if (orderData.status === 'cancelled') {
        title = `Cancelled: ${itemSummary}`;
        msg = `Order has been cancelled`;
        statusTag = 'Cancelled';
      }

      if (msg && addNotificationRef.current) {
        addNotificationRef.current({
          id: `order-status-${orderData.id}-${orderData.status}`,
          title,
          message: msg,
          type: activeRole || 'customer',
          orderId: orderData.id,
          statusTag,
          read: false,
          createdAt: new Date().toISOString(),
          skipSound: true // Native notification method above already played the role-specific sound
        });
      }
    };

    const unsubOrders = subscribeCloudOrders('all', handleOrderEvent);

    const handleLocalOrderEvent = (e) => {
      const order = e.detail?.order || e.detail;
      const eventType = e.detail?.eventType || 'INSERT';
      if (order && order.id) {
        handleOrderEvent(order, eventType);
      }
    };

    window.addEventListener('foody_order_created', handleLocalOrderEvent);

    return () => {
      if (unsubOrders) unsubOrders();
      window.removeEventListener('foody_order_created', handleLocalOrderEvent);
    };
  }, []);


  const toggleNotificationRead = async (id, isRead) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: isRead } : n));
    try {
      await markCloudNotificationRead(id, isRead);
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notifications.forEach(n => {
      if (!n.read) {
        markCloudNotificationRead(n.id, true).catch(() => {});
      }
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem(STORAGE_KEY, '[]');
    } catch {
      // ignore
    }
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const createNotification = async (data) => {
    try {
      await createCloudNotification(data);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      ownerSoundAlerts,
      toggleOwnerSoundAlerts,
      systemNotificationPermission,
      requestSystemNotificationPermission,
      sendOSNotification,
      addNotification,
      toggleNotificationRead,
      markAllRead,
      clearAllNotifications,
      deleteNotification,
      createNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
