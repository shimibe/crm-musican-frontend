import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { AutoRefreshProvider } from './contexts/AutoRefreshContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Tasks from './pages/Tasks';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Campaigns from './pages/Campaigns';
import CampaignTemplates from './pages/CampaignTemplates';
import Shortcuts from './pages/Shortcuts';
import Sales from './pages/Sales';
import StudioBilling from './pages/StudioBilling';
import Attendance from './pages/Attendance';
import FreelanceProjects from './pages/FreelanceProjects';
import Repairs from './pages/Repairs';
import AgentYoav  from './pages/AgentYoav';
import AgentNitai from './pages/AgentNitai';

const IS_FREELANCER_PORTAL = window.location.hostname === 'job.musican.me';

const WrongPortalScreen = ({ onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" dir="rtl">
    <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-sm">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">גישה אסורה</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">פורטל זה מיועד לפרילנסרים בלבד.</p>
      <button
        onClick={onLogout}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        יציאה
      </button>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (IS_FREELANCER_PORTAL && user?.role !== 'freelancer') {
    return <WrongPortalScreen onLogout={logout} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

// App Content (inside providers)
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPassword />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute>
            <Activity />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campaigns"
        element={
          <ProtectedRoute>
            <Campaigns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campaign-templates"
        element={
          <ProtectedRoute requireAdmin>
            <CampaignTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shortcuts"
        element={
          <ProtectedRoute>
            <Shortcuts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <Sales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/freelance-projects"
        element={
          <ProtectedRoute>
            <FreelanceProjects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studio-billing"
        element={
          <ProtectedRoute requireAdmin>
            <StudioBilling />
          </ProtectedRoute>
        }
      />
      <Route
        path="/repairs"
        element={
          <ProtectedRoute>
            <Repairs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agent"
        element={
          <ProtectedRoute requireAdmin>
            <AgentYoav />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing"
        element={
          <ProtectedRoute requireAdmin>
            <AgentNitai />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <AuthProvider>
          <AutoRefreshProvider>
            <AppContent />
          </AutoRefreshProvider>
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
