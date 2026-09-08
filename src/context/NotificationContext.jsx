/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

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

    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort locally by creation time (descending)
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
      });

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);

      // System push notifications for new unread notifications
      if (notifs.length > 0) {
        const latest = notifs[0];
        const now = Date.now();
        const latestTime = latest.createdAt?.toMillis ? latest.createdAt.toMillis() : now;
        if (now - latestTime < 10000 && !latest.read) {
          if (Notification.permission === 'granted') {
            new Notification('Foody Vrinda', {
              body: latest.message,
              icon: 'https://imbajrangi.github.io/Company/Vrindopnishad%20Web/class/logo/foodyVrinda-logo.png',
              tag: latest.id
            });
          }
        }
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        // Safe fallback when auth isn't populated yet
      } else {
        console.warn("Notifications subscription warning:", error.message);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const toggleNotificationRead = async (id, isRead) => {
    // Optimistic state update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: isRead } : n));
    try {
      await updateDoc(doc(db, "notifications", id), { read: isRead });
    } catch (error) {
      console.error("Error marking notification: ", error);
      // Revert optimistic state update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !isRead } : n));
    }
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all as read: ", error);
    }
  };

  const clearAllNotifications = async () => {
    const read = notifications.filter(n => n.read);
    if (read.length === 0) return;

    const batch = writeBatch(db);
    read.forEach(n => {
      batch.delete(doc(db, "notifications", n.id));
    });

    // Optimistic update
    setNotifications(prev => prev.filter(n => !n.read));

    try {
      await batch.commit();
    } catch (error) {
      console.error("Failed to clear notifications: ", error);
    }
  };

  const createNotification = async (data) => {
    try {
      if (data.userId || data.role) {
        await addDoc(collection(db, "notifications"), {
          ...data,
          createdAt: serverTimestamp(),
          read: false
        });
      }
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
