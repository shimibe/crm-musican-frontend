import React from 'react';

export const card = 'bg-white dark:bg-gray-800 rounded-lg shadow';
export const input =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500';
export const btn =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPrimary = `${btn} text-white bg-primary-600 hover:bg-primary-700`;
export const btnGhost = `${btn} text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600`;
export const btnDanger = `${btn} text-white bg-red-600 hover:bg-red-700`;
export const btnSuccess = `${btn} text-white bg-green-600 hover:bg-green-700`;

export const MODE_LABEL = { shadow: 'צל', approve: 'באישור', auto: 'אוטומטי' };
export const MODE_HINT = {
  shadow: 'בודק ומחליט, לא מפרסם כלום',
  approve: 'כל פרסום מחכה לאישורך',
  auto: 'מפרסם לבד (פוסטים ומודעות תמיד באישור)',
};

export const POST_STATUS_LABEL = {
  draft: 'טיוטה', pending_review: 'ממתין לאישור', approved: 'אושר',
  rejected: 'נדחה', scheduled: 'מתוזמן', published: 'פורסם',
  failed: 'נכשל', deleted: 'נמחק',
};
export const POST_STATUS_COLOR = {
  draft:          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  approved:       'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  rejected:       'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  scheduled:      'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  published:      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  failed:         'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  deleted:        'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export const PLATFORM_LABEL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube' };
export const PLATFORM_EMOJI = { instagram: '📸', facebook: '👍', tiktok: '🎵', youtube: '▶️' };

export const RUN_STATUS = {
  running:          ['רץ',              'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'],
  succeeded:        ['הצליח',           'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'],
  failed:           ['נכשל',            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'],
  aborted_budget:   ['נעצר — תקציב',   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'],
  aborted_killswitch: ['נעצר — כבוי',  'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'],
  aborted_limit:    ['נעצר — מגבלה',   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'],
};

export const Badge = ({ className = '', children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>{children}</span>
);

export const PostStatusBadge = ({ value }) =>
  value ? <Badge className={POST_STATUS_COLOR[value]}>{POST_STATUS_LABEL[value] || value}</Badge> : null;

export const Section = ({ title, actions, children, className = '' }) => (
  <div className={`${card} ${className}`}>
    {(title || actions) && (
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

export const Empty = ({ children }) => (
  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">{children}</div>
);

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</span>}
  </label>
);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtUsd  = (n) => `$${Number(n || 0).toFixed(Number(n) < 1 ? 3 : 2)}`;
export const fmtNum  = (n) => Number(n || 0).toLocaleString('he-IL');
export const errMsg  = (e) => e?.response?.data?.error || e?.message || 'שגיאה';
