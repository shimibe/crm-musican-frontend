import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Activity } from 'lucide-react';

const ActivityLog = () => {
  const { isManager } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('my');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      const endpoint = filter === 'my' ? '/activity/my' : '/activity';
      const response = await api.get(endpoint, {
        params: { limit: 100 },
      });
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionText = (action) => {
    const actions = {
      create: 'יצר',
      update: 'עדכן',
      delete: 'מחק',
      login: 'התחבר',
    };
    return actions[action] || action;
  };

  const getTableText = (table) => {
    const tables = {
      customers: 'לקוח',
      tasks: 'משימה',
      users: 'משתמש',
      categories: 'קטגוריה',
    };
    return tables[table] || table;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          לוג פעילות
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          מעקב אחר פעולות במערכת
        </p>
      </div>

      {/* Filter */}
      {isManager && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('my')}
            className={`px-4 py-2 rounded-md ${
              filter === 'my'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            הפעילות שלי
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            כל הפעילות
          </button>
        </div>
      )}

      {/* Activity List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            טוען...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            אין פעילות להציג
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {log.full_name || log.username || 'משתמש לא ידוע'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {getActionText(log.action)}
                      </span>
                      {log.table_name && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {getTableText(log.table_name)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(log.created_at).toLocaleString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {log.ip_address && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        IP: {log.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
