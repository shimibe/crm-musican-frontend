import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import StudioBillingApp from '../components/billing/StudioBillingApp';

const StudioBilling = () => {
  const { isAdmin } = useAuth();

  // Only admins can access this page
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudioBillingApp />
    </div>
  );
};

export default StudioBilling;
