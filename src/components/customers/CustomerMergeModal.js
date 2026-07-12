import React, { useState } from 'react';
import { X, GitMerge, Check } from 'lucide-react';
import api from '../../utils/api';

export default function CustomerMergeModal({ customers, onClose, onMerged }) {
  const [primaryIdx, setPrimaryIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const primary = customers[primaryIdx];
  const secondary = customers[1 - primaryIdx];

  // Preview based on backend merge logic:
  // primary fields win; fill missing from secondary; notes concatenated
  const mergedPreview = {
    name: primary.name,
    phone: primary.phone || secondary.phone || '',
    email: primary.email || secondary.email || '',
    category: primary.category,
    status: primary.status,
    notes: [primary.notes, secondary.notes].filter(Boolean).join(' | ') || '',
    interests: [
      ...(primary.interests || []),
      ...(secondary.interests || []).filter(
        si => !(primary.interests || []).some(pi => (pi.id || pi) === (si.id || si))
      ),
    ],
  };

  const categoryLabel = (cat) => cat === 'studio' ? 'אולפן' : 'מוזיקן';
  const statusLabel = (s) => s === 'active' ? 'פעיל' : 'לא פעיל';

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      await api.post('/customers/merge', {
        primaryId: primary.id,
        mergeIds: [secondary.id],
      });
      onMerged();
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה במיזוג לקוחות');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">מיזוג לקוחות</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Choose primary */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              איזה לקוח ישמור את המזהה שלו? (הלקוח שישרוד)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {customers.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPrimaryIdx(i)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-right ${
                    primaryIdx === i
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {primaryIdx === i && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{c.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-normal mt-0.5">{c.phone || 'ללא טלפון'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Side-by-side comparison */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">השוואה בין הלקוחות:</p>
            <div className="grid grid-cols-[100px_1fr_1fr] gap-3">
              {/* Column headers */}
              <div />
              {customers.map((c, i) => (
                <div
                  key={c.id}
                  className={`text-xs font-semibold px-3 py-2 rounded-md ${
                    primaryIdx === i
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {c.name}
                  {primaryIdx === i && <span className="mr-1 font-normal">(ישרוד)</span>}
                </div>
              ))}

              {/* Rows */}
              {[
                { label: 'טלפון', key: 'phone' },
                { label: 'אימייל', key: 'email' },
                { label: 'קטגוריה', key: 'category', format: categoryLabel },
                { label: 'סטטוס', key: 'status', format: statusLabel },
                { label: 'הערות', key: 'notes' },
              ].map(({ label, key, format }) => (
                <React.Fragment key={key}>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center">{label}</div>
                  {customers.map((c, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 truncate"
                    >
                      {(format ? format(c[key]) : c[key]) || <span className="text-gray-400 italic text-xs">ריק</span>}
                    </div>
                  ))}
                </React.Fragment>
              ))}

              {/* Interests row */}
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-start pt-2">תחומי עניין</div>
              {customers.map((c, i) => (
                <div key={i} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700/50">
                  {c.interests && c.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.interests.map((interest) => (
                        <span
                          key={interest.id || interest}
                          className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs"
                        >
                          {interest.name || interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-xs">ללא</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Preview */}
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 p-4">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-3 uppercase tracking-wide">
              תצוגה מקדימה — לקוח לאחר מיזוג
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {[
                { label: 'שם', value: mergedPreview.name },
                { label: 'טלפון', value: mergedPreview.phone },
                { label: 'אימייל', value: mergedPreview.email },
                { label: 'קטגוריה', value: categoryLabel(mergedPreview.category) },
                { label: 'סטטוס', value: statusLabel(mergedPreview.status) },
                { label: 'הערות', value: mergedPreview.notes },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 min-w-16 shrink-0">{label}:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {value || <span className="text-gray-400 italic text-xs">ריק</span>}
                  </span>
                </div>
              ))}
              {mergedPreview.interests.length > 0 && (
                <div className="col-span-2 flex gap-2 items-start">
                  <span className="text-gray-500 dark:text-gray-400 min-w-16 shrink-0 pt-0.5">תחומי עניין:</span>
                  <div className="flex flex-wrap gap-1">
                    {mergedPreview.interests.map((interest) => (
                      <span
                        key={interest.id || interest}
                        className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs"
                      >
                        {interest.name || interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              <GitMerge className="w-4 h-4" />
              {saving ? 'ממזג...' : 'מזג לקוחות'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
