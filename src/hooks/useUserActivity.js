import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track user activity (clicks, keyboard, mouse movement, etc.)
 * Returns whether user is active or inactive based on the provided timeout
 * @param {number} inactivityTimeout - Time in milliseconds before user is considered inactive
 * @returns {boolean} isActive - Whether the user is currently active
 */
const useUserActivity = (inactivityTimeout = 5 * 60 * 1000) => {
  const [isActive, setIsActive] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const handleActivity = useCallback(() => {
    setLastActivityTime(Date.now());
    setIsActive(true);
  }, []);

  useEffect(() => {
    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Check activity status periodically
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      if (timeSinceLastActivity > inactivityTimeout) {
        setIsActive(false);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [handleActivity, inactivityTimeout, lastActivityTime]);

  return isActive;
};

export default useUserActivity;
