import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result if signInWithRedirect was used
    authService.checkRedirectResult().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    // Listen to real Firebase Auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    const user = await authService.login(email, password);
    setCurrentUser(user);
    return user;
  };

  const register = async (email, password, displayName) => {
    const user = await authService.register(email, password, displayName);
    setCurrentUser(user);
    return user;
  };

  const signInWithGoogle = async () => {
    const user = await authService.signInWithGoogle();
    if (user) {
      setCurrentUser(user);
    }
    return user;
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  const setUpRecaptcha = (containerId) => {
    return authService.setUpRecaptcha(containerId);
  };

  const sendPhoneOtp = async (phoneNumber, appVerifier) => {
    return await authService.sendPhoneOtp(phoneNumber, appVerifier);
  };

  const verifyPhoneOtp = async (confirmationResult, otpCode) => {
    const user = await authService.verifyPhoneOtp(confirmationResult, otpCode);
    if (user) {
      setCurrentUser(user);
    }
    return user;
  };

  const value = {
    currentUser,
    loading,
    isFirebaseConfigured,
    isDemoMode: !isFirebaseConfigured,
    login,
    register,
    signInWithGoogle,
    logout,
    resetPassword,
    setUpRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
