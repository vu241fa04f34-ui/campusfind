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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase';
import { INITIAL_DEMO_ITEMS } from '../utils/demoData';
import { CAMPUS_LOCATIONS, isBlockLocation } from '../utils/validation';
import { CATEGORY_DEFAULT_IMAGES, getItemImageUrl } from '../utils/itemImageHelper';

export { CATEGORY_DEFAULT_IMAGES, getItemImageUrl };

const LOCAL_STORAGE_ITEMS_KEY = 'campusfind_items_cache';

// Initialize local storage demo items if not already present
function getLocalItems() {
  const cached = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Strip any Stationery item and synchronize demo records with INITIAL_DEMO_ITEMS
      const customReports = parsed
        .filter(
          (i) => !i.isDemo && !i.isSample && !i.id?.startsWith('demo-') && i.category !== 'Stationery'
        )
        .map((i) => ({ ...i, imageUrl: getItemImageUrl(i) }));
      const combined = [...customReports, ...INITIAL_DEMO_ITEMS];
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(combined));
      return combined;
    } catch {
      // Fallback
    }
  }
  localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(INITIAL_DEMO_ITEMS));
  return [...INITIAL_DEMO_ITEMS];
}

function saveLocalItems(items) {
  // Never save Stationery items
  const clean = items.filter((i) => i.category !== 'Stationery');
  localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(clean));
}

