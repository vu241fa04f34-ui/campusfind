import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// List of required environment variables for Firebase
const REQUIRED_CONFIG_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Read environment variables loaded from .env.local
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates which required Firebase environment variables are missing or placeholders.
 * @returns {string[]} List of missing variable names
 */
export const getMissingFirebaseEnvVars = () => {
  return REQUIRED_CONFIG_KEYS.filter((key) => {
    const value = import.meta.env[key];
    return !value || typeof value !== 'string' || value.trim() === '' || value.includes('your_');
  });
};

const missingVars = getMissingFirebaseEnvVars();
export const isFirebaseConfigured = missingVars.length === 0;

let app = null;
let auth = null;
let db = null;
let storage = null;
let googleProvider = null;
let githubProvider = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Initialize Google Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    // Initialize GitHub Provider (Optional)
    githubProvider = new GithubAuthProvider();

    console.info(`[Firebase] Successfully connected to project: ${firebaseConfig.projectId}`);
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
  }
} else {
  console.warn(
    `[Firebase] Missing or incomplete configuration: ${missingVars.join(', ')}. ` +
    'Please verify your Firebase keys in .env.local.'
  );
}

export { app, auth, db, storage, googleProvider, githubProvider, firebaseConfig };
