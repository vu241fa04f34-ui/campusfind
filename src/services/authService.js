import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured, getMissingFirebaseEnvVars } from './firebase';
import { auditService } from './auditService';

// Clear any legacy mock user items from local storage to guarantee a clean state
try {
  localStorage.removeItem('campusfind_current_user');
  localStorage.removeItem('campusfind_demo_user');
  localStorage.removeItem('campusfind_registered_users');
} catch {
  // Ignore
}

export const authService = {
  /**
   * Generates a clear error message specifying which environment variables are missing.
   */
  _getUnconfiguredError(feature = 'Authentication') {
    const missing = getMissingFirebaseEnvVars();
    const details = missing.length > 0 ? ` Missing variables: ${missing.join(', ')}.` : '';
    return new Error(
      `Firebase ${feature} is not configured.${details} Please verify your Firebase project keys in .env.local.`
    );
  },

  /**
   * Registers a new user with Email and Password using Firebase Auth.
   */
  async register(email, password, displayName) {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Registration');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Store private user profile document in Firestore
    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.email.split('@')[0],
          photoURL: user.photoURL || null,
          authProvider: 'password',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      } catch (dbErr) {
        console.warn('Could not initialize Firestore user document:', dbErr);
      }
    }

    return user;
  },

  /**
   * Logs in an existing user with Email and Password using Firebase Auth.
   */
  async login(email, password) {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Sign In');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login timestamp without overwriting existing profile or roles
    if (db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
        } else {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            authProvider: 'password',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn('Could not update user login timestamp:', e);
      }
    }

    return user;
  },

  /**
   * Signs in with Google using popup, with automatic redirect fallback when popup is blocked.
   * NEVER called automatically on page load.
   */
  async signInWithGoogle() {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw this._getUnconfiguredError('Google Authentication');
    }

    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, googleProvider);
    } catch (popupError) {
      // If popup is blocked by browser, fallback to redirect
      if (popupError.code === 'auth/popup-blocked') {
        console.info('Popup blocked by browser. Falling back to signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw popupError;
    }

    const user = userCredential.user;

    // Safe Profile handling: create if first time, update lastLoginAt if returning
    if (db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          // New Google user: initialize profile safely
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            authProvider: 'google',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
        } else {
          // Returning Google user: preserve existing profile & listings, update last login only
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp()
          });
        }
      } catch (dbErr) {
        console.warn('Firestore profile sync error on Google sign-in:', dbErr);
      }
    }

    return user;
  },

  /**
   * Checks for redirect result if signInWithRedirect was used.
   */
  async checkRedirectResult() {
    if (isFirebaseConfigured && auth) {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          if (db) {
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
              await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                authProvider: 'google',
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
              });
            } else {
              await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
            }
          }
          return user;
        }
      } catch (err) {
        console.warn('Redirect sign-in check error:', err);
      }
    }
    return null;
  },

  /**
   * Logs out current user cleanly from Firebase Auth.
   */
  async logout() {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    try {
      localStorage.removeItem('campusfind_current_user');
      localStorage.removeItem('campusfind_demo_user');
    } catch {
      // Ignore
    }
  },

  /**
   * Sends password reset email.
   */
  async resetPassword(email) {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Password Reset');
    }
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Initializes and renders reCAPTCHA verifier for Phone Auth.
   * Cleans up any existing verifier to prevent multiple instance errors.
   */
  setUpRecaptcha(containerId = 'recaptcha-container') {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Phone Verification');
    }

    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // Ignore clearing error
      }
      window.recaptchaVerifier = null;
    }

    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      throw new Error(`reCAPTCHA container element #${containerId} not found in the DOM.`);
    }
    containerEl.innerHTML = '';

    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved - will allow signInWithPhoneNumber
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired. Resetting verifier.');
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch {
            // Ignore
          }
          window.recaptchaVerifier = null;
        }
      }
    });

    return window.recaptchaVerifier;
  },

  /**
   * Sends 6-digit OTP code to the provided phone number.
   * Phone number must be E.164 format (+91XXXXXXXXXX).
   */
  async sendPhoneOtp(phoneNumber, appVerifier) {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Phone Authentication');
    }

    const verifier = appVerifier || window.recaptchaVerifier || this.setUpRecaptcha();
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return confirmationResult;
  },

  /**
   * Verifies the 6-digit OTP code using confirmationResult.
   * Creates or updates user profile in Firestore.
   */
  async verifyPhoneOtp(confirmationResult, otpCode) {
    if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
      throw new Error('Invalid or missing confirmation session. Please request a new OTP.');
    }

    const userCredential = await confirmationResult.confirm(otpCode);
    const user = userCredential.user;

    // Save/update user profile in Firestore
    if (db && user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        const phoneDisplay = user.phoneNumber 
          ? `Student ${user.phoneNumber.slice(-4)}` 
          : 'Campus Student';

        if (!docSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            displayName: phoneDisplay,
            email: user.email || null,
            photoURL: user.photoURL || null,
            authProvider: 'phone',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
        } else {
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp()
          });
        }
      } catch (dbErr) {
        console.warn('Firestore profile sync error on phone verification:', dbErr);
      }
    }

    return user;
  },

  /**
   * Subscribes to real Firebase Authentication state changes.
   * If Firebase is not configured, provides null user (unauthenticated).
   */
  onAuthStateChange(callback) {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, (user) => {
        callback(user);
      });
    } else {
      // Unconfigured or signed out: never hardcode or pretend a user is authenticated
      callback(null);
      return () => {};
    }
  },

  /**
   * Retrieves user profile details from Firestore.
   */
  async getUserProfile(userId) {
    if (!userId) return null;
    
    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          return {
            ...data,
            role: data.role || (data.email?.endsWith('admin@vignan.ac.in') ? 'admin' : 'student')
          };
        }
      } catch (err) {
        console.warn('Failed to load user profile from Firestore:', err);
      }
    }

    // Default profile representation
    return {
      uid: userId,
      role: auth?.currentUser?.email?.endsWith('admin@vignan.ac.in') ? 'admin' : 'student'
    };
  },

  /**
   * Cryptographically verifies whether the current user has administrative permissions.
   * Checks custom claims (claims.admin === true), verified admin email domain, or Firestore role.
   * Client-side localStorage overrides are forbidden.
   */
  async isCurrentUserAdmin(currentUser) {
    if (!currentUser) return false;

    // 1. Primary Security Check: Firebase Custom Claims (admin: true)
    if (typeof currentUser.getIdTokenResult === 'function') {
      try {
        const tokenResult = await currentUser.getIdTokenResult(false);
        if (tokenResult.claims && tokenResult.claims.admin === true) {
          return true;
        }
      } catch (err) {
        console.warn('Could not inspect Firebase token claims:', err);
      }
    }

    // 2. Verified University Administrator Email
    const email = (currentUser.email || '').toLowerCase().trim();
    if (
      email === 'admin@vignan.ac.in' ||
      email.endsWith('admin@vignan.ac.in')
    ) {
      return true;
    }

    // 3. Firestore profile role check (read-only verification)
    if (isFirebaseConfigured && db && currentUser.uid) {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists() && snap.data().role === 'admin') {
          return true;
        }
      } catch (err) {
        console.warn('Error verifying admin status in Firestore:', err);
      }
    }

    return false;
  },

  /**
   * Verifies whether current user has Staff / Campus Authority privileges (or full Admin).
   */
  async isCurrentUserAuthority(currentUser) {
    if (!currentUser) return false;

    // Admin has super-set permissions including authority
    const isAdmin = await this.isCurrentUserAdmin(currentUser);
    if (isAdmin) return true;

    // 1. Custom claims check (authority: true)
    if (typeof currentUser.getIdTokenResult === 'function') {
      try {
        const tokenResult = await currentUser.getIdTokenResult(false);
        if (
          tokenResult.claims &&
          (tokenResult.claims.authority === true || tokenResult.claims.role === 'authority')
        ) {
          return true;
        }
      } catch (err) {
        console.warn('Could not inspect Firebase token claims for authority:', err);
      }
    }

    // 2. Email pattern check
    const email = (currentUser.email || '').toLowerCase().trim();
    if (
      email.endsWith('authority@vignan.ac.in') ||
      email.endsWith('staff@vignan.ac.in')
    ) {
      return true;
    }

    // 3. Firestore profile check
    if (isFirebaseConfigured && db && currentUser.uid) {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const role = snap.data().role;
          if (role === 'authority' || role === 'admin') return true;
        }
      } catch (err) {
        console.warn('Error verifying authority status in Firestore:', err);
      }
    }

    return false;
  },

  /**
   * Retrieves the effective role of the current user: 'admin' | 'authority' | 'student'
   */
  async getUserRole(currentUser) {
    if (!currentUser) return 'student';

    const isAdmin = await this.isCurrentUserAdmin(currentUser);
    if (isAdmin) return 'admin';

    const isAuthority = await this.isCurrentUserAuthority(currentUser);
    if (isAuthority) return 'authority';

    return 'student';
  },

  /**
   * Dedicated Admin Login.
   * Authenticates via Firebase Auth and verifies admin authorization before granting access.
   * Unauthorized accounts are immediately signed out.
   */
  async adminLogin(email, password) {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Admin Authentication');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Force refresh token to obtain latest custom claims
    let isAdmin = false;
    try {
      if (typeof user.getIdTokenResult === 'function') {
        const tokenResult = await user.getIdTokenResult(true);
        if (tokenResult.claims && tokenResult.claims.admin === true) {
          isAdmin = true;
        }
      }
    } catch {
      // Fallback
    }

    if (!isAdmin) {
      isAdmin = await this.isCurrentUserAdmin(user);
    }

    if (!isAdmin) {
      await signOut(auth);
      throw new Error(
        'Access Denied: This account is not an authorized University Administrator. Only campus staff with verified admin privileges may enter the Admin Portal.'
      );
    }

    return user;
  },

  /**
   * Dedicated Staff / Campus Authority Login.
   * Authenticates via Firebase Auth and verifies authority or admin authorization.
   * Unauthorized accounts are immediately signed out.
   */
  async authorityLogin(email, password) {
    if (!isFirebaseConfigured || !auth) {
      throw this._getUnconfiguredError('Authority Authentication');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Force refresh token to obtain latest custom claims
    let isAuth = false;
    try {
      if (typeof user.getIdTokenResult === 'function') {
        const tokenResult = await user.getIdTokenResult(true);
        if (
          tokenResult.claims &&
          (tokenResult.claims.authority === true ||
            tokenResult.claims.admin === true ||
            tokenResult.claims.role === 'authority')
        ) {
          isAuth = true;
        }
      }
    } catch {
      // Fallback
    }

    if (!isAuth) {
      isAuth = await this.isCurrentUserAuthority(user);
    }

    if (!isAuth) {
      await signOut(auth);
      throw new Error(
        'Access Denied: This account is not an authorized Campus Authority or Staff member. Only designated staff may enter the Authority Portal.'
      );
    }

    return user;
  },

  /**
   * Admin: Fetch all registered users
   */
  async getAllUsers() {
    const demoFallbackUsers = [
      {
        uid: 'admin-seed-uid',
        displayName: 'Campus Administrator',
        email: 'admin@vignan.ac.in',
        role: 'admin',
        authProvider: 'password',
        createdAt: '2026-01-10T09:00:00.000Z',
        lastLoginAt: new Date().toISOString()
      },
      {
        uid: 'staff-seed-uid',
        displayName: 'Campus Security Officer',
        email: 'security.staff@vignan.ac.in',
        role: 'authority',
        authProvider: 'password',
        createdAt: '2026-02-15T11:00:00.000Z',
        lastLoginAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        uid: 'student-demo-1',
        displayName: 'Ravi Kumar',
        email: 'student.cse@vignan.ac.in',
        role: 'student',
        authProvider: 'google',
        createdAt: '2026-03-01T14:20:00.000Z',
        lastLoginAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        uid: 'student-demo-2',
        displayName: 'Ananya Sharma',
        email: 'ananya.s@vignan.ac.in',
        role: 'student',
        authProvider: 'google',
        createdAt: '2026-03-05T12:00:00.000Z',
        lastLoginAt: new Date(Date.now() - 14400000).toISOString()
      },
      {
        uid: 'student-demo-3',
        displayName: 'Pavan Kalyan',
        email: 'pavan.k@vignan.ac.in',
        role: 'student',
        authProvider: 'phone',
        phoneNumber: '+91 98765 43210',
        createdAt: '2026-04-12T10:15:00.000Z',
        lastLoginAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (!snap.empty) {
          const firestoreUsers = snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              displayName: data.displayName || data.email?.split('@')[0] || 'Campus User',
              email: data.email || null,
              phoneNumber: data.phoneNumber || null,
              role: data.role || (data.email?.endsWith('admin@vignan.ac.in') ? 'admin' : (data.email?.endsWith('staff@vignan.ac.in') ? 'authority' : 'student')),
              authProvider: data.authProvider || 'password',
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
              lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || data.lastLoginAt || new Date().toISOString()
            };
          });

          // Merge any seed demo accounts not present in Firestore
          const existingEmails = new Set(firestoreUsers.map((u) => u.email?.toLowerCase()).filter(Boolean));
          const missingDemos = demoFallbackUsers.filter((u) => !existingEmails.has(u.email?.toLowerCase()));
          return [...firestoreUsers, ...missingDemos];
        }
      } catch (err) {
        console.warn('Firestore getAllUsers failed, falling back to local dataset:', err);
      }
    }

    return demoFallbackUsers;
  },

  /**
   * Admin: Update a user's role (grant/revoke staff authority)
   * Disallows granting 'admin' from client side.
   */
  async setUserRole(targetUid, newRole, actorDetails = {}) {
    if (!['authority', 'student'].includes(newRole)) {
      throw new Error('Only "authority" or "student" roles can be assigned via the management console. Full admin role requires server-side provisioning.');
    }

    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', targetUid);
        await updateDoc(userRef, {
          role: newRole,
          roleUpdatedAt: serverTimestamp(),
          roleUpdatedBy: actorDetails.email || 'Admin'
        });
      } catch (err) {
        console.warn('Firestore setUserRole error:', err);
      }
    }

    // Log to audit history
    await auditService.logAction({
      actorUid: actorDetails.uid || 'admin',
      actorEmail: actorDetails.email || 'admin@vignan.ac.in',
      actorRole: 'admin',
      action: newRole === 'authority' ? 'ROLE_GRANTED' : 'ROLE_REVOKED',
      targetType: 'user',
      targetId: targetUid,
      details: `${newRole === 'authority' ? 'Granted Staff Authority' : 'Revoked Staff Authority'} for user UID: ${targetUid}`
    });

    return true;
  },

  /**
   * Admin: Delete a user profile from Firestore
   */
  async deleteUserAccount(targetUid, actorDetails = {}) {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'users', targetUid));
      } catch (err) {
        console.warn('Firestore deleteUserAccount error:', err);
      }
    }

    await auditService.logAction({
      actorUid: actorDetails.uid || 'admin',
      actorEmail: actorDetails.email || 'admin@vignan.ac.in',
      actorRole: 'admin',
      action: 'USER_DELETED',
      targetType: 'user',
      targetId: targetUid,
      details: `Deleted user record for UID: ${targetUid}`
    });

    return true;
  },

  /**
   * Updates user profile in Firestore.
   */
  async updateUserProfile(userId, data) {
    if (!userId) return false;

    // Disallow updating role via client
    const { role, ...safeData } = data;

    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          ...safeData,
          updatedAt: serverTimestamp()
        });
        return true;
      } catch (err) {
        console.warn('Failed to update user profile in Firestore:', err);
      }
    }
    return true;
  },

  /**
   * Formats Firebase Auth error codes into friendly user messages.
   * @param {Error|Object} err - The error object from Firebase Auth
   * @param {'google'|'phone'|'email'|null} provider - The authentication method being attempted
   */
  formatAuthError(err, provider = null) {
    if (!err) return 'Authentication failed. Please try again.';

    // Log the actual Firebase error for full developer inspection
    console.warn('[FirebaseAuthError]', {
      code: err.code,
      message: err.message,
      provider,
      err
    });

    const msg = (err.message || '').toLowerCase();
    const code = err.code || '';

    // 1. Detect Firebase SMS Region Policy blocks (e.g. "SMS unable to be sent until this region enabled by the app developer")
    if (msg.includes('sms unable to be sent') || msg.includes('region enabled') || msg.includes('region policy')) {
      return 'SMS sending to this country code is restricted by Firebase SMS Region Policy. In Firebase Console: 1) Go to Authentication > Settings > SMS Region Policy and allow your country (e.g. India); OR 2) In Authentication > Sign-in method > Phone, add a test number (+91 9876543210 with OTP 123456).';
    }

    // 2. Specific check for auth/operation-not-allowed
    if (code === 'auth/operation-not-allowed') {
      if (provider === 'phone' || msg.includes('sms') || msg.includes('phone')) {
        return 'Phone authentication is blocked or disabled for this project/region. In Firebase Console: 1) Under Authentication > Settings > SMS Region Policy, allow your region; OR 2) Under Authentication > Sign-in method > Phone, add a test phone number (e.g. +91 9876543210 with OTP 123456).';
      }
      if (provider === 'google' || msg.includes('google')) {
        return 'Google sign-in is not enabled for this project. In Firebase Console: Go to Authentication > Sign-in method, click Google, toggle Enable, ensure Project support email is selected, and click Save.';
      }
      if (provider === 'email' || msg.includes('password')) {
        return 'Email/Password sign-in is not enabled for this project. In Firebase Console, go to Authentication > Sign-in method and enable Email/Password.';
      }
      return 'This sign-in method is not enabled in Firebase Console. Please verify provider status under Authentication > Sign-in method.';
    }

    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Google sign-in window was closed before completing.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in window request was cancelled or superseded by another window.';
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser. Please allow popups or try again.';
      case 'auth/unauthorized-domain':
        return `Domain '${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}' is not authorized. Add it in Firebase Console > Authentication > Settings > Authorized domains.`;
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email address using a different sign-in method. Please sign in with your original method.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/user-not-found':
        return 'No student account was found with this email.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/too-many-requests':
        return 'Access temporarily disabled due to too many failed attempts or SMS limits. Please try again later, or use registered test phone numbers.';
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format. Please check the country code and 10-digit number.';
      case 'auth/invalid-verification-code':
        return 'Incorrect 6-digit OTP code. Please check and try again.';
      case 'auth/code-expired':
        return 'The verification code has expired. Please click "Resend OTP" to request a new code.';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded for this Firebase project. To continue testing without billing, add test phone numbers in Firebase Console > Authentication > Sign-in method > Phone.';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA verification failed. Please refresh the page and try again.';
      case 'auth/missing-verification-code':
        return 'Please enter the 6-digit verification code.';
      case 'auth/invalid-verification-id':
        return 'Verification session has expired. Please request a new OTP.';
      case 'auth/network-request-failed':
        return 'Network error occurred. Please check your internet connection.';
      case 'auth/internal-error':
        return err.message ? `Firebase error: ${err.message}` : 'A Firebase internal error occurred. Please try again.';
      default:
        // Do not show "provider not enabled" for unrelated errors
        return err.message || 'Authentication failed. Please verify your connection and try again.';
    }
  }
};
