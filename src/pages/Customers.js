import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Search, Edit, Trash2, UserPlus, Download } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('all');
  const [availableInterests, setAvailableInterests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'active',
    category: 'musician',
    notes: '',
    interests: [],
  });

  useEffect(() => {
    loadCustomers();
    loadInterests();
  }, [search, categoryFilter, interestFilter]);

  const loadCustomers = async () => {
    try {
      const params = { search, limit: 100 };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (interestFilter !== 'all') {
        params.interest = interestFilter;
      }
      const response = await api.get('/customers', { params });
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInterests = async () => {
    try {
      const response = await api.get('/interests');
      setAvailableInterests(response.data.interests || []);
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  const findDuplicate = () => {
    // Find duplicate customer by name, phone, or email
    const duplicate = customers.find(c => {
      if (editingCustomer && c.id === editingCustomer.id) return false;

      const nameMatch = c.name.toLowerCase().trim() === formData.name.toLowerCase().trim();
      const phoneMatch = formData.phone && c.phone &&
        c.phone.replace(/\s|-/g, '') === formData.phone.replace(/\s|-/g, '');
      const emailMatch = formData.email && c.email &&
        c.email.toLowerCase() === formData.email.toLowerCase();

      return nameMatch || phoneMatch || emailMatch;
    });

    return duplicate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for duplicates
    const duplicate = findDuplicate();

    if (duplicate) {
      setDuplicateCustomer(duplicate);
      setShowDuplicateModal(true);
      return;
    }

    await saveCustomer();
  };

  const saveCustomer = async (updateExisting = false) => {
    try {
      if (updateExisting && duplicateCustomer) {
        await api.put(`/customers/${duplicateCustomer.id}`, formData);
      } else if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowModal(false);
      setShowDuplicateModal(false);
      setEditingCustomer(null);
      setDuplicateCustomer(null);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.error || 'שגיאה בשמירת לקוח';
      alert(errorMessage);
    }
  };

  const handleDuplicateAction = async (action) => {
    if (action === 'save-both') {
      await saveCustomer(false);
    } else if (action === 'update-existing') {
      await saveCustomer(true);
    } else if (action === 'cancel') {
      setShowDuplicateModal(false);
      setDuplicateCustomer(null);
    }
  };

  const handleQuickCategoryUpdate = async (customerId, newCategory) => {
    try {
      await api.put(`/customers/${customerId}`, { category: newCategory });
      loadCustomers();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('שגיאה בעדכון קטגוריה');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) return;
    
    try {
      await api.delete(`/customers/${id}`);
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('שגיאה במחיקת לקוח');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      status: customer.status,
      category: customer.category || 'musician',
      notes: customer.notes || '',
      interests: customer.interests || [],
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      status: 'active',
      category: 'musician',
      notes: '',
      interests: [],
    });
  };

  const toggleInterest = (interestId) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const exportToCSV = () => {
    // Prepare CSV headers
    const headers = ['שם', 'טלפון', 'אימייל', 'קטגוריה', 'תחומי עניין', 'סטטוס', 'הערות'];

    // Prepare CSV rows
    const rows = customers.map(customer => {
      const interests = customer.interests && customer.interests.length > 0
        ? customer.interests.map(i => i.name || availableInterests.find(ai => ai.id === i)?.name || i).join('; ')
        : '';

      return [
        customer.name,
        customer.phone || '',
        customer.email || '',
        customer.category === 'studio' ? 'אולפן' : 'מוזיקן',
        interests,
        customer.status === 'active' ? 'פעיל' : 'לא פעיל',
        customer.notes || ''
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM for proper Hebrew encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ניהול לקוחות
        </h1>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            title="ייצוא לקובץ CSV"
          >
            <Download className="w-4 h-4" />
            ייצוא CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            לקוח חדש
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="חיפוש לקוחות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setCategoryFilter('musician')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              categoryFilter === 'musician'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            מוזיקנים
          </button>
          <button
            onClick={() => setCategoryFilter('studio')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              categoryFilter === 'studio'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            אולפנים
          </button>
        </div>

        {/* Interest Filter */}
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">תחומי עניין:</label>
          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">כל התחומים</option>
            {availableInterests.map((interest) => (
              <option key={interest.id} value={interest.id}>
                {interest.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            טוען...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            לא נמצאו לקוחות
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    שם
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    טלפון
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    אימייל
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    קטגוריה
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    תחומי עניין
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    סטטוס
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline"
                      onClick={() => handleEdit(customer)}
                    >
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {customer.phone ? (
                        <a
                          href={`sip:${customer.phone.replace(/\s|-/g, '')}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {customer.phone}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {customer.email ? (
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {customer.email}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={customer.category}
                        onChange={(e) => handleQuickCategoryUpdate(customer.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${
                          customer.category === 'studio'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}
                      >
                        <option value="musician">מוזיקן</option>
                        <option value="studio">אולפן</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {customer.interests && customer.interests.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.interests.map((interest) => (
                            <span
                              key={interest.id || interest}
                              className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs"
                            >
                              {interest.name || availableInterests.find(i => i.id === interest)?.name || interest}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          customer.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingCustomer ? 'עריכת לקוח' : 'לקוח חדש'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  טלפון
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קטגוריה
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="musician">מוזיקן</option>
                  <option value="studio">אולפן</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סטטוס
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">פעיל</option>
                  <option value="inactive">לא פעיל</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  תחומי עניין
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableInterests.map((interest) => (
                    <label
                      key={interest.id}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(interest.id)}
                        onChange={() => toggleInterest(interest.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{interest.name}</span>
                    </label>
                  ))}
                  {availableInterests.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">אין תחומי עניין זמינים</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && duplicateCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                ⚠️ נמצא לקוח דומה במערכת
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Existing Customer */}
                <div className="border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    לקוח קיים במערכת
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">שם:</span>{' '}
                      <span className="text-gray-900 dark:text-white">{duplicateCustomer.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">טלפון:</span>{' '}
                      <span className="text-gray-900 dark:text-white">{duplicateCustomer.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">אימייל:</span>{' '}
                      <span className="text-gray-900 dark:text-white">{duplicateCustomer.email || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">קטגוריה:</span>{' '}
                      <span className="text-gray-900 dark:text-white">
                        {duplicateCustomer.category === 'studio' ? 'אולפן' : 'מוזיקן'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">סטטוס:</span>{' '}
                      <span className="text-gray-900 dark:text-white">
                        {duplicateCustomer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </div>
                    {duplicateCustomer.interests && duplicateCustomer.interests.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">תחומי עניין:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {duplicateCustomer.interests.map((interest) => (
                            <span key={interest.id || interest} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs">
                              {interest.name || availableInterests.find(i => i.id === interest)?.name || interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {duplicateCustomer.notes && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">הערות:</span>{' '}
                        <p className="text-gray-900 dark:text-white mt-1">{duplicateCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* New Customer */}
                <div className="border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    לקוח חדש (לשמירה)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">שם:</span>{' '}
                      <span className="text-gray-900 dark:text-white">{formData.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">טלפון:</span>{' '}
                      <span className="text-gray-900 dark:text-white">{formData.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">אימייל:</span>{' '}
                      <span className="text-gray-900 dark:text-white">{formData.email || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">קטגוריה:</span>{' '}
                      <span className="text-gray-900 dark:text-white">
                        {formData.category === 'studio' ? 'אולפן' : 'מוזיקן'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">סטטוס:</span>{' '}
                      <span className="text-gray-900 dark:text-white">
                        {formData.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </div>
                    {formData.interests && formData.interests.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">תחומי עניין:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.interests.map((interestId) => (
                            <span key={interestId} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs">
                              {availableInterests.find(i => i.id === interestId)?.name || interestId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.notes && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">הערות:</span>{' '}
                        <p className="text-gray-900 dark:text-white mt-1">{formData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => handleDuplicateAction('save-both')}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  שמור את שני הלקוחות (צור רשומה חדשה)
                </button>
                <button
                  onClick={() => handleDuplicateAction('update-existing')}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  עדכן את הלקוח הקיים (החלף פרטים)
                </button>
                <button
                  onClick={() => handleDuplicateAction('cancel')}
                  className="w-full px-4 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
