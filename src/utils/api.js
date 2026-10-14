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
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (!isLoginRequest) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.error || '';

      // 401 = no token at all → session expired
      // 403 only if it's a real token error (not a role/permission denial)
      const isTokenError =
        status === 401 ||
        (status === 403 &&
          (errorMsg === 'Invalid or expired token' ||
            errorMsg === 'User not found' ||
            errorMsg === 'Account is inactive'));

      if (isTokenError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('ההתחברות פגה תוקף. אנא התחבר מחדש.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
