import React from 'react';

const TYPE_ICON   = { video: '🎬', image: '🖼️', post: '📝' };
const TYPE_LABEL  = { video: 'מייצר סרטון... (~2-3 דק׳)', image: 'מייצר תמונה... (~30 שניות)', post: '' };
const DONE_LABEL  = { video: 'הסרטון מוכן — ממתין לאישור ✔', image: 'התמונה מוכנה — ממתין לאישור ✔', post: 'נוצר בהצלחה ✔' };

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-primary-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function VideoQueue({ jobs, onDismiss }) {
  if (!jobs.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2" style={{ maxWidth: '320px', width: 'calc(100vw - 2rem)' }}>
      {jobs.map((job) => (
        <div
          key={job.jobId}
          onClick={() => onDismiss(job.jobId)}
          title="לחץ להסתרה"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border cursor-pointer select-none transition-all hover:opacity-80
            ${job.status === 'done'  ? 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700'
            : job.status === 'error' ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700'
            :                         'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
        >
          <span className="text-lg flex-shrink-0">{TYPE_ICON[job.type] || '⚙️'}</span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{job.label}</p>
            <p className="text-xs mt-0.5 truncate text-gray-500 dark:text-gray-400">
              {job.status === 'generating' && (TYPE_LABEL[job.type] || 'מעבד...')}
              {job.status === 'done'       && (DONE_LABEL[job.type] || 'הושלם ✔')}
              {job.status === 'error'      && (job.error?.slice(0, 80) || 'שגיאה')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {job.status === 'generating' && <Spinner />}
            {job.status === 'done'       && <span className="text-green-600 dark:text-green-400 text-sm">✓</span>}
            {job.status === 'error'      && <span className="text-red-600 dark:text-red-400 text-sm">✗</span>}
            <span className="text-xs text-gray-400 dark:text-gray-500">✕</span>
          </div>
        </div>
      ))}
    </div>
  );
}
