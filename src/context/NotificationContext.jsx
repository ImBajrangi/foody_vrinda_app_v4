/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subscribeCloudNotifications, markCloudNotificationRead, createCloudNotification } from '../supabase';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUserId, setPrevUserId] = useState(user?.uid || null);

  if ((user?.uid || null) !== prevUserId) {
    setPrevUserId(user?.uid || null);
    if (!user || user.isAnonymous) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  useEffect(() => {
    if (!user || user.isAnonymous) {
      return;
    }

    // Supabase Realtime Notification Channel
    const unsubSupabase = subscribeCloudNotifications(user.uid, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
      setUnreadCount(prev => prev + 1);

      if (Notification.permission === 'granted') {
        new Notification('Foody Vrinda', {
          body: newNotif.message,
          icon: 'https://imbajrangi.github.io/Company/Vrindopnishad%20Web/class/logo/foodyVrinda-logo.png',
          tag: newNotif.id
        });
      }
    });

    return () => {
      if (unsubSupabase) unsubSupabase();
    };
  }, [user]);

  const toggleNotificationRead = async (id, isRead) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: isRead } : n));
    setUnreadCount(prev => Math.max(0, isRead ? prev - 1 : prev + 1));
    await markCloudNotificationRead(id, isRead);
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    notifications.forEach(n => {
      if (!n.read) markCloudNotificationRead(n.id, true);
    });
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
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
      toggleNotificationRead,
      markAllRead,
      clearAllNotifications,
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
