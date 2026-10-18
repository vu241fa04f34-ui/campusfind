import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const LOCAL_MESSAGES_KEY = 'campusfind_conversations';

function getLocalMessages(conversationId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY}_${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(conversationId, list) {
  try {
    localStorage.setItem(`${LOCAL_MESSAGES_KEY}_${conversationId}`, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export const conversationService = {
  /**
   * Fetches messages for a given conversation.
   */
  async getMessages(conversationId) {
    if (!conversationId) return [];

    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'conversations', conversationId, 'messages'),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Firestore conversation fetch error, falling back to local store:', err);
      }
    }

    return getLocalMessages(conversationId);
  },

  /**
   * Sends a message inside a conversation.
   */
  async sendMessage({ conversationId, senderUid, senderDisplayName, text, participants = [] }) {
    if (!conversationId || !senderUid || !text?.trim()) return null;

    const trimmedText = text.trim().slice(0, 1000);
    const newMsg = {
      senderUid,
      senderDisplayName: senderDisplayName || 'Campus Student',
      text: trimmedText,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        // Ensure conversation document exists
        const convRef = doc(db, 'conversations', conversationId);
        await setDoc(convRef, {
          participants,
          updatedAt: serverTimestamp()
        }, { merge: true });

        const msgRef = await addDoc(
          collection(db, 'conversations', conversationId, 'messages'),
          {
            ...newMsg,
            createdAt: serverTimestamp()
          }
        );
        return { id: msgRef.id, ...newMsg };
      } catch (err) {
        console.warn('Firestore sendMessage failed, storing locally:', err);
      }
    }

    const localList = getLocalMessages(conversationId);
    const localMsg = { id: `msg-${Date.now()}`, ...newMsg };
    saveLocalMessages(conversationId, [...localList, localMsg]);
    return localMsg;
  }
};
export default conversationService;