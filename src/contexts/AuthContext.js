import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      const user = JSON.parse(userData);
      setUser(user);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user: userData } = response.data;

      // Convert snake_case to camelCase for consistency
      const normalizedUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        fullName: userData.full_name || userData.fullName,
        phone: userData.phone,
        role: userData.role,
        useAutoPriority: userData.use_auto_priority ?? false,
        taskPriorityLowToMedium: userData.task_priority_low_to_medium ?? 1,
        taskPriorityMediumToHigh: userData.task_priority_medium_to_high ?? 3,
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'שגיאת התחברות'
      };
    }
  };

  const loginWithToken = async (token) => {
    try {
      // Store token
      localStorage.setItem('token', token);

      // Fetch user data with the token
      const response = await api.get('/auth/me');
      const userData = response.data;

      // Normalize user data
      const normalizedUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        fullName: userData.full_name || userData.fullName,
        phone: userData.phone,
        role: userData.role,
        useAutoPriority: userData.use_auto_priority ?? false,
        taskPriorityLowToMedium: userData.task_priority_low_to_medium ?? 1,
        taskPriorityMediumToHigh: userData.task_priority_medium_to_high ?? 3,
      };

      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      return { success: true };
    } catch (error) {
      localStorage.removeItem('token');
      return {
        success: false,
        error: error.response?.data?.error || 'שגיאת התחברות'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    // Normalize user data to camelCase
    const normalizedUser = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      fullName: userData.full_name || userData.fullName,
      phone: userData.phone,
      role: userData.role,
      useAutoPriority: userData.use_auto_priority !== undefined ? userData.use_auto_priority : userData.useAutoPriority,
      taskPriorityLowToMedium: userData.task_priority_low_to_medium !== undefined ? userData.task_priority_low_to_medium : userData.taskPriorityLowToMedium,
      taskPriorityMediumToHigh: userData.task_priority_medium_to_high !== undefined ? userData.task_priority_medium_to_high : userData.taskPriorityMediumToHigh,
    };

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  };

  const value = {
    user,
    login,
    loginWithToken,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
