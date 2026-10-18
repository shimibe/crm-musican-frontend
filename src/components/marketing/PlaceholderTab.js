import React from 'react';
import { Construction } from 'lucide-react';
import { card } from './ui';

export default function PlaceholderTab({ title, phase, description }) {
  return (
    <div className={`${card} p-10 flex flex-col items-center justify-center text-center gap-4`}>
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <Construction className="w-7 h-7 text-gray-400 dark:text-gray-500" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        {phase && (
          <span className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {phase}
          </span>
        )}
      </div>
    </div>
  );
}
