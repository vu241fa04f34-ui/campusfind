import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const AUDIT_LOGS_KEY = 'campusfind_audit_logs_cache';

const INITIAL_DEMO_LOGS = [
  {
    id: 'log-1',
    actorUid: 'admin-seed-uid',
    actorEmail: 'admin@vignan.ac.in',
    actorRole: 'admin',
    action: 'STATUS_OVERRIDE',
    targetType: 'item',
    targetId: 'demo-item-1',
    details: 'Status updated from "open" to "returned" after student verification at Main Security Desk.',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: 'log-2',
    actorUid: 'staff-seed-uid',
    actorEmail: 'security.staff@vignan.ac.in',
    actorRole: 'authority',
    action: 'COMPLAINT_RESOLVED',
    targetType: 'complaint',
    targetId: 'comp-103',
    details: 'Resolved ownership dispute for Engineering Mathematics textbook with verified roll number.',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 'log-3',
    actorUid: 'admin-seed-uid',
    actorEmail: 'admin@vignan.ac.in',
    actorRole: 'admin',
    action: 'ROLE_GRANTED',
    targetType: 'user',
    targetId: 'user-staff-1',
    details: 'Granted "authority" role to security.staff@vignan.ac.in for campus zone moderation.',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

function getLocalAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(INITIAL_DEMO_LOGS));
  return [...INITIAL_DEMO_LOGS];
}

function saveLocalAuditLogs(logs) {
  try {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (err) {
    console.warn('Could not cache audit logs locally:', err);
  }
}

export const auditService = {
  /**
   * Log an administrative or authority action
   */
  async logAction({
    actorUid = 'system',
    actorEmail = 'system',
    actorRole = 'admin',
    action,
    targetType = 'item',
    targetId = null,
    details
  }) {
    const entry = {
      actorUid,
      actorEmail,
      actorRole,
      action, // 'STATUS_OVERRIDE' | 'COMPLAINT_RESOLVED' | 'COMPLAINT_ASSIGNED' | 'ROLE_GRANTED' | 'ROLE_REVOKED' | 'ITEM_DELETED'
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'auditLogs'), {
          ...entry,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore audit log failed, saving locally:', err);
      }
    }

    const current = getLocalAuditLogs();
    const updated = [
      { id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, ...entry },
      ...current
    ];
    saveLocalAuditLogs(updated);
    return true;
  },

  /**
   * Retrieve all audit logs (up to 100)
   */
  async getAuditLogs(maxLogs = 60) {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(maxLogs));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp || d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          }));
          return docs;
        }
      } catch (err) {
        console.warn('Firestore getAuditLogs error, falling back locally:', err);
      }
    }
    return getLocalAuditLogs().slice(0, maxLogs);
  },

  /**
   * Retrieve audit logs performed by a specific actor
   */
  async getAuditLogsForActor(actorUid) {
    const all = await this.getAuditLogs(100);
    return all.filter((l) => l.actorUid === actorUid || l.actorEmail?.toLowerCase() === actorUid?.toLowerCase());
  }
};

export default auditService;
