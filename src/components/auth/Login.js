import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GoogleSignInButton from './GoogleSignInButton';
import api from '../../utils/api';

const MusicNote = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9 3v10.55A4 4 0 1 0 11 17V7h4V3H9z"/>
  </svg>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle Google OAuth callback with token
  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    console.log('🔍 Login useEffect - token:', !!token, 'error:', errorParam);

    if (token) {
      console.log('🔄 Attempting to login with token...');
      loginWithToken(token)
        .then((result) => {
          console.log('✅ Login with token result:', result);
          if (result.success) {
            navigate('/');
          } else {
            setError(result.error || 'שגיאת התחברות');
          }
        })
        .catch((err) => {
          console.error('❌ Login with token error:', err);
          setError('שגיאת התחברות');
        });
    } else if (errorParam) {
      if (errorParam === 'user_not_found') {
        setError('משתמש לא נמצא במערכת. פנה למנהל להוספת המשתמש.');
      } else if (errorParam === 'auth_failed') {
        setError('שגיאה באימות Google. נסה שוב.');
      } else if (errorParam === 'no_code') {
        setError('לא התקבל קוד אימות מ-Google.');
      }
    }
  }, [searchParams, loginWithToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    setLoading(false);

    if (result.success) {
      navigate(result.user?.role === 'freelancer' ? '/attendance' : '/');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const response = await api.get('/google-auth/url');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      setError('שגיאה בהתחברות עם Google. נסה שוב.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0e1a] px-4 py-12">
      {/* Subtle radial glow behind the card */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg shadow-primary-500/30">
            <MusicNote />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CRM Musican
          </h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            התחבר למערכת
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/60 dark:shadow-none p-7">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  שם משתמש
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  placeholder="שם משתמש"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  סיסמה
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  placeholder="סיסמה"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-xl shadow-sm shadow-primary-600/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-[#111827] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  מתחבר...
                </span>
              ) : 'התחבר'}
            </button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                שכחתי סיסמה
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-700/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white dark:bg-[#111827] text-xs text-slate-400 dark:text-slate-500">
                או
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />
        </div>
      </div>
    </div>
  );
};

export default Login;
