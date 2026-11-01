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
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Fallback
  }
  return [];
}

function saveLocalRequests(requests) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(requests));
  } catch (err) {
    console.warn('Could not cache recovery requests locally:', err);
  }
}

export const recoveryService = {
  /**
   * Submit a recovery claim / message
   */
  async submitRequest({
    itemId,
    itemTitle,
    ownerUid,
    requesterUid,
    requesterDisplayName,
    message,
    verificationAnswer = null
  }) {
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

    if (isFirebaseConfigured && db && requesterUid) {
      try {
        const addPromise = (async () => {
          const docRef = await addDoc(collection(db, 'recoveryRequests'), {
            ...newRequest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          return { id: docRef.id, ...newRequest };
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('recoveryRequest submission timeout')), 4500)
        );

        const created = await Promise.race([addPromise, timeoutPromise]);
        const current = getLocalRequests();
        saveLocalRequests([created, ...current]);
        return created;
      } catch (err) {
        console.warn('Firestore submitRequest failed or timed out, saving locally:', err);
      }
    }

    const localReq = { id: `req-${Date.now()}`, ...newRequest };
    const current = getLocalRequests();
    saveLocalRequests([localReq, ...current]);
    return localReq;
  },

  /**
   * Get requests where current user is the owner (incoming) or requester (outgoing)
   */
  async getUserRequests(userUid) {
    if (!userUid) return [];

    if (isFirebaseConfigured && db) {
      try {
        const fetchPromise = (async () => {
          const incomingQuery = query(
            collection(db, 'recoveryRequests'),
            where('ownerUid', '==', userUid)
          );
          const outgoingQuery = query(
            collection(db, 'recoveryRequests'),
            where('requesterUid', '==', userUid)
          );

          const [incomingSnap, outgoingSnap] = await Promise.all([
            getDocs(incomingQuery).catch(() => ({ docs: [] })),
            getDocs(outgoingQuery).catch(() => ({ docs: [] }))
          ]);

          const incoming = incomingSnap.docs.map((d) => ({ id: d.id, isIncoming: true, ...d.data() }));
          const outgoing = outgoingSnap.docs.map((d) => ({ id: d.id, isIncoming: false, ...d.data() }));

          return [...incoming, ...outgoing];
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getUserRequests timeout')), 4000)
        );

        return await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Firestore recovery requests failed or timed out, falling back to local storage:', err);
      }
    }

    const current = getLocalRequests();
    return current.filter((r) => r.ownerUid === userUid || r.requesterUid === userUid);
  },

  /**
   * Get requests specifically for a given item.
   * Only queries Firestore if an authorized user (owner or staff/admin) is requesting it.
   */
  async getItemRequests(itemId, currentUser = null) {
    if (!itemId) return [];

    // If no authenticated user, return empty to avoid security rule violations
    if (!currentUser) return [];

    if (isFirebaseConfigured && db && currentUser?.uid) {
      try {
        const fetchPromise = (async () => {
          const isAdminOrStaff = currentUser.role === 'admin' || currentUser.role === 'authority';
          let q;

          if (isAdminOrStaff) {
            // Staff and admin can see all requests for the item
            q = query(collection(db, 'recoveryRequests'), where('itemId', '==', itemId));
          } else {
            // Listing owners can view requests for their item
            q = query(
              collection(db, 'recoveryRequests'),
              where('itemId', '==', itemId),
              where('ownerUid', '==', currentUser.uid)
            );
          }

          const snap = await getDocs(q);
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getItemRequests timeout')), 3500)
        );

        return await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Firestore getItemRequests failed or timed out:', err);
      }
    }

    const current = getLocalRequests();
    return current.filter((r) => r.itemId === itemId && (r.ownerUid === currentUser?.uid || r.requesterUid === currentUser?.uid));
  },

  /**
   * Admin: Get all recovery requests across the platform
   */
  async getAllRequests() {
    if (isFirebaseConfigured && db) {
      try {
        const snapPromise = getDocs(collection(db, 'recoveryRequests'));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getAllRequests timeout')), 4000)
        );
        const snap = await Promise.race([snapPromise, timeoutPromise]);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      try {
        const updatePromise = (async () => {
          const docRef = doc(db, 'recoveryRequests', requestId);
          await updateDoc(docRef, {
            status,
            updatedAt: serverTimestamp()
          });
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('updateRequestStatus timeout')), 4000)
        );

        await Promise.race([updatePromise, timeoutPromise]);
      } catch (err) {
        console.warn('Firestore updateRequestStatus failed or timed out:', err);
      }
    }

    const current = getLocalRequests();
    const updated = current.map((r) =>
      r.id === requestId ? { ...r, status, updatedAt: new Date().toISOString() } : r
    );
    saveLocalRequests(updated);
    return true;
  }
};
