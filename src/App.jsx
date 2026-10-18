import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoBanner } from './components/DemoBanner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Chatbot } from './components/Chatbot';

import { Home } from './pages/Home';
import { ItemDetails } from './pages/ItemDetails';
import { ReportItem } from './pages/ReportItem';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { Profile } from './pages/Profile';
import { CampusMap } from './pages/CampusMap';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { AdminRoute } from './components/AdminRoute';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { AuthorityLogin } from './pages/AuthorityLogin';
import { AuthorityRoute } from './components/AuthorityRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { NotFound } from './pages/NotFound';

function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 relative">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* When a signed-out user opens CampusFind, display dedicated Login / Sign Up page */}
          <Route
            path="/"
            element={currentUser ? <Home /> : <Login />}
          />
          <Route path="/browse" element={<Home />} />
          <Route path="/item/:id" element={<ItemDetails />} />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/campus-map" element={<CampusMap />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/authority/login" element={<AuthorityLogin />} />
          <Route
            path="/authority/dashboard"
            element={
              <AuthorityRoute>
                <AuthorityDashboard />
              </AuthorityRoute>
            }
          />
          <Route path="/authority" element={<Navigate to="/authority/dashboard" replace />} />
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={currentUser ? <Navigate to="/" replace /> : <Register />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {/* Global AI Lost & Found Assistant Chatbot */}
      <Chatbot />
    </div>
  );
}

export function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
