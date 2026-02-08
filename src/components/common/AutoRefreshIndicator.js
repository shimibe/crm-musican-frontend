import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, PauseCircle } from 'lucide-react';
import { useAutoRefresh } from '../../contexts/AutoRefreshContext';

const AutoRefreshIndicator = () => {
  const { enabled, isUserActive, shouldRefreshPage, getTimeUntilRefresh, refresh } = useAutoRefresh();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, forceUpdate] = useState({});

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      forceUpdate({});
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('he-IL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleManualRefresh = () => {
    refresh();
  };

  const timeUntilRefresh = getTimeUntilRefresh();

  return (
    <div className="p-4 space-y-2 text-xs">
      {/* Current Time and Date */}
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Clock className="w-4 h-4" />
        <div>
          <div className="font-semibold">{formatTime(currentTime)}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Auto Refresh Status */}
      {shouldRefreshPage && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          {!enabled ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <RefreshCw className="w-3 h-3" />
                <span>רענון כבוי</span>
              </div>
              <button
                onClick={handleManualRefresh}
                className="px-2 py-1 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                title="רענון ידני"
              >
                רענן עכשיו
              </button>
            </div>
          ) : !isUserActive ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <PauseCircle className="w-3 h-3" />
                <span>רענון מושהה</span>
              </div>
              <button
                onClick={handleManualRefresh}
                className="px-2 py-1 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                title="רענון ידני"
              >
                רענן עכשיו
              </button>
            </div>
          ) : timeUntilRefresh ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
              <span>
                רענון בעוד {timeUntilRefresh.minutes}:{timeUntilRefresh.seconds.toString().padStart(2, '0')}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AutoRefreshIndicator;
