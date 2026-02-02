import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Edit, Trash2, DollarSign, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomerModal from '../components/tasks/CustomerModal';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [totals, setTotals] = useState({ totalSales: 0, totalCommission: 0, totalCommissionPayable: 0 });
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0);

  // Initialize filters from localStorage or use current month as default
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('salesFilterMonth');
    return saved !== null ? saved : (new Date().getMonth() + 1).toString();
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('salesFilterYear');
    return saved || new Date().getFullYear().toString();
  });
  const [selectedUserId, setSelectedUserId] = useState(() => {
    return localStorage.getItem('salesFilterUserId') || '';
  });
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { saleId, field }
  const [editingValue, setEditingValue] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name_override: '',
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

  // Save filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem('salesFilterMonth', selectedMonth);
    localStorage.setItem('salesFilterYear', selectedYear);
    localStorage.setItem('salesFilterUserId', selectedUserId);
  }, [selectedMonth, selectedYear, selectedUserId]);

  useEffect(() => {
    loadSales();
    loadCustomers();
    loadPendingInvoiceCount();
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
      const response = await api.get('/customers?status=active&limit=1000');
      const customerData = response.data.customers || response.data;
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const loadPendingInvoiceCount = async () => {
    try {
      // Load all sales without filters to count pending invoices
      const response = await api.get('/sales');
      const allSales = response.data.sales || [];

      // Count sales that don't have invoice_number and don't have deducted_from_royalties checked
      const pendingCount = allSales.filter(sale =>
        !sale.invoice_number && !sale.deducted_from_royalties
      ).length;

      setPendingInvoiceCount(pendingCount);
    } catch (error) {
      console.error('Error loading pending invoice count:', error);
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

      // Clean empty strings to null for UUID fields
      // If customerSearchTerm has value but no customer_id, use it as override
      const cleanedData = {
        ...finalData,
        customer_id: finalData.customer_id || null,
        customer_name_override: (!finalData.customer_id && customerSearchTerm) ? customerSearchTerm : null,
        user_id: finalData.user_id || null,
        payment_date: finalData.payment_date || null,
        invoice_number: finalData.invoice_number || null,
        notes: finalData.notes || null,
      };

      if (editingSale) {
        await api.patch(`/sales/${editingSale.id}`, cleanedData);
      } else {
        await api.post('/sales', cleanedData);
      }

      setShowModal(false);
      resetForm();
      loadSales();
      loadPendingInvoiceCount();
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
      loadPendingInvoiceCount();
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
    // Set customer search term to customer name if exists
    setCustomerSearchTerm(sale.customer_name || '');
    setShowModal(true);
  };

  const getSortedCustomers = () => {
    return [...customers].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return nameA.localeCompare(nameB, 'he');
    });
  };

  const getFilteredCustomers = () => {
    const sorted = getSortedCustomers();
    if (!customerSearchTerm || customerSearchTerm.trim() === '') return sorted;

    const searchLower = customerSearchTerm.toLowerCase().trim();
    return sorted.filter(customer =>
      customer.name && customer.name.toLowerCase().includes(searchLower)
    );
  };

  const handleInlineEdit = (saleId, field, currentValue) => {
    setEditingCell({ saleId, field });
    setEditingValue(currentValue || '');
  };

  const handleInlineSave = async (saleId) => {
    if (!editingCell) return;

    try {
      const updateData = {
        [editingCell.field]: editingValue || null
      };

      await api.patch(`/sales/${saleId}`, updateData);
      setEditingCell(null);
      setEditingValue('');
      loadSales();
      loadPendingInvoiceCount();
    } catch (error) {
      console.error('Error updating sale:', error);
      alert('שגיאה בעדכון');
    }
  };

  const handleInlineToggle = async (saleId, field, currentValue) => {
    try {
      await api.patch(`/sales/${saleId}`, {
        [field]: !currentValue
      });
      loadSales();
      loadPendingInvoiceCount();
    } catch (error) {
      console.error('Error updating sale:', error);
      alert('שגיאה בעדכון');
    }
  };

  const handleInlineCancel = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleCustomerClick = async (customerId) => {
    if (!customerId) return;

    try {
      const response = await api.get(`/customers/${customerId}`);
      setSelectedCustomer(response.data);
      setShowCustomerModal(true);
    } catch (error) {
      console.error('Error loading customer:', error);
      alert('שגיאה בטעינת פרטי לקוח');
    }
  };

  const resetForm = () => {
    const defaultUserId = user?.preferences?.defaultSalesUserId || '';
    setFormData({
      customer_id: '',
      customer_name_override: '',
      service_product: '',
      price_including_vat: '',
      payment_date: '',
      invoice_number: '',
      notes: '',
      deducted_from_royalties: false,
      commission_amount: '',
      paid_in_payslip: false,
      user_id: defaultUserId,
    });
    setCustomerSearchTerm('');
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

      {/* Pending Invoice Warning */}
      {pendingInvoiceCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">
              שים לב: {pendingInvoiceCount} חיובים טרם שולמו
            </span>
          </div>
        </div>
      )}

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
                  // Determine row background color based on sale status
                  const isPaid = sale.paid_in_payslip;
                  const hasInvoiceOrDeduction = sale.invoice_number || sale.deducted_from_royalties;
                  const isPayable = hasInvoiceOrDeduction && !isPaid;
                  const isPending = !hasInvoiceOrDeduction && !isPaid;

                  let rowClass = '';
                  if (isPending) {
                    rowClass = 'bg-yellow-50 dark:bg-yellow-900/10';
                  } else if (isPayable) {
                    rowClass = 'bg-green-50 dark:bg-green-900/10';
                  }

                  return (
                    <tr key={sale.id} className={rowClass}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        {sale.customer_id ? (
                          <button
                            onClick={() => handleCustomerClick(sale.customer_id)}
                            className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                          >
                            {sale.customer_name}
                          </button>
                        ) : (
                          <span className="text-gray-900 dark:text-white">{sale.customer_name || '-'}</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <button
                          onClick={() => handleEdit(sale)}
                          className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer text-right w-full"
                        >
                          {sale.service_product}
                        </button>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="flex items-center gap-1">
                          {isPending && <span>⚠️</span>}
                          {formatCurrency(sale.price_including_vat)}
                        </span>
                      </td>
                      {/* Created At - Inline Edit for Admin/Manager */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {(isAdmin || isManager) && editingCell?.saleId === sale.id && editingCell?.field === 'created_at' ? (
                          <input
                            type="date"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleInlineSave(sale.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineSave(sale.id);
                              if (e.key === 'Escape') handleInlineCancel();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-primary-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (isAdmin || isManager) {
                                setEditingCell({ saleId: sale.id, field: 'created_at' });
                                // Convert timestamp to date format YYYY-MM-DD
                                const dateValue = sale.created_at ? new Date(sale.created_at).toISOString().split('T')[0] : '';
                                setEditingValue(dateValue);
                              }
                            }}
                            className={(isAdmin || isManager) ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded' : ''}
                          >
                            {formatDate(sale.created_at)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(sale.payment_date)}
                      </td>
                      {/* Invoice Number - Inline Edit */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {editingCell?.saleId === sale.id && editingCell?.field === 'invoice_number' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleInlineSave(sale.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineSave(sale.id);
                              if (e.key === 'Escape') handleInlineCancel();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-primary-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span
                            onClick={() => handleInlineEdit(sale.id, 'invoice_number', sale.invoice_number)}
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded block"
                          >
                            {sale.invoice_number || '-'}
                          </span>
                        )}
                      </td>

                      {/* Notes - Inline Edit */}
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        {editingCell?.saleId === sale.id && editingCell?.field === 'notes' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleInlineSave(sale.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineSave(sale.id);
                              if (e.key === 'Escape') handleInlineCancel();
                            }}
                            autoFocus
                            className="w-full px-2 py-1 border border-primary-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span
                            onClick={() => handleInlineEdit(sale.id, 'notes', sale.notes)}
                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded block truncate"
                          >
                            {sale.notes || '-'}
                          </span>
                        )}
                      </td>

                      {/* Deducted from Royalties - Checkbox */}
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                        <input
                          type="checkbox"
                          checked={sale.deducted_from_royalties || false}
                          onChange={() => handleInlineToggle(sale.id, 'deducted_from_royalties', sale.deducted_from_royalties)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(sale.commission_amount)}
                      </td>

                      {/* Paid in Payslip - Checkbox (Admin/Manager only) */}
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                        {(isAdmin || isManager) ? (
                          <input
                            type="checkbox"
                            checked={sale.paid_in_payslip || false}
                            onChange={() => handleInlineToggle(sale.id, 'paid_in_payslip', sale.paid_in_payslip)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded cursor-pointer"
                          />
                        ) : (
                          sale.paid_in_payslip ? (
                            <span className="text-blue-600 dark:text-blue-400">✓</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">-</span>
                          )
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
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="חפש לקוח..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      onFocus={() => setCustomerSearchTerm(customerSearchTerm || '')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {customerSearchTerm && (
                      <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                        {getFilteredCustomers().length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            לא נמצאו לקוחות
                          </div>
                        ) : (
                          getFilteredCustomers().map((customer) => (
                            <div
                              key={customer.id}
                              onClick={() => {
                                setFormData({ ...formData, customer_id: customer.id });
                                setCustomerSearchTerm(customer.name);
                              }}
                              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                            >
                              {customer.name}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
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

      {/* Customer Modal */}
      <CustomerModal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default Sales;
