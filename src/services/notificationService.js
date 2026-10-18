import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const LOCAL_NOTIFICATIONS_KEY = 'campusfind_notifications';

function getLocalNotifications() {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(list) {
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export const notificationService = {
  /**
   * Fetches notifications for a given user.
   */
  async getUserNotifications(userUid) {
    if (!userUid) return [];

    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', userUid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Firestore notifications failed, using local cache:', err);
      }
    }

    const localList = getLocalNotifications();
    return localList
      .filter((n) => n.userId === userUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Creates a notification for a user.
   */
  async createNotification({ userId, title, message, type = 'info', link = null, metadata = {} }) {
    if (!userId) return null;

    const notif = {
      userId,
      title,
      message,
      type, // 'match' | 'claim' | 'claim_update' | 'returned' | 'info'
      link,
      read: false,
      metadata,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'notifications'), {
          ...notif,
          createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...notif };
      } catch (err) {
        console.warn('Firestore createNotification failed, caching locally:', err);
      }
    }

    const localList = getLocalNotifications();
    const localNotif = { id: `notif-${Date.now()}`, ...notif };
    saveLocalNotifications([localNotif, ...localList]);
    return localNotif;
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId) {
    if (!notificationId) return;

    if (isFirebaseConfigured && db && !notificationId.startsWith('notif-')) {
      try {
        const ref = doc(db, 'notifications', notificationId);
        await updateDoc(ref, { read: true, updatedAt: serverTimestamp() });
      } catch (err) {
        console.warn('Failed to mark notification read in Firestore:', err);
      }
    }

    const localList = getLocalNotifications();
    const updated = localList.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveLocalNotifications(updated);
  },

  /**
   * Marks all notifications for a user as read.
   */
  async markAllAsRead(userUid) {
    if (!userUid) return;

    const userNotifs = await this.getUserNotifications(userUid);
    for (const n of userNotifs) {
      if (!n.read) {
        await this.markAsRead(n.id);
      }
    }
  }
};
export default notificationService;