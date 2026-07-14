import React from 'react';

const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmLabel = 'אישור', cancelLabel = 'ביטול', confirmClassName }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        {title && <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={confirmClassName || 'px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
