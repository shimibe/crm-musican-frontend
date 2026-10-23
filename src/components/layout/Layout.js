import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import AutoRefreshIndicator from '../common/AutoRefreshIndicator';
import api from '../../utils/api';
import {
  Home, Users, CheckSquare, Settings, LogOut,
  Moon, Sun, Menu, X, Shield, Activity, Send, Link2, ChevronRight, ChevronLeft, DollarSign, Mic, Clock, Wrench, Bot, FolderOpen, Megaphone
} from 'lucide-react';

const MusicNote = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 3v10.55A4 4 0 1 0 11 17V7h4V3H9z"/>
  </svg>
);

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const { user, logout, isAdmin } = useAuth();
  const isFreelancer = user?.role === 'freelancer';
  const { isDark, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  // Nav badge counts
  const [navBadges, setNavBadges] = useState({ tasks: 0, repairs: 0 });

  // Studio timer indicator state
  const [studioTimerActive, setStudioTimerActive] = useState(false);
  const [studioElapsedTime, setStudioElapsedTime] = useState(0);

  // Attendance shift status
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [shiftElapsedTime, setShiftElapsedTime] = useState(0);

  // Check for active studio timer
  useEffect(() => {
    const checkStudioTimer = () => {
      const isRunning = localStorage.getItem('studioBilling_isTimerRunning') === 'true';
      const timerStart = parseInt(localStorage.getItem('studioBilling_timerStart'));

      if (isRunning && timerStart) {
        setStudioTimerActive(true);
        setStudioElapsedTime(Date.now() - timerStart);
      } else {
        setStudioTimerActive(false);
        setStudioElapsedTime(0);
      }
    };

    checkStudioTimer();
    const interval = setInterval(checkStudioTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for active attendance shift
  useEffect(() => {
    const checkActiveShift = async () => {
      try {
        const response = await api.get('/attendance/active-shift');
        const hasShift = response.data.hasActiveShift;
        const shift = response.data.activeShift;

        setHasActiveShift(hasShift);

        if (hasShift && shift) {
          const startTime = new Date(shift.start_time).getTime();
          setShiftElapsedTime(Date.now() - startTime);

          sessionStorage.setItem('attendance_hasActiveShift', 'true');
          sessionStorage.setItem('attendance_shiftStartTime', startTime.toString());
          sessionStorage.setItem('attendance_workFromHome', shift.work_from_home ? 'true' : 'false');
        } else {
          setShiftElapsedTime(0);
          sessionStorage.removeItem('attendance_hasActiveShift');
          sessionStorage.removeItem('attendance_shiftStartTime');
          sessionStorage.removeItem('attendance_workFromHome');
        }
      } catch (error) {
        setHasActiveShift(false);
      }
    };

    const cachedHasShift = sessionStorage.getItem('attendance_hasActiveShift') === 'true';
    const cachedStartTime = sessionStorage.getItem('attendance_shiftStartTime');

    if (cachedHasShift && cachedStartTime) {
      setHasActiveShift(true);
      setShiftElapsedTime(Date.now() - parseInt(cachedStartTime));
      checkActiveShift();
    } else {
      checkActiveShift();
    }
  }, []);

  // Update elapsed time every second when shift is active
  useEffect(() => {
    if (!hasActiveShift) return;
    const interval = setInterval(() => {
      setShiftElapsedTime(prev => prev + 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveShift]);

  // Load nav badge counts — refresh on navigation + every 3 minutes
  useEffect(() => {
    const loadNavBadges = async () => {
      if (!user?.id) return;
      if (document.visibilityState === 'hidden') return;
      try {
        const [tasksRes, repairsRes] = await Promise.all([
          api.get('/tasks', { params: { assigned_to: user.id, limit: 100 } }),
          api.get('/repairs', { params: { mine: 'true', exclude_final: 'true', limit: 100 } }),
        ]);
        const openTasks = (tasksRes.data.tasks || [])
          .filter(t => t.status === 'open' || t.status === 'in_progress').length;
        const openRepairs = (repairsRes.data.repairs || []).length;
        setNavBadges({ tasks: openTasks, repairs: openRepairs });
      } catch (e) {
        // silently fail
      }
    };
    loadNavBadges();
    const interval = setInterval(loadNavBadges, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, location.pathname]);

  const formatStudioTime = (time) => {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatShiftTime = (time) => {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Freelancers see only attendance + projects pages
  const navigation = isFreelancer
    ? [
        { name: 'דשבורד', href: '/', icon: Home },
        { name: 'נוכחות', href: '/attendance', icon: Clock },
        { name: 'פרויקטים', href: '/freelance-projects', icon: FolderOpen },
        { name: 'הגדרות', href: '/settings', icon: Settings },
      ]
    : [
        { name: 'דשבורד', href: '/', icon: Home },
        { name: 'לקוחות', href: '/customers', icon: Users },
        { name: 'משימות', href: '/tasks', icon: CheckSquare, badgeKey: 'tasks' },
        { name: 'תיקונים', href: '/repairs', icon: Wrench, badgeKey: 'repairs' },
        { name: 'מכירות', href: '/sales', icon: DollarSign },
        { name: 'נוכחות', href: '/attendance', icon: Clock },
        { name: 'פעילות', href: '/activity', icon: Activity },
        { name: 'קיצורים', href: '/shortcuts', icon: Link2 },
      ];

  if (isAdmin) {
    navigation.push({ name: 'פרויקטים', href: '/freelance-projects', icon: FolderOpen });
    navigation.push({ name: 'קמפיינים', href: '/campaigns', icon: Send, adminOnly: true });
    navigation.push({ name: 'חיוב אולפן', href: '/studio-billing', icon: Mic, adminOnly: true });
    navigation.push({ name: 'הסוכן יואב', href: '/agent', icon: Bot, adminOnly: true });
    navigation.push({ name: 'הסוכן ניתאי', href: '/marketing', icon: Megaphone, adminOnly: true });
    navigation.push({ name: 'ניהול', href: '/admin', icon: Shield, adminOnly: true });
  }

  if (!isFreelancer) {
    navigation.push({ name: 'הגדרות', href: '/settings', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0e1a]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-30 bg-white dark:bg-[#080c14] border-l border-slate-200 dark:border-[#1a1f2e] transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} flex flex-col`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-[#1a1f2e] shrink-0 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <MusicNote className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                CRM Musican
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${sidebarCollapsed ? '' : ''}`}
            title={sidebarCollapsed ? 'הרחב תפריט' : 'קפל תפריט'}
          >
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Auto Refresh Indicator */}
        {!sidebarCollapsed && (
          <div className="border-b border-slate-200 dark:border-[#1a1f2e] shrink-0">
            <AutoRefreshIndicator />
          </div>
        )}

        {/* Studio Timer Indicator - Admin Only */}
        {isAdmin && studioTimerActive && !sidebarCollapsed && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border-b border-slate-200 dark:border-[#1a1f2e] shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                סשן אולפן פעיל: {formatStudioTime(studioElapsedTime)}
              </span>
            </div>
          </div>
        )}

        {/* Attendance Shift Indicator */}
        {!sidebarCollapsed && (
          <div className={`px-4 py-2.5 border-b border-slate-200 dark:border-[#1a1f2e] shrink-0 ${
            hasActiveShift || isAdmin
              ? 'bg-emerald-50 dark:bg-emerald-500/10'
              : 'bg-amber-50 dark:bg-amber-500/10'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {hasActiveShift ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                    משמרת פעילה: {formatShiftTime(shiftElapsedTime)}
                  </span>
                </>
              ) : isAdmin ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-primary-500 inline-block shrink-0" />
                  <span className="font-medium text-primary-700 dark:text-primary-400">
                    מנהל מחובר
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    לא במשמרת
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* User info */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1a1f2e] shrink-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
              {user?.fullName}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {user?.role === 'admin' ? 'מנהל' : user?.role === 'manager' ? 'מנהל צוות' : 'עובד'}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const badge = item.badgeKey ? navBadges[item.badgeKey] || 0 : 0;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold'
                    : item.adminOnly
                    ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : ''}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-[18px] h-[18px] ${!sidebarCollapsed ? 'ml-2.5' : ''}`} />
                  {sidebarCollapsed && badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                {!sidebarCollapsed && <span className="flex-1 truncate">{item.name}</span>}
                {!sidebarCollapsed && badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-slate-200 dark:border-[#1a1f2e] space-y-0.5 shrink-0">
          <button
            onClick={toggleDarkMode}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} w-full px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors`}
            title={sidebarCollapsed ? (isDark ? 'מצב בהיר' : 'מצב כהה') : ''}
          >
            {isDark ? (
              <>
                <Sun className={`w-[18px] h-[18px] ${!sidebarCollapsed ? 'ml-2.5' : ''}`} />
                {!sidebarCollapsed && 'מצב בהיר'}
              </>
            ) : (
              <>
                <Moon className={`w-[18px] h-[18px] ${!sidebarCollapsed ? 'ml-2.5' : ''}`} />
                {!sidebarCollapsed && 'מצב כהה'}
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} w-full px-3 py-2 text-sm font-medium text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors`}
            title={sidebarCollapsed ? 'התנתק' : ''}
          >
            <LogOut className={`w-[18px] h-[18px] ${!sidebarCollapsed ? 'ml-2.5' : ''}`} />
            {!sidebarCollapsed && 'התנתק'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:mr-[72px]' : 'lg:mr-64'}`}>
        {/* Top bar — mobile only */}
        <header className="bg-white dark:bg-[#080c14] border-b border-slate-200 dark:border-[#1a1f2e] lg:hidden">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <MusicNote className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                CRM Musican
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
