import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard'; // The existing one
import TreatmentForm from './components/TreatmentForm';
import TreatmentHistory from './components/TreatmentHistory';
import ClinicalHistoryPage from './components/ClinicalHistoryPage';
import VetDecisionPanel from './components/VetDecisionPanel';
import FarmerDashboard from './components/FarmerDashboard';
import VetDashboard from './components/VetDashboard';
import AdminDashboard from './components/AdminDashboard';
import Settings from './components/Settings';
import { fetchTreatments, isLoggedIn, getUserRole } from './api';

/**
 * Route guards for RBAC
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/" replace />; // The wrapper logic handles showing login
  }
  
  const role = getUserRole();
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />; // Redirect unauthorized users to their default home
  }
  
  return children;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());
  const [showRegister, setShowRegister] = useState(false);
  
  // We'll keep global treatments state here for components that still need it,
  // though in a full react-router setup, you might move this to context or loaders.
  const [treatments, setTreatments] = useState([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(true);

  const loadTreatments = useCallback(async () => {
    if (!isAuthenticated) return;
    setTreatmentsLoading(true);
    try {
      const data = await fetchTreatments();
      setTreatments(data);
    } catch {
      // Handle error
    } finally {
      setTreatmentsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTreatments();
  }, [loadTreatments]);

  // If not authenticated, show either Login or Register
  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register 
          onRegisterSuccess={() => setIsAuthenticated(true)}
          onBackToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={() => setIsAuthenticated(true)} 
        onGoToRegister={() => setShowRegister(true)}
      />
    );
  }


  const role = getUserRole();

  return (
    <BrowserRouter>
      <Routes>
        {/* Main layout wrapper for authenticated users */}
        <Route path="/" element={<DashboardLayout onLogout={() => setIsAuthenticated(false)} />}>
          
          {/* Dynamic home route based on role */}
          <Route index element={
            role === 'ADMIN' ? <AdminDashboard /> :
            role === 'VET' ? <VetDashboard treatments={treatments} loading={treatmentsLoading} /> :
            <FarmerDashboard treatments={treatments} loading={treatmentsLoading} />
          } />

          {/* ── Farmer Routes ── */}
          <Route path="log" element={
            <ProtectedRoute allowedRoles={['FARMER']}>
              <div className="max-w-2xl mx-auto">
                <TreatmentForm onSuccess={loadTreatments} />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="history" element={
            <ProtectedRoute allowedRoles={['FARMER', 'VET']}>
              <TreatmentHistory treatments={treatments} loading={treatmentsLoading} />
            </ProtectedRoute>
          } />

          {/* ── Vet Routes ── */}
          <Route path="clinical-history" element={
            <ProtectedRoute allowedRoles={['VET', 'FARMER']}>
               <ClinicalHistoryPage treatments={treatments} loading={treatmentsLoading} onRefresh={loadTreatments} />
            </ProtectedRoute>
          } />
          

          {/* Using a dynamic route for the vet review panel */}
          <Route path="review/:id" element={
            <ProtectedRoute allowedRoles={['VET']}>
              <div className="max-w-2xl mx-auto">
                {/* Note: In a real app, you'd fetch the specific treatment by ID here or pass it from context */}
                <div className="glass-card p-12 text-center text-slate-400">
                  Select a treatment from the queue to review (Routing wired up!).
                </div>
              </div>
            </ProtectedRoute>
          } />

          {/* ── Admin Routes ── */}
          <Route path="mrl-alerts" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <div className="glass-card p-12 text-center text-red-400">MRL Alerts Placeholder</div>
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <div className="glass-card p-12 text-center text-slate-400">User Management Placeholder</div>
            </ProtectedRoute>
          } />

          {/* ── Common Routes ── */}
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['FARMER', 'VET', 'ADMIN']}>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
