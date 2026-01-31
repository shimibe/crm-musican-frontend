import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://crm.musican.me/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // רק טפל ב-401/403 אם זה לא בקשת התחברות
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if ((error.response?.status === 401 || error.response?.status === 403) && !isLoginRequest) {
      // התחברות פגה תוקף או אין הרשאה
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // הצג הודעה למשתמש
      alert('ההתחברות פגה תוקף. אנא התחבר מחדש.');

      // נקה את העמוד ונתב להתחברות
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
