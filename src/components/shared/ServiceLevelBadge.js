import React from 'react';

const BADGES = {
  vip:        { label: 'VIP',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' },
  premium:    { label: 'פרימיום', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' },
  subscriber: { label: 'מנוי',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' },
};

export default function ServiceLevelBadge({ level, className = '' }) {
  const badge = BADGES[level];
  if (!badge) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none shrink-0 ${badge.cls} ${className}`}>
      {badge.label}
    </span>
  );
}
