import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { User, Key, Save, Phone, Clock, RefreshCw, DollarSign, Bell } from 'lucide-react';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [taskSettings, setTaskSettings] = useState({
    useAutoPriority: user?.useAutoPriority ?? false,
    taskPriorityLowToMedium: user?.taskPriorityLowToMedium ?? 1,
    taskPriorityMediumToHigh: user?.taskPriorityMediumToHigh ?? 3,
  });
  const [autoRefreshSettings, setAutoRefreshSettings] = useState({
    enabled: user?.preferences?.autoRefreshEnabled ?? true,
    interval: user?.preferences?.autoRefreshInterval ?? 2,
    inactivityTimeout: user?.preferences?.autoRefreshInactivityTimeout ?? 20,
  });
  const [commissionRate, setCommissionRate] = useState(user?.preferences?.commissionRate ?? 5);
  const [defaultSalesUserId, setDefaultSalesUserId] = useState(user?.preferences?.defaultSalesUserId ?? '');
  const [emailNotifications, setEmailNotifications] = useState({
    new_sale: user?.preferences?.email_notifications?.new_sale ?? true,
    new_task: user?.preferences?.email_notifications?.new_task ?? true,
    shift_start: user?.preferences?.email_notifications?.shift_start ?? true,
    shift_end: user?.preferences?.email_notifications?.shift_end ?? true,
  });
  const [users, setUsers] = useState([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setTaskSettings({
        useAutoPriority: user.useAutoPriority ?? false,
        taskPriorityLowToMedium: user.taskPriorityLowToMedium ?? 1,
        taskPriorityMediumToHigh: user.taskPriorityMediumToHigh ?? 3,
      });
      setAutoRefreshSettings({
        enabled: user?.preferences?.autoRefreshEnabled ?? true,
        interval: user?.preferences?.autoRefreshInterval ?? 2,
        inactivityTimeout: user?.preferences?.autoRefreshInactivityTimeout ?? 20,
      });
      setCommissionRate(user?.preferences?.commissionRate ?? 5);
      setDefaultSalesUserId(user?.preferences?.defaultSalesUserId ?? '');
      setEmailNotifications({
        new_sale: user?.preferences?.email_notifications?.new_sale ?? true,
        new_task: user?.preferences?.email_notifications?.new_task ?? true,
        shift_start: user?.preferences?.email_notifications?.shift_start ?? true,
        shift_end: user?.preferences?.email_notifications?.shift_end ?? true,
      });
    }
  }, [user]);

  // Load users list for default sales employee dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsers(response.data || []);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    if (user?.role === 'admin' || user?.role === 'manager') {
      loadUsers();
    }
  }, [user?.role]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put(`/users/${user.id}`, {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
      });

      // Update user in context and localStorage
      updateUser(response.data);

      setMessage({ type: 'success', text: 'הפרופיל עודכן בהצלחה' });
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בעדכון פרופיל' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'הסיסמאות אינן תואמות' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
      setLoading(false);
      return;
    }

    try {
      await api.put(`/users/${user.id}`, {
        password: passwordData.newPassword,
      });
      setMessage({ type: 'success', text: 'הסיסמה שונתה בהצלחה' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בשינוי סיסמה' });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Save to server
      const response = await api.put(`/users/${user.id}`, {
        useAutoPriority: taskSettings.useAutoPriority,
        taskPriorityLowToMedium: parseInt(taskSettings.taskPriorityLowToMedium),
        taskPriorityMediumToHigh: parseInt(taskSettings.taskPriorityMediumToHigh),
      });

      // Update user in context and localStorage
      updateUser(response.data);

      setMessage({ type: 'success', text: 'הגדרות משימות עודכנו בהצלחה' });
    } catch (error) {
      console.error('Error updating task settings:', error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון הגדרות משימות' });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRefreshSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const newPreferences = {
        ...(user.preferences || {}),
        autoRefreshEnabled: autoRefreshSettings.enabled,
        autoRefreshInterval: parseInt(autoRefreshSettings.interval),
        autoRefreshInactivityTimeout: parseInt(autoRefreshSettings.inactivityTimeout),
      };

      await api.patch(`/users/${user.id}/preferences`, { preferences: newPreferences });

      // Update user in context
      updateUser({
        ...user,
        preferences: newPreferences,
      });

      setMessage({ type: 'success', text: 'הגדרות רענון אוטומטי עודכנו בהצלחה' });
    } catch (error) {
      console.error('Error updating auto-refresh settings:', error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון הגדרות רענון אוטומטי' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailNotificationsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await api.patch(`/users/${user.id}/preferences`, {
        preferences: { email_notifications: emailNotifications },
      });

      updateUser({ ...user, preferences: result.data.preferences });
      setMessage({ type: 'success', text: 'הגדרות התראות עודכנו בהצלחה' });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון הגדרות התראות' });
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionRateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const newPreferences = {
        ...(user.preferences || {}),
        commissionRate: parseFloat(commissionRate),
        defaultSalesUserId: defaultSalesUserId || null,
      };

      await api.patch(`/users/${user.id}/preferences`, { preferences: newPreferences });

      updateUser({
        ...user,
        preferences: newPreferences,
      });

      setMessage({ type: 'success', text: 'הגדרות עמלה עודכנו בהצלחה' });
    } catch (error) {
      console.error('Error updating commission settings:', error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון הגדרות עמלה' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          הגדרות
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          נהל את הפרופיל והגדרות החשבון שלך
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              פרטי משתמש
            </h2>
          </div>
        </div>
        <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                שם משתמש
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                תפקיד
              </label>
              <input
                type="text"
                value={
                  user?.role === 'admin'
                    ? 'מנהל'
                    : user?.role === 'manager'
                    ? 'מנהל צוות'
                    : 'עובד'
                }
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                שם מלא
              </label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) =>
                  setProfileData({ ...profileData, fullName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                אימייל
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) =>
                  setProfileData({ ...profileData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                מספר טלפון
              </div>
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) =>
                setProfileData({ ...profileData, phone: e.target.value })
              }
              placeholder="972501234567"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              לשליחת קמפיין ניסיון לוואטסאפ (פורמט: 972501234567)
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              שמור שינויים
            </button>
          </div>
        </form>
      </div>

      {/* Task Priority Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              הגדרות עדיפות משימות
            </h2>
          </div>
        </div>
        <form onSubmit={handleTaskSettingsSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useAutoPriority"
              checked={taskSettings.useAutoPriority}
              onChange={(e) =>
                setTaskSettings({ ...taskSettings, useAutoPriority: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="useAutoPriority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              הפעל עדיפות אוטומטית לפי זמן עדכון
            </label>
          </div>

          {taskSettings.useAutoPriority && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  כאשר מופעל, עדיפות המשימות תחושב אוטומטית על בסיס זמן העדכון האחרון.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מספר ימים לעדיפות בינונית
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={taskSettings.taskPriorityLowToMedium}
                    onChange={(e) =>
                      setTaskSettings({ ...taskSettings, taskPriorityLowToMedium: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    משימה שלא עודכנה במשך {taskSettings.taskPriorityLowToMedium} ימים תקבל עדיפות בינונית
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מספר ימים לעדיפות גבוהה
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={taskSettings.taskPriorityMediumToHigh}
                    onChange={(e) =>
                      setTaskSettings({ ...taskSettings, taskPriorityMediumToHigh: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    משימה שלא עודכנה במשך {taskSettings.taskPriorityMediumToHigh} ימים תקבל עדיפות גבוהה
                  </p>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            שמור הגדרות
          </button>
        </form>
      </div>

      {/* Commission Rate Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              אחוז עמלה על מכירות
            </h2>
          </div>
        </div>
        <form onSubmit={handleCommissionRateSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                אחוז עמלה (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                אחוז העמלה המחושב אוטומטית על מכירות חדשות. ברירת מחדל: 5%
              </p>
            </div>

            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  עובד ברירת מחדל לבונוסים
                </label>
                <select
                  value={defaultSalesUserId}
                  onChange={(e) => setDefaultSalesUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">ללא ברירת מחדל</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  העובד שיבחר אוטומטית בפתיחת מכירה חדשה וב-API אם לא יישלח עובד
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            שמור הגדרות
          </button>
        </form>
      </div>

      {/* Auto Refresh Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              הגדרות רענון אוטומטי
            </h2>
          </div>
        </div>
        <form onSubmit={handleAutoRefreshSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefreshEnabled"
              checked={autoRefreshSettings.enabled}
              onChange={(e) =>
                setAutoRefreshSettings({ ...autoRefreshSettings, enabled: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="autoRefreshEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              הפעל רענון אוטומטי של דפי מידע
            </label>
          </div>

          {autoRefreshSettings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    רענן כל (דקות)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={autoRefreshSettings.interval}
                    onChange={(e) =>
                      setAutoRefreshSettings({ ...autoRefreshSettings, interval: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    הדף יתרענן אוטומטית כל {autoRefreshSettings.interval} דקות (רק בדפי מידע)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    השהה רענון לאחר חוסר פעילות (דקות)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={autoRefreshSettings.inactivityTimeout}
                    onChange={(e) =>
                      setAutoRefreshSettings({ ...autoRefreshSettings, inactivityTimeout: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    הרענון יופסק אם אין פעילות במשך {autoRefreshSettings.inactivityTimeout} דקות
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>הערה:</strong> רענון אוטומטי פעיל רק בדפי מידע (דשבורד, לקוחות, משימות וכו') ולא בדפי הגדרות או ניהול
                </p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            שמור הגדרות
          </button>
        </form>
      </div>

      {/* Email Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              התראות אימייל
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            בחר אילו אירועים ישלחו אליך התראה במייל
          </p>
        </div>
        <form onSubmit={handleEmailNotificationsSubmit} className="p-6 space-y-3">
          {[
            { key: 'new_sale', label: 'מכירה חדשה' },
            { key: 'new_task', label: 'משימה חדשה' },
            { key: 'shift_start', label: 'התחלת משמרת' },
            { key: 'shift_end', label: 'סיום משמרת' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`notif_${key}`}
                checked={emailNotifications[key]}
                onChange={(e) =>
                  setEmailNotifications({ ...emailNotifications, [key]: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor={`notif_${key}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </label>
            </div>
          ))}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              שמור הגדרות
            </button>
          </div>
        </form>
      </div>

      {/* Password Change */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              שינוי סיסמה
            </h2>
          </div>
        </div>
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                סיסמה חדשה
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                אישור סיסמה
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              שנה סיסמה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
