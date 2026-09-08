/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { subscribeCloudNotifications, markCloudNotificationRead, createCloudNotification, subscribeCloudOrders } from '../supabase';

const NotificationContext = createContext(null);
const STORAGE_KEY = 'foody_vrinda_notifications_v3';

const DEFAULT_SEEDS = [
  {
    id: 'seed-notif-1',
    title: 'Order Status Update',
    message: 'Order #W399A is now cooking in Prem Mandir Prasad Kitchen.',
    type: 'order',
    orderId: 'W399A',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 'seed-notif-2',
    title: 'Prasad Kitchen Special',
    message: 'Fresh Govardhan Thali & Peda Prasad prepared with pure A2 Desi Ghee.',
    type: 'promo',
    read: false,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    id: 'seed-notif-3',
    title: 'Welcome to Foody Vrinda',
    message: 'Experience 100% Satvik Divine Bhog delivered warm to your doorstep.',
    type: 'system',
    read: true,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString()
  }
];

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SEEDS;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

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

    if (Notification?.permission === 'granted') {
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

  // Subscribe to Cloud Notifications when authenticated
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const unsubSupabase = subscribeCloudNotifications(user.uid, (newNotif) => {
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

  // Subscribe to global order dispatch status events to generate live notifications
  useEffect(() => {
    const unsubOrders = subscribeCloudOrders('all', (orderData, eventType) => {
      if (orderData && orderData.id) {
        const orderShort = orderData.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase();
        let title = 'Order Update';
        let msg = '';

        if (eventType === 'INSERT' || orderData.status === 'new') {
          title = `Order #${orderShort} Placed`;
          msg = `Received for preparation at ${orderData.shopName || 'Sacred Kitchen'}.`;
        } else if (orderData.status === 'preparing') {
          title = `Cooking Bhog #${orderShort}`;
          msg = `Kitchen has started cooking your pure Satvik dishes in desi ghee.`;
        } else if (orderData.status === 'ready_for_pickup' || orderData.status === 'ready' || orderData.status === 'out_of_kitchen') {
          title = `Order #${orderShort} Ready`;
          msg = `Packed warm and waiting for Sarathi Rider pickup.`;
        } else if (orderData.status === 'out_for_delivery') {
          title = `Sarathi On The Way #${orderShort}`;
          msg = `Rider ${orderData.rider_name || 'Govind'} is heading to your destination.`;
        } else if (orderData.status === 'completed') {
          title = `Order #${orderShort} Delivered!`;
          msg = `Delivered safely. Radhe Radhe! Please enjoy your sacred Prasad.`;
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
      }
    });

    return () => {
      if (unsubOrders) unsubOrders();
    };
  }, [addNotification]);

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
