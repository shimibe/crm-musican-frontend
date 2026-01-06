import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import {
  Home, Users, CheckSquare, Settings, LogOut,
  Moon, Sun, Menu, X, Shield, Activity, Send, ChevronDown, FileText
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const { user, logout, isAdmin, isManager } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'דשבורד', href: '/', icon: Home },
    { name: 'לקוחות', href: '/customers', icon: Users },
    { name: 'קמפיינים', href: '/campaigns', icon: Send },
    { name: 'משימות', href: '/tasks', icon: CheckSquare },
    { name: 'פעילות', href: '/activity', icon: Activity },
  ];

  const adminNavigation = isAdmin ? [
    { name: 'ניהול משתמשים', href: '/admin', icon: Shield },
    { name: 'תבניות קמפיינים', href: '/campaign-templates', icon: FileText },
  ] : [];

  navigation.push({ name: 'הגדרות', href: '/settings', icon: Settings });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-30 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              CRM Musican
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.fullName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.role === 'admin' ? 'מנהל' : user?.role === 'manager' ? 'מנהל צוות' : 'עובד'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 ml-3" />
                  {item.name}
                </Link>
              );
            })}

            {/* Admin Menu */}
            {isAdmin && (
              <div>
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 ml-3" />
                    ניהול
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      adminMenuOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {adminMenuOpen && (
                  <div className="mr-3 mt-1 space-y-1">
                    {adminNavigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                            isActive
                              ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className="w-4 h-4 ml-3" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <button
              onClick={toggleDarkMode}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isDark ? (
                <>
                  <Sun className="w-5 h-5 ml-3" />
                  מצב בהיר
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 ml-3" />
                  מצב כהה
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-5 h-5 ml-3" />
              התנתק
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:mr-64">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              CRM Musican
            </h1>
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu className="w-6 h-6" />
            </button>
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
