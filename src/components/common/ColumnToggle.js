import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

const ColumnToggle = ({ columns, visibleColumns, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Eye className="w-4 h-4" />
        <span>עמודות</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
              בחר עמודות להצגה
            </p>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {columns.map((column) => {
              const isVisible = visibleColumns[column.key];
              return (
                <button
                  key={column.key}
                  onClick={() => onToggle(column.key)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-right"
                >
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      isVisible
                        ? 'text-gray-900 dark:text-white font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {column.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                // Toggle all columns on
                columns.forEach((col) => {
                  if (!visibleColumns[col.key]) {
                    onToggle(col.key);
                  }
                });
              }}
              className="w-full px-3 py-1.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              הצג הכל
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnToggle;
