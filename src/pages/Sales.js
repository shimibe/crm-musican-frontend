import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [totals, setTotals] = useState({ totalSales: 0, totalCommission: 0, totalCommissionPayable: 0 });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedUserId, setSelectedUserId] = useState('');
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [formData, setFormData] = useState({
    customer_id: '',
    service_product: '',
    price_including_vat: '',
    payment_date: '',
    invoice_number: '',
    notes: '',
    deducted_from_royalties: false,
    commission_amount: '',
    paid_in_payslip: false,
    user_id: '',
  });

  useEffect(() => {
    loadSales();
    loadCustomers();
    if (isAdmin || isManager) {
      loadUsers();
    }
  }, [selectedMonth, selectedYear, selectedUserId]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedUserId) params.append('user_id', selectedUserId);

      const response = await api.get(`/sales?${params.toString()}`);
      setSales(response.data.sales || []);
      setTotals(response.data.totals || { totalSales: 0, totalCommission: 0, totalCommissionPayable: 0 });
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('שגיאה בטעינת מכירות');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Calculate commission if not manually entered
      let finalData = { ...formData };
      if (!formData.commission_amount && formData.price_including_vat) {
        const commissionRate = user?.preferences?.commissionRate || 5;
        finalData.commission_amount = (parseFloat(formData.price_including_vat) * commissionRate / 100).toFixed(2);
      }

      if (editingSale) {
        await api.patch(`/sales/${editingSale.id}`, finalData);
      } else {
        await api.post('/sales', finalData);
      }

      setShowModal(false);
      resetForm();
      loadSales();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('שגיאה בשמירת מכירה');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק מכירה זו?')) return;

    try {
      await api.delete(`/sales/${id}`);
      loadSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('שגיאה במחיקת מכירה');
    }
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setFormData({
      customer_id: sale.customer_id || '',
      service_product: sale.service_product || '',
      price_including_vat: sale.price_including_vat || '',
      payment_date: sale.payment_date ? sale.payment_date.split('T')[0] : '',
      invoice_number: sale.invoice_number || '',
      notes: sale.notes || '',
      deducted_from_royalties: sale.deducted_from_royalties || false,
      commission_amount: sale.commission_amount || '',
      paid_in_payslip: sale.paid_in_payslip || false,
      user_id: sale.user_id || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      service_product: '',
      price_including_vat: '',
      payment_date: '',
      invoice_number: '',
      notes: '',
      deducted_from_royalties: false,
      commission_amount: '',
      paid_in_payslip: false,
      user_id: '',
    });
    setEditingSale(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  // Generate month options
  const months = [
    { value: '', label: 'כל החודשים' },
    { value: '1', label: 'ינואר' },
    { value: '2', label: 'פברואר' },
    { value: '3', label: 'מרץ' },
    { value: '4', label: 'אפריל' },
    { value: '5', label: 'מאי' },
    { value: '6', label: 'יוני' },
    { value: '7', label: 'יולי' },
    { value: '8', label: 'אוגוסט' },
    { value: '9', label: 'ספטמבר' },
    { value: '10', label: 'אוקטובר' },
    { value: '11', label: 'נובמבר' },
    { value: '12', label: 'דצמבר' },
  ];

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map(y => ({
    value: y.toString(),
    label: y.toString()
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">מכירות</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          מכירה חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              חודש
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              שנה
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>{year.label}</option>
              ))}
            </select>
          </div>

          {(isAdmin || isManager) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                עובד
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">כל העובדים</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {(isAdmin || isManager) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">סה"כ מכירות</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(totals.totalSales)}
              </div>
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">סה"כ עמלות</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totals.totalCommission)}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">עמלה לתשלום</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totals.totalCommissionPayable)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (עם חשבונית או הפחתה, טרם שולם)
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  לקוח
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  שירות/מוצר
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  מחיר כולל מע"מ
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  תאריך יצירה
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  תאריך תשלום
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  מספר חשבונית
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  הערות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  הופחת מתמלוגים
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  עמלת בונוס
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  שולם בתלוש
                </th>
                {(isAdmin || isManager) && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    פעולות
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    לא נמצאו מכירות
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const isPayable = (sale.invoice_number || sale.deducted_from_royalties) && !sale.paid_in_payslip;
                  return (
                    <tr key={sale.id} className={isPayable ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {sale.customer_name || '-'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                        {sale.service_product}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(sale.price_including_vat)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(sale.created_at)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(sale.payment_date)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {sale.invoice_number || '-'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {sale.notes || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                        {sale.deducted_from_royalties ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(sale.commission_amount)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                        {sale.paid_in_payslip ? (
                          <span className="text-blue-600 dark:text-blue-400">✓</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                      {(isAdmin || isManager) && (
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(sale)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingSale ? 'עריכת מכירה' : 'מכירה חדשה'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    לקוח
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">בחר לקוח (אופציונלי)</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                {(isAdmin || isManager) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      עובד
                    </label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">בחר עובד</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שירות/מוצר *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.service_product}
                    onChange={(e) => setFormData({ ...formData, service_product: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מחיר כולל מע"מ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price_including_vat}
                    onChange={(e) => setFormData({ ...formData, price_including_vat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    עמלת בונוס (ברירת מחדל: 5%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.commission_amount}
                    onChange={(e) => setFormData({ ...formData, commission_amount: e.target.value })}
                    placeholder="יחושב אוטומטית"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך תשלום
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    מספר חשבונית
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    הערות
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deducted_from_royalties"
                    checked={formData.deducted_from_royalties}
                    onChange={(e) => setFormData({ ...formData, deducted_from_royalties: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <label htmlFor="deducted_from_royalties" className="text-sm text-gray-700 dark:text-gray-300">
                    הופחת מתמלוגים
                  </label>
                </div>

                {(isAdmin || isManager) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="paid_in_payslip"
                      checked={formData.paid_in_payslip}
                      onChange={(e) => setFormData({ ...formData, paid_in_payslip: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                    />
                    <label htmlFor="paid_in_payslip" className="text-sm text-gray-700 dark:text-gray-300">
                      שולם בתלוש
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  {editingSale ? 'עדכן' : 'צור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
