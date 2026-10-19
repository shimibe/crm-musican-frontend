import React from 'react';

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
          {job.status === 'generating' && <Spinner />}
          {job.status === 'done'       && <span className="text-green-600 dark:text-green-400 flex-shrink-0 text-base">✓</span>}
          {job.status === 'error'      && <span className="text-red-600 dark:text-red-400 flex-shrink-0 text-base">✗</span>}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{job.label}</p>
            <p className="text-xs mt-0.5 truncate
              text-gray-500 dark:text-gray-400
              [.bg-green-50_&]:text-green-700 dark:[.bg-green-900\/40_&]:text-green-300
              [.bg-red-50_&]:text-red-700   dark:[.bg-red-900\/40_&]:text-red-300">
              {job.status === 'generating' && 'מייצר סרטון... (~2-3 דק׳)'}
              {job.status === 'done'       && 'הסרטון מוכן — ממתין לאישור ✔'}
              {job.status === 'error'      && (job.error?.slice(0, 80) || 'שגיאה ביצירת הסרטון')}
            </p>
          </div>

          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">✕</span>
        </div>
      ))}
    </div>
  );
}
