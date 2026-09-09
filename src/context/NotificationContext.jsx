/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeCloudNotifications, 
  markCloudNotificationRead, 
  createCloudNotification, 
  subscribeCloudOrders 
} from '../supabase';

const NotificationContext = createContext(null);
const STORAGE_KEY = 'foody_vrinda_notifications_v3';

// Clean, welcoming initial notification seeds (NO fake order IDs)
const DEFAULT_SEEDS = [
  {
    id: 'welcome-vrinda-blessing',
    title: 'Welcome to Foody Vrinda',
    message: 'Experience 100% Satvik Divine Bhog & Prasad prepared in pure A2 Desi Ghee.',
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
  
  // Initial state with cleanup of any legacy mock order seeds
  const [notifications, setNotifications] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy mock seed order W399A
          const sanitized = parsed.filter(n => n.id !== 'seed-notif-1' && n.orderId !== 'W399A');
          if (sanitized.length > 0) return sanitized;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SEEDS;
  });

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
   * Prevents customer A from seeing order alerts for customer B.
   */
  const isOrderRelatedToUser = useCallback((orderData) => {
    if (!orderData || !orderData.id) return false;

    const currentUserId = user?.id || user?.uid || userData?.id;
    const userCleanPhone = (user?.phone || user?.phoneNumber || userData?.phone || '').replace(/\D/g, '');
    const userEmail = (user?.email || userData?.email || '').toLowerCase().trim();

    const orderUserId = orderData.user_id || orderData.userId || orderData.customer_id || orderData.uid;
    const orderPhone = (orderData.customer_phone || orderData.customerPhone || '').replace(/\D/g, '');
    const orderEmail = (orderData.customer_email || orderData.customerEmail || '').toLowerCase().trim();
    const orderRiderId = orderData.rider_id || orderData.riderId;
    const orderRiderPhone = (orderData.rider_phone || orderData.riderPhone || '').replace(/\D/g, '');
    const orderShopId = orderData.shop_id || orderData.shopId;

    // 1. Customer Verification: Match against placed customer ID, Phone, or Email
    const isOwnerCustomer = Boolean(
      (currentUserId && orderUserId && String(currentUserId) === String(orderUserId)) ||
      (userCleanPhone && userCleanPhone.length >= 10 && orderPhone && orderPhone.length >= 10 && userCleanPhone.slice(-10) === orderPhone.slice(-10)) ||
      (userEmail && orderEmail && userEmail === orderEmail)
    );

    if (isOwnerCustomer) return true;

    // Also check local cache of customer's active / historical orders (for guest checkout before sign-in)
    try {
      const cachedOrders = localStorage.getItem('foody_customer_orders_cache');
      if (cachedOrders) {
        const parsed = JSON.parse(cachedOrders);
        if (Array.isArray(parsed) && parsed.some(o => o.id === orderData.id)) {
          return true;
        }
      }
    } catch {
      // ignore
    }

    // 2. Kitchen Staff Role: Orders belonging to their active kitchen / assigned shop
    if (userRole === 'kitchen') {
      if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
        return true;
      }
      if (Array.isArray(currentUserShopIds) && currentUserShopIds.includes(orderShopId)) {
        return true;
      }
      return false;
    }

    // 3. Delivery Rider Role: Assigned directly to rider OR ready for pickup in their operating hub
    if (userRole === 'delivery') {
      const isAssignedRider = Boolean(
        (currentUserId && orderRiderId && String(currentUserId) === String(orderRiderId)) ||
        (userCleanPhone && userCleanPhone.length >= 10 && orderRiderPhone && userCleanPhone.slice(-10) === orderRiderPhone.slice(-10))
      );
      if (isAssignedRider) return true;

      // Delivery rider can see pickup alerts for their active hub
      if (orderData.status === 'ready_for_pickup' || orderData.status === 'ready' || orderData.status === 'out_of_kitchen') {
        if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
          return true;
        }
      }
      return false;
    }

    // 4. Store Owner / Admin: Store management for their registered shop(s)
    if (userRole === 'owner' || isAuthorizedAdmin) {
      if (!currentUserShopId || currentUserShopId === 'all' || orderShopId === currentUserShopId) {
        return true;
      }
      if (Array.isArray(currentUserShopIds) && currentUserShopIds.includes(orderShopId)) {
        return true;
      }
      return false;
    }

    // 5. Developer Master Console: Full telemetry overview
    if (userRole === 'developer' || isAuthorizedDeveloper) {
      return true;
    }

    // Regular customer / guest viewing app: Never show strangers' orders
    return false;
  }, [user, userData, userRole, currentUserShopId, currentUserShopIds, isAuthorizedAdmin, isAuthorizedDeveloper]);

  // Add a new notification
  const addNotification = useCallback((notif) => {
    const newEntry = {
      id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: notif.title || 'Foody Vrinda Update',
      message: notif.message || '',
      type: notif.type || 'order',
      orderId: notif.orderId || null,
      read: notif.read || false,
      createdAt: notif.createdAt || new Date().toISOString()
    };

    setNotifications(prev => [newEntry, ...prev.filter(n => n.id !== newEntry.id)]);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newEntry.title, {
          body: newEntry.message,
          icon: 'https://imbajrangi.github.io/Company/Vrindopnishad%20Web/class/logo/foodyVrinda-logo.png',
          tag: newEntry.id
        });
      } catch {
        // ignore
      }
    }
  }, []);

  // Subscribe to Cloud Notifications targeted specifically to this authenticated user
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const targetUserId = user.id || user.uid;
    if (!targetUserId) return;

    const unsubSupabase = subscribeCloudNotifications(targetUserId, (newNotif) => {
      if (newNotif) {
        addNotification({
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
  }, [user, addNotification]);

  // Listen to Realtime Order Events, but STRICTLY notify only the user/staff involved with that order
  useEffect(() => {
    const unsubOrders = subscribeCloudOrders('all', (orderData, eventType) => {
      if (!orderData || !orderData.id) return;

      // STRICT CHECK: Ensure this order belongs to the user or their authorized role
      if (!isOrderRelatedToUser(orderData)) {
        return;
      }

      const orderShort = orderData.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase();
      let title = 'Order Update';
      let msg = '';

      if (eventType === 'INSERT' || orderData.status === 'new') {
        if (userRole === 'kitchen') {
          title = `New Order #${orderShort}`;
          msg = `New order received in kitchen. Tap to start prep.`;
        } else {
          title = `Order #${orderShort} Placed`;
          msg = `Received for preparation at ${orderData.shopName || 'Sacred Kitchen'}.`;
        }
      } else if (orderData.status === 'preparing') {
        title = `Cooking Bhog #${orderShort}`;
        msg = `Kitchen has started cooking your pure Satvik dishes in desi ghee.`;
      } else if (orderData.status === 'ready_for_pickup' || orderData.status === 'ready' || orderData.status === 'out_of_kitchen') {
        if (userRole === 'delivery') {
          title = `Order #${orderShort} Ready for Pickup`;
          msg = `Order is packed and ready for rider dispatch.`;
        } else {
          title = `Order #${orderShort} Ready`;
          msg = `Packed warm and waiting for Sarathi Rider pickup.`;
        }
      } else if (orderData.status === 'out_for_delivery') {
        title = `Sarathi On The Way #${orderShort}`;
        msg = `Rider ${orderData.rider_name || 'Govind'} is heading to your destination.`;
      } else if (orderData.status === 'completed') {
        title = `Order #${orderShort} Delivered!`;
        msg = `Delivered safely. Radhe Radhe! Please enjoy your sacred Prasad.`;
      } else if (orderData.status === 'cancelled') {
        title = `Order #${orderShort} Cancelled`;
        msg = `Order has been cancelled. Please reach out to support if needed.`;
      }

      if (msg) {
        addNotification({
          id: `order-status-${orderData.id}-${orderData.status}`,
          title,
          message: msg,
          type: 'order',
          orderId: orderData.id,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    return () => {
      if (unsubOrders) unsubOrders();
    };
  }, [isOrderRelatedToUser, addNotification, userRole]);

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
      localStorage.removeItem(STORAGE_KEY);
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
