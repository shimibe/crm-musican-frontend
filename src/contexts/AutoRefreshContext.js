import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import useUserActivity from '../hooks/useUserActivity';

const AutoRefreshContext = createContext();

export const useAutoRefresh = () => {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error('useAutoRefresh must be used within AutoRefreshProvider');
  }
  return context;
};

export const AutoRefreshProvider = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Default settings
  const [enabled, setEnabled] = useState(() => {
    return user?.preferences?.autoRefreshEnabled ?? true;
  });

  const [refreshInterval, setRefreshInterval] = useState(() => {
    return user?.preferences?.autoRefreshInterval ?? 2; // minutes
  });

  const [inactivityTimeout, setInactivityTimeout] = useState(() => {
    return user?.preferences?.autoRefreshInactivityTimeout ?? 20; // minutes
  });

  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [nextRefreshTime, setNextRefreshTime] = useState(null);

  // Track user activity
  const isUserActive = useUserActivity(inactivityTimeout * 60 * 1000);

  // Pages that should auto-refresh (data pages, not settings)
  const dataPages = ['/', '/customers', '/tasks', '/campaigns', '/activity', '/dashboard'];
  const shouldRefreshPage = dataPages.includes(location.pathname);

  // Refresh callback
  const refresh = useCallback(() => {
    if (!shouldRefreshPage || !enabled || !isUserActive) {
      return;
    }

    setLastRefreshTime(Date.now());
    window.location.reload();
  }, [shouldRefreshPage, enabled, isUserActive]);

  // Auto-refresh effect
  useEffect(() => {
    if (!enabled || !shouldRefreshPage || !isUserActive) {
      setNextRefreshTime(null);
      return;
    }

    const intervalMs = refreshInterval * 60 * 1000;
    setNextRefreshTime(Date.now() + intervalMs);

    const timer = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, refreshInterval, shouldRefreshPage, isUserActive, refresh]);

  // Update next refresh time countdown
  useEffect(() => {
    if (!nextRefreshTime) return;

    const interval = setInterval(() => {
      // Force re-render to update countdown
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRefreshTime]);

  // Update settings from user preferences
  useEffect(() => {
    if (user?.preferences?.autoRefreshEnabled !== undefined) {
      setEnabled(user.preferences.autoRefreshEnabled);
    }
    if (user?.preferences?.autoRefreshInterval !== undefined) {
      setRefreshInterval(user.preferences.autoRefreshInterval);
    }
    if (user?.preferences?.autoRefreshInactivityTimeout !== undefined) {
      setInactivityTimeout(user.preferences.autoRefreshInactivityTimeout);
    }
  }, [user?.preferences]);

  const getTimeUntilRefresh = () => {
    if (!nextRefreshTime || !enabled || !isUserActive || !shouldRefreshPage) {
      return null;
    }
    const timeLeft = Math.max(0, nextRefreshTime - Date.now());
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return { minutes, seconds, totalSeconds: Math.floor(timeLeft / 1000) };
  };

  const value = {
    enabled,
    setEnabled,
    refreshInterval,
    setRefreshInterval,
    inactivityTimeout,
    setInactivityTimeout,
    isUserActive,
    shouldRefreshPage,
    lastRefreshTime,
    nextRefreshTime,
    getTimeUntilRefresh,
    refresh,
  };

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  );
};