export const itemService = {
  /**
   * Fetches all items with optional filters.
   * Guarantees sample items for all categories are displayed and never hangs on Firestore.
   */
  async getItems(filters = {}) {
    let items = [];

    if (isFirebaseConfigured && db) {
      try {
        const fetchPromise = (async () => {
          const q = collection(db, 'items');
          const constraints = [];
          constraints.push(orderBy('createdAt', filters.sort === 'oldest' ? 'asc' : 'desc'));
          const querySnapshot = await getDocs(query(q, ...constraints));
          return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        })();

        // 5-second timeout safety net to prevent hanging on Firestore network delay
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore fetch timeout')), 5000)
        );

        const firestoreDocs = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Filter out any Stationery items and any demo items from Firestore docs
        const realDocs = firestoreDocs.filter(
          (doc) => doc.category !== 'Stationery' && !doc.isDemo && !doc.isSample && !doc.id?.startsWith('demo-')
        );

        // Merge real student reports with INITIAL_DEMO_ITEMS so all categories have sample representation
        items = [...realDocs, ...INITIAL_DEMO_ITEMS];
      } catch (err) {
        console.warn('Firestore fetch failed or timed out, falling back to local dataset:', err);
        items = getLocalItems();
      }
    } else {
      items = getLocalItems();
    }

    // Always ensure Stationery is excluded
    items = items.filter((i) => i.category !== 'Stationery');

    // Type filter
    if (filters.type && filters.type !== 'all') {
      items = items.filter((item) => item.type === filters.type);
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      items = items.filter((item) => item.category === filters.category);
    }

    // Location filter
    if (filters.location && filters.location !== 'all') {
      if (filters.location === 'Other') {
        const standardLocs = CAMPUS_LOCATIONS.filter((l) => l !== 'Other');
        items = items.filter((item) => !standardLocs.includes(item.location));
      } else {
        items = items.filter((item) => item.location === filters.location);
      }
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.location && item.location.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    // Sort items
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.eventDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.eventDate || 0).getTime();
      return filters.sort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return items;
  },

  getLocalFilteredItems(filters = {}) {
    let items = getLocalItems().filter((i) => i.category !== 'Stationery');

    if (filters.type && filters.type !== 'all') {
      items = items.filter((item) => item.type === filters.type);
    }

    if (filters.category && filters.category !== 'all') {
      items = items.filter((item) => item.category === filters.category);
    }

    if (filters.location && filters.location !== 'all') {
      if (filters.location === 'Other') {
        const standardLocs = CAMPUS_LOCATIONS.filter((l) => l !== 'Other');
        items = items.filter((item) => !standardLocs.includes(item.location));
      } else {
        items = items.filter((item) => item.location === filters.location);
      }
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.location && item.location.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }

    // Sort
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.eventDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.eventDate || 0).getTime();
      return filters.sort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return items;
  },

  /**
   * Get single item by ID
   */
  async getItemById(id) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'items', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.category !== 'Stationery') {
            const result = { id: docSnap.id, ...data };
            return { ...result, imageUrl: getItemImageUrl(result) };
          }
        }
      } catch (err) {
        console.warn('Firestore getItemById failed, searching local demo store:', err);
      }
    }

    const items = getLocalItems();
    const found =
      items.find((item) => item.id === id && item.category !== 'Stationery') ||
      INITIAL_DEMO_ITEMS.find((item) => item.id === id) ||
      null;

    return found ? { ...found, imageUrl: getItemImageUrl(found) } : null;
  },

  /**
   * Upload image to Firebase Storage (or dataURL in demo mode)
   */
  async uploadImage(file, userUid) {
    if (!file) return null;

    if (isFirebaseConfigured && storage && userUid) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const storageRef = ref(storage, `items/${userUid}/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      return await getDownloadURL(uploadResult.ref);
    } else {
      // Demo mode: convert to base64 DataURL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
  },

  /**
   * Creates a new lost/found item
   */
  async createItem(itemData, imageFile, currentUser) {
    let imageUrl = itemData.imageUrl || null;

    if (imageFile) {
      imageUrl = await this.uploadImage(imageFile, currentUser?.uid || 'guest');
    }

    if (!imageUrl) {
      imageUrl = CATEGORY_DEFAULT_IMAGES[itemData.category] || CATEGORY_DEFAULT_IMAGES.Other;
    }

    const isBlock = isBlockLocation(itemData.location);
    const newItem = {
      title: itemData.title.trim(),
      normalizedTitle: itemData.title.trim().toLowerCase(),
      type: itemData.type,
      category: itemData.category,
      description: itemData.description.trim(),
      location: itemData.location.trim(),
      floor: isBlock ? (itemData.floor?.trim() || null) : null,
      roomNumber: isBlock ? (itemData.roomNumber?.trim() || null) : null,
      features: itemData.features?.trim() || null,
      privateVerificationClue: itemData.privateVerificationClue?.trim() || null,
      rewardNote: itemData.rewardNote?.trim() || null,
      locationDescription: itemData.locationDescription?.trim() || null,
      eventDate: itemData.eventDate,
      imageUrl,
      ownerUid: currentUser?.uid || 'guest',
      ownerDisplayName: currentUser?.displayName || 'Anonymous Student',
      status: 'open',
      isDemo: !isFirebaseConfigured,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'items'), {
        ...newItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...newItem };
    } else {
      const localItem = { id: `local-${Date.now()}`, ...newItem };
      const currentItems = getLocalItems();
      saveLocalItems([localItem, ...currentItems]);
      return localItem;
    }
  },

  /**
   * Updates an existing item
   */
  async updateItem(id, updates, _currentUser) {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'items', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }

    // Always update local cache
    const currentItems = getLocalItems();
    const updated = currentItems.map(item => {
      if (item.id === id) {
        return { ...item, ...updates, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    saveLocalItems(updated);
    return true;
  },

  /**
   * Deletes an item
   */
  async deleteItem(id) {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'items', id);
      await deleteDoc(docRef);
    }

    const currentItems = getLocalItems();
    saveLocalItems(currentItems.filter(item => item.id !== id));
    return true;
  },

  /**
   * Updates item status (open, pending, claimed, returned, resolved)
   * Supports metadata such as returnNotes, returnDate, resolvedBy
   */
  async setStatus(id, newStatus, metadata = {}) {
    return this.updateItem(id, {
      status: newStatus,
      ...metadata,
      statusUpdatedAt: new Date().toISOString()
    });
  }
};
