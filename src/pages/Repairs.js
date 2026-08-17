import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, X, Clock, MessageSquare } from 'lucide-react';
import { FaWrench } from 'react-icons/fa';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';

const COLOR_MAP = {
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const getStatusColor = (colorKey) => COLOR_MAP[colorKey] || COLOR_MAP.gray;

const ACTION_LABELS = {
  created: 'נפתח',
  status_change: 'שינוי סטטוס',
  assigned: 'הוקצה ל',
  note: 'הערה',
};

const Repairs = () => {
  const { isAdmin } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [repairStatuses, setRepairStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterMine, setFilterMine] = useState(false);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [repairDetail, setRepairDetail] = useState(null); // repair with history
  const [form, setForm] = useState({
    type_id: '',
    customer_id: '',
    details: '',
    status_id: '',
    assigned_to: '',
  });

  // Customer search
  const [customers, setCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Inline detail editing
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');

  // History note input
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const searchTimeout = useRef(null);

  useEffect(() => {
    loadRepairTypes();
    loadRepairStatuses();
    loadUsers();
    loadCustomers();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadRepairs();
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [filterStatus, filterType, filterAssigned, filterMine, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRepairs = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type_id = filterType;
      if (filterAssigned) params.assigned_to = filterAssigned;
      if (filterMine) params.mine = 'true';
      if (search) params.search = search;
      params.limit = 200;

      const response = await api.get('/repairs', { params });
      setRepairs(response.data.repairs || []);
    } catch (error) {
      console.error('Error loading repairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepairTypes = async () => {
    try {
      const response = await api.get('/repair-types');
      setRepairTypes(response.data || []);
    } catch (error) {
      console.error('Error loading repair types:', error);
    }
  };

  const loadRepairStatuses = async () => {
    try {
      const response = await api.get('/repair-statuses');
      setRepairStatuses(response.data || []);
    } catch (error) {
      console.error('Error loading repair statuses:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers', { params: { limit: 500 } });
      setCustomers(response.data.customers || response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const getFilteredCustomers = () => {
    if (!customerSearchTerm.trim()) return [];
    const lower = customerSearchTerm.toLowerCase();
    return customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(lower)) ||
      (c.phone && c.phone.toLowerCase().includes(lower))
    ).slice(0, 20);
  };

  const handleQuickUpdate = async (repairId, field, value) => {
    try {
      await api.put(`/repairs/${repairId}`, { [field]: value || null });
      loadRepairs();
    } catch (error) {
      console.error('Error updating repair:', error);
    }
  };

  const saveInlineDetail = async (repairId) => {
    await handleQuickUpdate(repairId, 'details', inlineEditValue);
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const openCreate = () => {
    setEditingRepair(null);
    setRepairDetail(null);
    setForm({ type_id: '', customer_id: '', details: '', status_id: repairStatuses[0]?.id || '', assigned_to: '' });
    setCustomerSearchTerm('');
    setNoteInput('');
    setShowModal(true);
  };

  const openEdit = async (repair) => {
    setEditingRepair(repair);
    setForm({
      type_id: repair.type_id || '',
      customer_id: repair.customer_id || '',
      details: repair.details || '',
      status_id: repair.status_id || '',
      assigned_to: repair.assigned_to || '',
    });
    setCustomerSearchTerm(repair.customer_name || '');
    setNoteInput('');

    // Load full repair with history
    try {
      const response = await api.get(`/repairs/${repair.id}`);
      setRepairDetail(response.data);
    } catch (error) {
      console.error('Error loading repair detail:', error);
      setRepairDetail(repair);
    }

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type_id: form.type_id || null,
        customer_id: form.customer_id || null,
        details: form.details || null,
        status_id: form.status_id || null,
        assigned_to: form.assigned_to || null,
      };

      if (editingRepair) {
        await api.put(`/repairs/${editingRepair.id}`, payload);
      } else {
        await api.post('/repairs', payload);
      }

      setShowModal(false);
      setEditingRepair(null);
      loadRepairs();
    } catch (error) {
      console.error('Error saving repair:', error);
      alert('שגיאה בשמירת הבקשה');
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim() || !editingRepair) return;
    setAddingNote(true);
    try {
      await api.post(`/repairs/${editingRepair.id}/history`, { notes: noteInput });
      setNoteInput('');
      // Reload history
      const response = await api.get(`/repairs/${editingRepair.id}`);
      setRepairDetail(response.data);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('שגיאה בהוספת הערה');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      title: 'מחיקת בקשת תיקון',
      message: 'האם אתה בטוח שברצונך למחוק בקשת תיקון זו?',
      onConfirm: async () => {
        try {
          await api.delete(`/repairs/${id}`);
          setConfirmDialog(null);
          loadRepairs();
        } catch (error) {
          console.error('Error deleting repair:', error);
          alert('שגיאה במחיקת הבקשה');
        }
      },
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaWrench className="w-6 h-6" />
            תיקונים
          </h1>
          <p className="text-gray-600 dark:text-gray-400">מעקב אחרי בקשות תיקון פתוחות</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          בקשה חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="חיפוש בפירוט..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-48"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">כל הסטטוסים</option>
            {repairStatuses.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">כל הסוגים</option>
            {repairTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">כל הנציגים</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterMine(!filterMine)}
            className={`px-3 py-2 text-sm rounded-md border transition ${
              filterMine
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            הבקשות שלי
          </button>

          {(filterStatus || filterType || filterAssigned || filterMine || search) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterType(''); setFilterAssigned(''); setFilterMine(false); setSearch(''); }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              נקה פילטרים
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            אין בקשות תיקון
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">סוג</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">פירוט</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">סטטוס</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ימים פתוח</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ימים מעדכון</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">לקוח</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">נציג</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">תאריך פתיחה</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {repairs.map((repair) => {
                const statusColorClass = getStatusColor(repair.status_color);
                return (
                  <tr
                    key={repair.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={(e) => {
                      if (e.target.closest('select, textarea, button, a')) return;
                      openEdit(repair);
                    }}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {repair.type_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); if (inlineEditId !== repair.id) { setInlineEditId(repair.id); setInlineEditValue(repair.details || ''); } }}
                    >
                      {inlineEditId === repair.id ? (
                        <textarea
                          autoFocus
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={() => saveInlineDetail(repair.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineDetail(repair.id); }
                            if (e.key === 'Escape') { setInlineEditId(null); }
                          }}
                          rows={2}
                          className="w-full px-2 py-1 text-sm border border-primary-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="line-clamp-2">{repair.details || <span className="text-gray-400 italic">לחץ לעריכה</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={repair.status_id || ''}
                        onChange={(e) => handleQuickUpdate(repair.id, 'status_id', e.target.value)}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer appearance-none ${statusColorClass}`}
                      >
                        {repairStatuses.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`font-semibold ${(repair.days_open || 0) > 7 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {repair.days_open ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`font-semibold ${(repair.days_since_status_update || 0) > 3 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {repair.days_since_status_update ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {repair.customer_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={repair.assigned_to || ''}
                        onChange={(e) => handleQuickUpdate(repair.id, 'assigned_to', e.target.value)}
                        className="bg-transparent border-0 text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-full"
                      >
                        <option value="">לא מוקצה</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(repair.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(repair)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          title="עריכה"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(repair.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                            title="מחיקה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>

            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-right align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingRepair ? 'עריכת בקשת תיקון' : 'בקשת תיקון חדשה'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        סוג משימה
                      </label>
                      <select
                        value={form.type_id}
                        onChange={(e) => setForm({ ...form, type_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">בחר סוג...</option>
                        {repairTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        סטטוס
                      </label>
                      <select
                        value={form.status_id}
                        onChange={(e) => setForm({ ...form, status_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">בחר סטטוס...</option>
                        {repairStatuses.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      פירוט
                    </label>
                    <textarea
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="תיאור הבעיה..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        הקצאה לנציג
                      </label>
                      <select
                        value={form.assigned_to}
                        onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">לא מוקצה</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        לקוח (אופציונלי)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="חפש לקוח לפי שם..."
                          value={customerSearchTerm}
                          onChange={(e) => {
                            setCustomerSearchTerm(e.target.value);
                            setForm({ ...form, customer_id: '' });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {customerSearchTerm && !form.customer_id && getFilteredCustomers().length > 0 && (
                          <div className="absolute z-20 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-auto mt-1">
                            {getFilteredCustomers().map((customer) => (
                              <div
                                key={customer.id}
                                onClick={() => {
                                  setForm({ ...form, customer_id: customer.id });
                                  setCustomerSearchTerm(customer.name);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                              >
                                {customer.name}
                                {customer.phone && <span className="text-gray-400 mr-2 text-xs">{customer.phone}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {customerSearchTerm && getFilteredCustomers().length === 0 && !form.customer_id && (
                          <div className="absolute z-20 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg mt-1">
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">לא נמצאו לקוחות</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      {editingRepair ? 'עדכון' : 'צור בקשה'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      ביטול
                    </button>
                  </div>
                </form>

                {/* History Panel — only when editing */}
                {editingRepair && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      היסטוריית טיפול
                    </h3>

                    {repairDetail?.history && repairDetail.history.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {repairDetail.history.map((entry) => (
                          <div key={entry.id} className="flex gap-2 text-sm">
                            <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {formatDateTime(entry.created_at)}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                              {entry.user_name || '—'}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {ACTION_LABELS[entry.action] || entry.action}
                              {entry.action === 'status_change' && entry.old_value && entry.new_value && (
                                <span> מ-<strong>{entry.old_value}</strong> ל-<strong>{entry.new_value}</strong></span>
                              )}
                              {entry.action === 'assigned' && entry.new_value && (
                                <span>: <strong>{entry.new_value}</strong></span>
                              )}
                              {entry.notes && (
                                <span className="mr-1 text-gray-600 dark:text-gray-400">— {entry.notes}</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mb-3">אין היסטוריה עדיין</p>
                    )}

                    {/* Add note */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="הוסף הערת טיפול..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteInput.trim() || addingNote}
                        className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default Repairs;
