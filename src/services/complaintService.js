import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const LOCAL_STORAGE_COMPLAINTS_KEY = 'campusfind_complaints_cache';

const INITIAL_DEMO_COMPLAINTS = [
  {
    id: 'comp-101',
    itemId: 'demo-item-1',
    itemTitle: 'Vignan University Student ID Card',
    reporterUid: 'student-demo-1',
    reporterEmail: 'student.cse@vignan.ac.in',
    reporterDisplayName: 'Ravi Kumar',
    type: 'incorrect_info',
    description: 'The location mentioned says Library 2nd floor, but this card was actually kept at the A-Block security desk.',
    status: 'pending', // 'pending' | 'in_progress' | 'resolved' | 'dismissed'
    assignedTo: null,
    assignedToName: null,
    resolutionNote: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: 'comp-102',
    itemId: 'demo-item-3',
    itemTitle: 'Stainless Steel Water Bottle',
    reporterUid: 'student-demo-2',
    reporterEmail: 'ananya.s@vignan.ac.in',
    reporterDisplayName: 'Ananya Sharma',
    type: 'duplicate_item',
    description: 'This appears to be a duplicate report of the blue Milton bottle reported yesterday in U-Block.',
    status: 'in_progress',
    assignedTo: 'staff-1',
    assignedToName: 'Campus Security Desk',
    resolutionNote: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: 'comp-103',
    itemId: 'demo-item-2',
    itemTitle: 'Engineering Mathematics Textbook',
    reporterUid: 'student-demo-3',
    reporterEmail: 'pavan.k@vignan.ac.in',
    reporterDisplayName: 'Pavan Kalyan',
    type: 'fake_claim',
    description: 'Another student claimed this textbook, but I have verified it is mine with my roll number on page 15.',
    status: 'resolved',
    assignedTo: 'staff-2',
    assignedToName: 'Library Staff',
    resolutionNote: 'Verified original roll number on page 15. Ownership confirmed and returned to genuine student.',
    resolvedBy: 'Library Authority',
    resolvedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  }
];

function getLocalComplaints() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_COMPLAINTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  localStorage.setItem(LOCAL_STORAGE_COMPLAINTS_KEY, JSON.stringify(INITIAL_DEMO_COMPLAINTS));
  return [...INITIAL_DEMO_COMPLAINTS];
}

function saveLocalComplaints(complaints) {
  try {
    localStorage.setItem(LOCAL_STORAGE_COMPLAINTS_KEY, JSON.stringify(complaints));
  } catch (err) {
    console.warn('Could not cache complaints locally:', err);
  }
}

export const complaintService = {
  /**
   * Submit a new complaint / report regarding an item or dispute
   */
  async createComplaint({
    itemId = null,
    itemTitle = 'General Campus Inquiry',
    type = 'incorrect_info',
    description,
    reporterUid,
    reporterEmail = null,
    reporterDisplayName = 'Campus Student'
  }) {
    if (!description || !description.trim()) {
      throw new Error('Please provide a detailed description of the issue or dispute.');
    }

    const complaintData = {
      itemId,
      itemTitle: itemTitle || 'General Campus Inquiry',
      type, // 'incorrect_info' | 'duplicate_item' | 'fake_claim' | 'already_returned' | 'inappropriate' | 'other'
      description: description.trim(),
      reporterUid: reporterUid || 'anonymous',
      reporterEmail: reporterEmail || null,
      reporterDisplayName: reporterDisplayName || 'Campus Student',
      status: 'pending',
      assignedTo: null,
      assignedToName: null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'complaints'), {
          ...complaintData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...complaintData };
      } catch (err) {
        console.warn('Firestore createComplaint failed, using local fallback:', err);
      }
    }

    const localComplaint = { id: `comp-${Date.now()}`, ...complaintData };
    const current = getLocalComplaints();
    saveLocalComplaints([localComplaint, ...current]);
    return localComplaint;
  },

  /**
   * Fetch all complaints across the platform
   */
  async getAllComplaints() {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Merge with initial demo complaints if empty or missing demo IDs
          const demoIds = new Set(docs.map((d) => d.id));
          const missingDemo = INITIAL_DEMO_COMPLAINTS.filter((d) => !demoIds.has(d.id));
          return [...docs, ...missingDemo];
        }
      } catch (err) {
        console.warn('Firestore getAllComplaints failed, falling back to local dataset:', err);
      }
    }
    return getLocalComplaints();
  },

  /**
   * Update complaint status, assign staff, or provide resolution note
   */
  async updateComplaintStatus(complaintId, updates) {
    const { status, resolutionNote, resolvedBy, assignedTo, assignedToName } = updates;

    const payload = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (resolutionNote !== undefined) payload.resolutionNote = resolutionNote;
    if (resolvedBy !== undefined) payload.resolvedBy = resolvedBy;
    if (status === 'resolved' || status === 'dismissed') {
      payload.resolvedAt = new Date().toISOString();
    }
    if (assignedTo !== undefined) payload.assignedTo = assignedTo;
    if (assignedToName !== undefined) payload.assignedToName = assignedToName;

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'complaints', complaintId);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
          ...(payload.resolvedAt ? { resolvedAt: serverTimestamp() } : {})
        });
      } catch (err) {
        console.warn('Firestore updateComplaintStatus error, falling back locally:', err);
      }
    }

    const current = getLocalComplaints();
    const updated = current.map((c) => (c.id === complaintId ? { ...c, ...payload } : c));
    saveLocalComplaints(updated);
    return true;
  },

  /**
   * Assign a complaint to an authority / staff member
   */
  async assignComplaint(complaintId, authorityUid, authorityName) {
    return this.updateComplaintStatus(complaintId, {
      status: 'in_progress',
      assignedTo: authorityUid,
      assignedToName: authorityName
    });
  },

  /**
   * Delete a complaint (Admin only)
   */
  async deleteComplaint(complaintId) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'complaints', complaintId);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Firestore deleteComplaint error:', err);
      }
    }

    const current = getLocalComplaints();
    saveLocalComplaints(current.filter((c) => c.id !== complaintId));
    return true;
  }
};

export default complaintService;
