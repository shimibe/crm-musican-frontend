import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Plus, Search, Edit, Trash2, Download, Send, ClipboardList, GitMerge, ChevronDown, BarChart2, RotateCw, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CampaignModal from '../components/customers/CampaignModal';
import CustomerMergeModal from '../components/customers/CustomerMergeModal';
import ColumnToggle from '../components/common/ColumnToggle';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CustomerTasksModal from '../components/customers/CustomerTasksModal';
import CustomerCreditsModal from '../components/customers/CustomerCreditsModal';

const Customers = () => {
  const { user, updatePreferences } = useAuth();
  const [customers, setCustomers] = useState(/** @type {any[]} */([]));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [interestFilters, setInterestFilters] = useState(/** @type {string[]} */([]));
  const [interestExcludeFilters, setInterestExcludeFilters] = useState(/** @type {string[]} */([]));
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  const [showExcludeDropdown, setShowExcludeDropdown] = useState(false);
  const [availableInterests, setAvailableInterests] = useState(/** @type {any[]} */([]));
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState(/** @type {any[]} */([]));
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [mergeCustomers, setMergeCustomers] = useState(/** @type {any[]|null} */(null));
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedCustomerForTasks, setSelectedCustomerForTasks] = useState(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedCustomerForCredits, setSelectedCustomerForCredits] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [exportInternational, setExportInternational] = useState(false);
  const [showInterestStats, setShowInterestStats] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showBulkInterestPicker, setShowBulkInterestPicker] = useState(false);
  const [bulkInterestAction, setBulkInterestAction] = useState(/** @type {'add'|'remove'|null} */(null));
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: 'active',
    category: 'musician',
    notes: '',
    interests: [],
  });

  // Column visibility state - load from user preferences
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultColumns = {
      name: true,
      phone: true,
      email: true,
      category: true,
      interests: true,
      status: true,
    };
    return user?.preferences?.customers_visible_columns || defaultColumns;
  });

  const columnDefinitions = [
    { key: 'name', label: 'שם' },
    { key: 'phone', label: 'טלפון' },
    { key: 'email', label: 'אימייל' },
    { key: 'category', label: 'קטגוריה' },
    { key: 'interests', label: 'תחומי עניין' },
    { key: 'status', label: 'סטטוס' },
  ];

  const toggleColumn = async (columnKey) => {
    const newColumns = {
      ...visibleColumns,
      [columnKey]: !visibleColumns[columnKey],
    };
    setVisibleColumns(newColumns);

    // Save to server and update context
    const newPreferences = {
      ...(user.preferences || {}),
      customers_visible_columns: newColumns,
    };
    await updatePreferences(newPreferences);
  };

  // Update visible columns when user preferences change
  useEffect(() => {
    if (user?.preferences?.customers_visible_columns) {
      setVisibleColumns(user.preferences.customers_visible_columns);
    }
  }, [user?.preferences?.customers_visible_columns]);

  const interestDropdownRef = useRef(/** @type {HTMLDivElement|null} */(null));
  const excludeDropdownRef = useRef(/** @type {HTMLDivElement|null} */(null));
  const actionsDropdownRef = useRef(/** @type {HTMLDivElement|null} */(null));

  useEffect(() => {
    const handleClickOutside = (/** @type {MouseEvent} */ e) => {
      if (interestDropdownRef.current && !interestDropdownRef.current.contains(/** @type {Node} */(e.target))) {
        setShowInterestDropdown(false);
      }
      if (excludeDropdownRef.current && !excludeDropdownRef.current.contains(/** @type {Node} */(e.target))) {
        setShowExcludeDropdown(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(/** @type {Node} */(e.target))) {
        setShowActionsDropdown(false);
        setShowBulkInterestPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadCustomers();
    loadInterests();
  }, [search]);

  const loadCustomers = async () => {
    try {
      const params = { search, limit: 10000 };
      const response = await api.get('/customers', { params });
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    if (categoryFilter !== 'all' && customer.category !== categoryFilter) return false;
    if (interestFilters.length > 0) {
      const hasAny = (customer.interests || []).some(
        (i) => interestFilters.includes(String(i.id ?? i))
      );
      if (!hasAny) return false;
    }
    if (interestExcludeFilters.length > 0) {
      const hasExcluded = (customer.interests || []).some(
        (i) => interestExcludeFilters.includes(String(i.id ?? i))
      );
      if (hasExcluded) return false;
    }
    return true;
  });

  const interestStats = availableInterests
    .map(interest => ({
      id: interest.id,
      name: interest.name,
      count: customers.filter(c =>
        (c.interests || []).some((/** @type {any} */ i) => String(i.id ?? i) === String(interest.id))
      ).length,
    }))
    .sort((a, b) => b.count - a.count);

  const refreshStats = async () => {
    setStatsLoading(true);
    await loadCustomers();
    setStatsLoading(false);
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

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'מחיקת לקוח',
      message: 'האם אתה בטוח שברצונך למחוק לקוח זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/customers/${id}`);
          setConfirmDialog(null);
          loadCustomers();
        } catch (error) {
          console.error('Error deleting customer:', error);
          alert('שגיאה במחיקת לקוח');
        }
      },
    });
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
      interests: (customer.interests || []).map(i => typeof i === 'object' ? i.id : i),
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
    const headers = ['שם', 'שם פרטי', 'שם משפחה', 'טלפון', 'אימייל', 'קטגוריה', 'תחומי עניין', 'סטטוס', 'הערות'];

    // Prepare CSV rows
    const rows = filteredCustomers.map(customer => {
      const interests = customer.interests && customer.interests.length > 0
        ? customer.interests.map(i => i.name || availableInterests.find(ai => ai.id === i)?.name || i).join('; ')
        : '';

      const nameParts = (customer.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');

      return [
        customer.name,
        firstName,
        lastName,
        (() => {
          const cleaned = customer.phone?.replace(/\s|-/g, '') || '';
          if (exportInternational && cleaned.startsWith('0')) return '+972' + cleaned.slice(1);
          return cleaned;
        })(),
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

  const toggleCustomerSelection = (customer) => {
    setSelectedCustomers(prev => {
      const isSelected = prev.find(c => c.id === customer.id);
      if (isSelected) {
        return prev.filter(c => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const toggleAllCustomers = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers([...filteredCustomers]);
    }
  };

  const selectByInterest = () => {
    if (interestFilters.length === 0) {
      alert('אנא בחר תחום עניין מהרשימה');
      return;
    }
    setSelectedCustomers([...filteredCustomers]);
  };

  const toggleInterestFilter = (/** @type {any} */ id) => {
    const sid = String(id);
    setInterestFilters(prev => prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]);
  };

  const toggleExcludeFilter = (/** @type {any} */ id) => {
    const sid = String(id);
    setInterestExcludeFilters(prev => prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]);
  };

  const handleOpenCampaign = () => {
    if (selectedCustomers.length === 0) {
      alert('אנא בחר לפחות לקוח אחד');
      return;
    }
    setShowCampaignModal(true);
  };

  const handleCloseCampaign = () => {
    setShowCampaignModal(false);
    setSelectedCustomers([]);
  };

  const handleBulkAddInterest = async (/** @type {any} */ interestId) => {
    try {
      await api.post('/customers/bulk-interests', {
        customer_ids: selectedCustomers.map(c => c.id),
        interest_id: interestId,
        action: 'add',
      });
      setShowBulkInterestPicker(false);
      setShowActionsDropdown(false);
      loadCustomers();
    } catch (error) {
      console.error('Error adding interest:', error);
      alert('שגיאה בהוספת תחום עניין');
    }
  };

  const handleBulkRemoveInterest = async (/** @type {any} */ interestId) => {
    try {
      await api.post('/customers/bulk-interests', {
        customer_ids: selectedCustomers.map(c => c.id),
        interest_id: interestId,
        action: 'remove',
      });
      setShowBulkInterestPicker(false);
      setShowActionsDropdown(false);
      loadCustomers();
    } catch (error) {
      console.error('Error removing interest:', error);
      alert('שגיאה בהסרת תחום עניין');
    }
  };

  const handleBulkDelete = () => {
    setShowActionsDropdown(false);
    /** @type {any} */
    const dialog = {
      title: 'מחיקת לקוחות',
      message: `האם אתה בטוח שברצונך למחוק ${selectedCustomers.length} לקוחות?`,
      onConfirm: async () => {
        try {
          await api.post('/customers/bulk-delete', {
            customer_ids: selectedCustomers.map(c => c.id),
          });
          setConfirmDialog(null);
          setSelectedCustomers([]);
          loadCustomers();
        } catch (error) {
          console.error('Error deleting customers:', error);
          alert('שגיאה במחיקת לקוחות');
        }
      },
    };
    setConfirmDialog(dialog);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ניהול לקוחות
        </h1>
        <div className="flex gap-2">
          {selectedCustomers.length > 0 && (
            <div className="relative" ref={actionsDropdownRef}>
              <button
                onClick={() => { setShowActionsDropdown(prev => !prev); setShowBulkInterestPicker(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500"
              >
                פעולות ({selectedCustomers.length})
                <ChevronDown className="w-4 h-4" />
              </button>
              {showActionsDropdown && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                  <button
                    onClick={() => { setShowActionsDropdown(false); handleOpenCampaign(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Send className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    שלח קמפיין
                  </button>
                  <button
                    onClick={() => { setBulkInterestAction('add'); setShowBulkInterestPicker(true); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Tag className="w-4 h-4 text-green-600 flex-shrink-0" />
                    הוספת תחום עניין
                  </button>
                  <button
                    onClick={() => { setBulkInterestAction('remove'); setShowBulkInterestPicker(true); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Tag className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    הסרת תחום עניין
                  </button>
                  {selectedCustomers.length === 2 && (
                    <button
                      onClick={() => { setShowActionsDropdown(false); setMergeCustomers([selectedCustomers[0], selectedCustomers[1]]); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <GitMerge className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      מזג לקוחות
                    </button>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleBulkDelete}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                      מחיקת לקוחות
                    </button>
                  </div>
                  {showBulkInterestPicker && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                        {bulkInterestAction === 'add' ? 'בחר תחום עניין להוספה:' : 'בחר תחום עניין להסרה:'}
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {availableInterests.map(interest => (
                          <button
                            key={interest.id}
                            onClick={() => bulkInterestAction === 'add'
                              ? handleBulkAddInterest(interest.id)
                              : handleBulkRemoveInterest(interest.id)
                            }
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            {interest.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={exportInternational}
                  onChange={(e) => setExportInternational(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                פורמט בינלאומי
              </label>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                title="ייצוא לקובץ CSV"
              >
                <Download className="w-4 h-4" />
                ייצוא CSV
              </button>
            </div>
          )}
          <ColumnToggle
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
          />
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

        {/* Interest Filters */}
        <div className="flex gap-4 items-start flex-wrap justify-between">
          <div className="flex gap-3 items-start flex-wrap">
            {/* Positive filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">תחומי עניין:</label>
              <div className="relative" ref={interestDropdownRef}>
                <button
                  type="button"
                  onClick={() => { setShowInterestDropdown(v => !v); setShowExcludeDropdown(false); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[150px] justify-between ${
                    interestFilters.length > 0
                      ? 'border-purple-500 ring-1 ring-purple-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <span>
                    {interestFilters.length === 0
                      ? 'כל התחומים'
                      : `${interestFilters.length} נבחרו`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {showInterestDropdown && (
                  <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                    {availableInterests.map((interest) => (
                      <label
                        key={interest.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={interestFilters.includes(String(interest.id))}
                          onChange={() => toggleInterestFilter(interest.id)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{interest.name}</span>
                      </label>
                    ))}
                    {interestFilters.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-600 p-2">
                        <button
                          onClick={() => setInterestFilters([])}
                          className="w-full text-xs text-red-600 dark:text-red-400 hover:underline text-right"
                        >
                          נקה בחירה
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Negative filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">ללא תחומי עניין:</label>
              <div className="relative" ref={excludeDropdownRef}>
                <button
                  type="button"
                  onClick={() => { setShowExcludeDropdown(v => !v); setShowInterestDropdown(false); }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[150px] justify-between ${
                    interestExcludeFilters.length > 0
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <span>
                    {interestExcludeFilters.length === 0
                      ? 'ללא סינון שלילי'
                      : `${interestExcludeFilters.length} להוציא`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {showExcludeDropdown && (
                  <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                    {availableInterests.map((interest) => (
                      <label
                        key={interest.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={interestExcludeFilters.includes(String(interest.id))}
                          onChange={() => toggleExcludeFilter(interest.id)}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{interest.name}</span>
                      </label>
                    ))}
                    {interestExcludeFilters.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-600 p-2">
                        <button
                          onClick={() => setInterestExcludeFilters([])}
                          className="w-full text-xs text-red-600 dark:text-red-400 hover:underline text-right"
                        >
                          נקה בחירה
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {interestFilters.length > 0 && (
              <button
                onClick={selectByInterest}
                className="px-3 py-2 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                בחר הכל המסוננים
              </button>
            )}
          </div>

          {selectedCustomers.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              נבחרו {selectedCustomers.length} לקוחות
              <button
                onClick={() => setSelectedCustomers([])}
                className="mr-2 text-red-600 dark:text-red-400 hover:underline"
              >
                נקה בחירה
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interest Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          type="button"
          onClick={() => setShowInterestStats(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            סטטיסטיקת תחומי עניין
            <span className="text-xs text-gray-400">({customers.length} לקוחות סה״כ)</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showInterestStats ? 'rotate-180' : ''}`} />
        </button>

        {showInterestStats && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 pb-4 pt-3">
            <div className="flex justify-end mb-3">
              <button
                onClick={refreshStats}
                disabled={statsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                רענן
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {interestStats.map(stat => {
                const isActive = interestFilters.includes(String(stat.id));
                return (
                  <button
                    key={stat.id}
                    type="button"
                    onClick={() => toggleInterestFilter(stat.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-right transition-colors ${
                      isActive
                        ? 'bg-purple-100 dark:bg-purple-900/40 ring-1 ring-purple-500'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className={`text-sm truncate ml-2 ${isActive ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>{stat.name}</span>
                    <span className={`text-sm font-semibold flex-shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-primary-600 dark:text-primary-400'}`}>{stat.count}</span>
                  </button>
                );
              })}
              {interestStats.length === 0 && (
                <p className="text-sm text-gray-400 col-span-full">אין תחומי עניין</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            טוען...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            לא נמצאו לקוחות
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-12">
                    <input
                      type="checkbox"
                      checked={filteredCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length}
                      onChange={toggleAllCustomers}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      title="בחר הכל"
                    />
                  </th>
                  {visibleColumns.name && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      שם
                    </th>
                  )}
                  {visibleColumns.phone && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      טלפון
                    </th>
                  )}
                  {visibleColumns.email && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      אימייל
                    </th>
                  )}
                  {visibleColumns.category && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      קטגוריה
                    </th>
                  )}
                  {visibleColumns.interests && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      תחומי עניין
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      סטטוס
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.some(c => c.id === customer.id)}
                        onChange={() => toggleCustomerSelection(customer)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {visibleColumns.name && (
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline"
                        onClick={() => handleEdit(customer)}
                      >
                        {customer.name}
                      </td>
                    )}
                    {visibleColumns.phone && (
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
                    )}
                    {visibleColumns.email && (
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
                    )}
                    {visibleColumns.category && (
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
                    )}
                    {visibleColumns.interests && (
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
                    )}
                    {visibleColumns.status && (
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
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerForTasks(customer);
                            setShowTasksModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="משימות"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerForCredits(customer);
                            setShowCreditsModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 dark:text-green-400"
                          title="זיכויים"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
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

      {/* Merge Modal */}
      {mergeCustomers && (
        <CustomerMergeModal
          customers={mergeCustomers}
          onClose={() => setMergeCustomers(null)}
          onMerged={() => {
            setMergeCustomers(null);
            setSelectedCustomers([]);
            loadCustomers();
          }}
        />
      )}

      {/* Campaign Modal */}
      <CampaignModal
        show={showCampaignModal}
        onClose={handleCloseCampaign}
        selectedCustomers={selectedCustomers}
      />

      {/* Customer Tasks Modal */}
      <CustomerTasksModal
        show={showTasksModal}
        onClose={() => {
          setShowTasksModal(false);
          setSelectedCustomerForTasks(null);
        }}
        customer={selectedCustomerForTasks}
      />

      {/* Customer Credits Modal */}
      <CustomerCreditsModal
        show={showCreditsModal}
        onClose={() => {
          setShowCreditsModal(false);
          setSelectedCustomerForCredits(null);
        }}
        customer={selectedCustomerForCredits}
      />
      {confirmDialog && (
        <ConfirmDialog
          {...confirmDialog}
          confirmLabel="מחק"
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default Customers;
