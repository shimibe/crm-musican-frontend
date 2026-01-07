import React from 'react';
import { X } from 'lucide-react';

const CustomerModal = ({ show, onClose, customer }) => {
  if (!show || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            פרטי לקוח
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              שם
            </label>
            <p className="text-base text-gray-900 dark:text-white font-medium">
              {customer.name}
            </p>
          </div>

          {customer.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                טלפון
              </label>
              <a
                href={`tel:${customer.phone}`}
                className="text-base text-primary-600 dark:text-primary-400 hover:underline"
              >
                {customer.phone}
              </a>
            </div>
          )}

          {customer.email && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                אימייל
              </label>
              <a
                href={`mailto:${customer.email}`}
                className="text-base text-primary-600 dark:text-primary-400 hover:underline"
              >
                {customer.email}
              </a>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              קטגוריה
            </label>
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                customer.category === 'studio'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              }`}
            >
              {customer.category === 'studio' ? 'אולפן' : 'מוזיקן'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              סטטוס
            </label>
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                customer.status === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
            </span>
          </div>

          {customer.interests && customer.interests.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                תחומי עניין
              </label>
              <div className="flex flex-wrap gap-2">
                {customer.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-sm"
                  >
                    {typeof interest === 'object' ? interest.name : interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {customer.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                הערות
              </label>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
