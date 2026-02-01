import { useState, useEffect, useCallback } from 'react';

const LAST_ACTIVITY_KEY = 'lastUserActivity';

/**
 * Hook to track user activity (clicks, keyboard, mouse movement, etc.)
 * Returns whether user is active or inactive based on the provided timeout
 * Persists activity time in localStorage to survive page reloads
 * @param {number} inactivityTimeout - Time in milliseconds before user is considered inactive
 * @returns {boolean} isActive - Whether the user is currently active
 */
const useUserActivity = (inactivityTimeout = 5 * 60 * 1000) => {
  // Initialize from localStorage or current time
  const [lastActivityTime, setLastActivityTime] = useState(() => {
    const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
    return saved ? parseInt(saved, 10) : Date.now();
  });

  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!saved) return true;
    const timeSinceLastActivity = Date.now() - parseInt(saved, 10);
    return timeSinceLastActivity <= inactivityTimeout;
  });

  const handleActivity = useCallback(() => {
    const now = Date.now();
    setLastActivityTime(now);
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    setIsActive(true);
  }, []);

  useEffect(() => {
    // Activity events to track (excluding events that fire during page load)
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check activity status periodically
    const interval = setInterval(() => {
      const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActivity = saved ? parseInt(saved, 10) : Date.now();
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity > inactivityTimeout) {
        setIsActive(false);
      } else {
        setIsActive(true);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [handleActivity, inactivityTimeout]);

  return isActive;
};

export default useUserActivity;
