import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const LOCAL_STORAGE_REQUESTS_KEY = 'campusfind_recovery_requests';

function getLocalRequests() {
  const cached = localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Fallback
    }
  }
  return [];
}

function saveLocalRequests(requests) {
  localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(requests));
}

export const recoveryService = {
  /**
   * Submit a recovery claim / message
   */
  async submitRequest({ itemId, itemTitle, ownerUid, requesterUid, requesterDisplayName, message, verificationAnswer = null }) {
    const newRequest = {
      itemId,
      itemTitle,
      ownerUid,
      requesterUid,
      requesterDisplayName: requesterDisplayName || 'Campus Student',
      message: message.trim(),
      verificationAnswer: verificationAnswer ? verificationAnswer.trim() : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'recoveryRequests'), {
        ...newRequest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...newRequest };
    } else {
      const localReq = { id: `req-${Date.now()}`, ...newRequest };
      const current = getLocalRequests();
      saveLocalRequests([localReq, ...current]);
      return localReq;
    }
  },

  /**
   * Get requests where current user is the owner (incoming) or requester (outgoing)
   */
  async getUserRequests(userUid) {
    if (!userUid) return [];

    if (isFirebaseConfigured && db) {
      try {
        const incomingQuery = query(collection(db, 'recoveryRequests'), where('ownerUid', '==', userUid));
        const outgoingQuery = query(collection(db, 'recoveryRequests'), where('requesterUid', '==', userUid));

        const [incomingSnap, outgoingSnap] = await Promise.all([
          getDocs(incomingQuery),
          getDocs(outgoingQuery)
        ]);

        const incoming = incomingSnap.docs.map(d => ({ id: d.id, isIncoming: true, ...d.data() }));
        const outgoing = outgoingSnap.docs.map(d => ({ id: d.id, isIncoming: false, ...d.data() }));

        return [...incoming, ...outgoing];
      } catch (err) {
        console.warn('Firestore recovery requests failed, falling back to local storage:', err);
      }
    }

    const current = getLocalRequests();
    return current.filter(r => r.ownerUid === userUid || r.requesterUid === userUid);
  },

  /**
   * Get requests specifically for a given item
   */
  async getItemRequests(itemId) {
    if (!itemId) return [];

    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'recoveryRequests'), where('itemId', '==', itemId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Firestore getItemRequests failed, falling back to local storage:', err);
      }
    }

    const current = getLocalRequests();
    return current.filter(r => r.itemId === itemId);
  },

  /**
   * Admin: Get all recovery requests across the platform
   */
  async getAllRequests() {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'recoveryRequests'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Firestore getAllRequests failed, falling back to local storage:', err);
      }
    }
    return getLocalRequests();
  },

  /**
   * Owner accepts or declines claim
   */
  async updateRequestStatus(requestId, status) {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'recoveryRequests', requestId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
    }

    const current = getLocalRequests();
    const updated = current.map(r => r.id === requestId ? { ...r, status, updatedAt: new Date().toISOString() } : r);
    saveLocalRequests(updated);
    return true;
  }
};
