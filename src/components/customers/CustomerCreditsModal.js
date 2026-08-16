import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const CustomerCreditsModal = ({ show, onClose, customer }) => {
  const { isAdmin } = useAuth();
  const [credits, setCredits] = useState([]);
  const [creditTypes, setCreditTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ product_type_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && customer) {
      loadCredits();
      loadCreditTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, customer]);

  const loadCredits = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const response = await api.get('/credits', { params: { customer_id: customer.id } });
      setCredits(response.data || []);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditTypes = async () => {
    try {
      const response = await api.get('/credit-types');
      setCreditTypes(response.data || []);
    } catch (error) {
      console.error('Error loading credit types:', error);
    }
  };

  const handleAddCredit = async (e) => {
    e.preventDefault();
    if (!form.product_type_id) return;
    setSaving(true);
    try {
      await api.post('/credits', {
        customer_id: customer.id,
        product_type_id: form.product_type_id,
        notes: form.notes || null,
      });
      setForm({ product_type_id: '', notes: '' });
      setShowAddForm(false);
      loadCredits();
    } catch (error) {
      console.error('Error adding credit:', error);
      alert('שגיאה בהוספת זיכוי');
    } finally {
      setSaving(false);
    }
  };

  const handleRedeem = async (creditId) => {
    try {
      await api.patch(`/credits/${creditId}/redeem`);
      loadCredits();
    } catch (error) {
      console.error('Error redeeming credit:', error);
      alert('שגיאה במימוש הזיכוי');
    }
  };

  const handleUnredeem = async (creditId) => {
    if (!isAdmin) return;
    try {
      await api.patch(`/credits/${creditId}/unredeem`);
      loadCredits();
    } catch (error) {
      console.error('Error unredeeeming credit:', error);
      alert('שגיאה בביטול המימוש');
    }
  };

  const handleDelete = async (creditId) => {
    if (!isAdmin) return;
    if (!window.confirm('האם למחוק זיכוי זה?')) return;
    try {
      await api.delete(`/credits/${creditId}`);
      loadCredits();
    } catch (error) {
      console.error('Error deleting credit:', error);
      alert('שגיאה במחיקת הזיכוי');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!show) return null;

  const activeCredits = credits.filter(c => !c.is_redeemed);
  const redeemedCredits = credits.filter(c => c.is_redeemed);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-right align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              זיכויים — {customer?.name}
            </h2>
            <div className="flex items-center gap-3">
              {activeCredits.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  {activeCredits.length} פעילים
                </span>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* Active credits */}
                {activeCredits.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">פעילים</h3>
                    <div className="space-y-2">
                      {activeCredits.map((credit) => (
                        <div
                          key={credit.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-750"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {credit.product_type_name || '—'}
                            </p>
                            {credit.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{credit.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              נוסף {formatDate(credit.created_at)} ע"י {credit.created_by_name || '—'}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center mr-3">
                            <button
                              onClick={() => handleRedeem(credit.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                              title="ממש זיכוי"
                            >
                              <Check className="w-3 h-3" />
                              ממש
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(credit.id)}
                                className="text-red-400 hover:text-red-600 text-xs"
                                title="מחק"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Redeemed credits */}
                {redeemedCredits.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">ממושים</h3>
                    <div className="space-y-2">
                      {redeemedCredits.map((credit) => (
                        <div
                          key={credit.id}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-750 opacity-70"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-through">
                              {credit.product_type_name || '—'}
                            </p>
                            {credit.notes && (
                              <p className="text-xs text-gray-400 mt-0.5">{credit.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              מומש {formatDate(credit.redeemed_at)} ע"י {credit.redeemed_by_name || '—'}
                            </p>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleUnredeem(credit.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline mr-3"
                            >
                              בטל מימוש
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {credits.length === 0 && (
                  <p className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                    אין זיכויים עבור לקוח זה
                  </p>
                )}
              </>
            )}
          </div>

          {/* Add credit form */}
          {showAddForm ? (
            <form onSubmit={handleAddCredit} className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סוג מוצר *
                </label>
                <select
                  required
                  value={form.product_type_id}
                  onChange={(e) => setForm({ ...form, product_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">בחר מוצר...</option>
                  {creditTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  הערה (אופציונלי)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="הערה..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50"
                >
                  הוסף זיכוי
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setForm({ product_type_id: '', notes: '' }); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  ביטול
                </button>
              </div>
            </form>
          ) : (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                הוסף זיכוי
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                סגור
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerCreditsModal;
