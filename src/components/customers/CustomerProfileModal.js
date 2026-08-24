import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, Edit2, Check, Plus } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const SERVICE_LEVEL_MAP = {
  none:       { label: 'ללא',     cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  subscriber: { label: 'מנוי',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  premium:    { label: 'פרימיום', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  vip:        { label: 'VIP',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
};

const REPAIR_COLOR = {
  red:    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  green:  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  gray:   'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const Spinner = () => (
  <div className="text-center py-8">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
  </div>
);

const CustomerProfileModal = ({ show, onClose, customer, defaultTab = 'summary' }) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Data
  const [tasks, setTasks] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [credits, setCredits] = useState([]);
  const [notes, setNotes] = useState([]);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [creditTypes, setCreditTypes] = useState([]);

  // Per-tab loading
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingRepairs, setLoadingRepairs] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Edit form
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Credits sub-state
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [creditForm, setCreditForm] = useState({ product_type_id: '', notes: '' });
  const [savingCredit, setSavingCredit] = useState(false);

  // Notes sub-state
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Sync active tab when defaultTab prop changes (e.g. clicking different buttons)
  useEffect(() => {
    if (show) setActiveTab(defaultTab);
  }, [show, defaultTab]);

  // Load all data when modal opens or customer changes
  useEffect(() => {
    if (!show || !customer?.id) return;

    // Reset state
    setTasks([]); setRepairs([]); setCredits([]); setNotes([]);
    setNoteInput(''); setShowAddCredit(false);
    setSaveError(''); setSaveSuccess(false);
    setCreditForm({ product_type_id: '', notes: '' });

    // Init edit form from customer prop
    setForm({
      name:          customer.name || '',
      phone:         customer.phone || '',
      email:         customer.email || '',
      category:      customer.category || 'musician',
      status:        customer.status || 'active',
      service_level: customer.service_level || 'none',
      notes:         customer.notes || '',
      interests:     (customer.interests || []).map(i => (typeof i === 'object' ? i.id : i)),
    });

    // Parallel loads
    setLoadingTasks(true); setLoadingRepairs(true);
    setLoadingCredits(true); setLoadingNotes(true);

    api.get('/tasks', { params: { customer_id: customer.id } })
      .then(r => setTasks(r.data.tasks || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));

    api.get('/repairs', { params: { customer_id: customer.id } })
      .then(r => setRepairs(r.data.repairs || []))
      .catch(() => {})
      .finally(() => setLoadingRepairs(false));

    api.get('/credits', { params: { customer_id: customer.id } })
      .then(r => setCredits(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingCredits(false));

    api.get(`/customers/${customer.id}/notes`)
      .then(r => setNotes(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingNotes(false));

    api.get('/interests').then(r => setAvailableInterests(r.data.interests || [])).catch(() => {});
    api.get('/credit-types').then(r => setCreditTypes(r.data || [])).catch(() => {});
  }, [show, customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed ──────────────────────────────────────────────────────────────

  const openTaskCount = tasks.filter(t => t.status !== 'closed').length;
  const openRepairCount = repairs.filter(r => r.status_color !== 'green').length;
  const activeCredits = credits.filter(c => !c.is_redeemed);
  const redeemedCredits = credits.filter(c => c.is_redeemed);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const fmtDateTime = (s) => s ? new Date(s).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  const svcLevel = SERVICE_LEVEL_MAP[customer?.service_level || 'none'] || SERVICE_LEVEL_MAP.none;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      await api.put(`/customers/${customer.id}`, form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (id) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter(i => i !== id)
        : [...f.interests, id],
    }));
  };

  const reloadCredits = async () => {
    const r = await api.get('/credits', { params: { customer_id: customer.id } });
    setCredits(r.data || []);
  };

  const handleRedeem = async (id) => {
    try { await api.patch(`/credits/${id}/redeem`); await reloadCredits(); }
    catch { alert('שגיאה במימוש הזיכוי'); }
  };

  const handleUnredeem = async (id) => {
    if (!isAdmin) return;
    try { await api.patch(`/credits/${id}/unredeem`); await reloadCredits(); }
    catch { alert('שגיאה בביטול המימוש'); }
  };

  const handleDeleteCredit = async (id) => {
    if (!isAdmin || !window.confirm('האם למחוק זיכוי זה?')) return;
    try { await api.delete(`/credits/${id}`); await reloadCredits(); }
    catch { alert('שגיאה במחיקת הזיכוי'); }
  };

  const handleAddCredit = async (e) => {
    e.preventDefault();
    if (!creditForm.product_type_id) return;
    setSavingCredit(true);
    try {
      await api.post('/credits', { customer_id: customer.id, product_type_id: creditForm.product_type_id, notes: creditForm.notes || null });
      setCreditForm({ product_type_id: '', notes: '' });
      setShowAddCredit(false);
      await reloadCredits();
    } catch { alert('שגיאה בהוספת זיכוי'); }
    finally { setSavingCredit(false); }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/customers/${customer.id}/notes`, { content: noteInput });
      setNoteInput('');
      const r = await api.get(`/customers/${customer.id}/notes`);
      setNotes(r.data || []);
    } catch { alert('שגיאה בהוספת הערה'); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/customers/${customer.id}/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch { alert('שגיאה במחיקת הערה'); }
  };

  // ── Early return ──────────────────────────────────────────────────────────

  if (!show || !customer) return null;

  const TABS = [
    { id: 'summary', label: 'סיכום' },
    { id: 'details', label: 'פרטים' },
    { id: 'tasks',   label: 'משימות',  badge: openTaskCount || null },
    { id: 'repairs', label: 'תיקונים', badge: openRepairCount || null },
    { id: 'credits', label: 'זיכויים', badge: activeCredits.length || null },
    { id: 'notes',   label: 'הערות',   badge: notes.length || null },
  ];

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative inline-block w-full max-w-3xl my-8 text-right align-middle bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</span>
              {(customer.service_level && customer.service_level !== 'none') && (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${svcLevel.cls}`}>
                  {svcLevel.label}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.badge ? (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="max-h-[65vh] overflow-y-auto">

            {/* ── סיכום ── */}
            {activeTab === 'summary' && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-5 gap-4">
                  {/* Contact info */}
                  <div className="col-span-3 space-y-2 text-sm">
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <a href={`sip:${customer.phone.replace(/\s|-/g, '')}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${customer.email}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                          {customer.email}
                        </a>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        customer.category === 'studio'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      }`}>
                        {customer.category === 'studio' ? 'אולפן' : 'מוזיקאי'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        customer.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {customer.status === 'active' ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="col-span-2 grid grid-cols-3 gap-2 text-center">
                    {[
                      { count: openTaskCount, label: 'משימות', color: 'blue', tab: 'tasks' },
                      { count: openRepairCount, label: 'תיקונים', color: 'orange', tab: 'repairs' },
                      { count: activeCredits.length, label: 'זיכויים', color: 'green', tab: 'credits' },
                    ].map(({ count, label, color, tab }) => (
                      <div
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`p-2 rounded-lg cursor-pointer transition bg-${color}-50 dark:bg-${color}-900/20 hover:bg-${color}-100 dark:hover:bg-${color}-900/40`}
                      >
                        <div className={`text-xl font-bold ${count > 0 ? `text-${color}-600 dark:text-${color}-400` : 'text-gray-400'}`}>
                          {count}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes preview */}
                {customer.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 line-clamp-3">
                    {customer.notes}
                  </p>
                )}

                {/* Interests */}
                {customer.interests && customer.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customer.interests.map(i => (
                      <span
                        key={typeof i === 'object' ? i.id : i}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                      >
                        {typeof i === 'object' ? i.name : i}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('details')}
                  className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  ערוך פרטים
                </button>
              </div>
            )}

            {/* ── פרטים ── */}
            {activeTab === 'details' && (
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'שם *', key: 'name', required: true, type: 'text' },
                    { label: 'טלפון', key: 'phone', type: 'text' },
                    { label: 'אימייל', key: 'email', type: 'email' },
                  ].map(({ label, key, required, type }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input
                        type={type}
                        required={required}
                        value={form[key] || ''}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">קטגוריה</label>
                    <select value={form.category || 'musician'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                      <option value="musician">מוזיקאי</option>
                      <option value="studio">אולפן</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סטטוס</label>
                    <select value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                      <option value="active">פעיל</option>
                      <option value="inactive">לא פעיל</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">רמת שירות</label>
                    <select value={form.service_level || 'none'} onChange={e => setForm(f => ({ ...f, service_level: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                      <option value="none">ללא</option>
                      <option value="subscriber">מנוי</option>
                      <option value="premium">פרימיום</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">הערות</label>
                  <textarea
                    value={form.notes || ''}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  />
                </div>

                {availableInterests.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">תחומי עניין</label>
                    <div className="flex flex-wrap gap-3">
                      {availableInterests.map(i => (
                        <label key={i.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={form.interests?.includes(i.id) || false}
                            onChange={() => toggleInterest(i.id)}
                            className="w-3.5 h-3.5 rounded accent-primary-600"
                          />
                          {i.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50">
                    {saving ? 'שומר...' : 'שמור'}
                  </button>
                  {saveSuccess && (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" /> נשמר בהצלחה
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* ── משימות ── */}
            {activeTab === 'tasks' && (
              <div className="p-6">
                {loadingTasks ? <Spinner /> : tasks.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">אין משימות עבור לקוח זה</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} onClick={() => { window.location.href = `/tasks?edit=${task.id}`; }}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                            {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}>
                              {task.priority === 'high' ? 'גבוהה' : task.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                            </span>
                            <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                              task.status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              task.status === 'in_progress' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {task.status === 'open' ? 'פתוח' : task.status === 'in_progress' ? 'בטיפול' : 'סגור'}
                            </span>
                          </div>
                        </div>
                        {task.due_date && <p className="text-xs text-gray-400 mt-1">יעד: {fmtDate(task.due_date)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── תיקונים ── */}
            {activeTab === 'repairs' && (
              <div className="p-6">
                {loadingRepairs ? <Spinner /> : repairs.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">אין בקשות תיקון עבור לקוח זה</p>
                ) : (
                  <div className="space-y-2">
                    {repairs.map(repair => {
                      const colorCls = REPAIR_COLOR[repair.status_color] || REPAIR_COLOR.gray;
                      const isUrgent = (repair.days_open || 0) > 7;
                      return (
                        <div key={repair.id}
                          onClick={() => { window.location.href = '/repairs'; }}
                          className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition ${isUrgent ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{repair.type_name || '—'}</p>
                              {repair.details && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{repair.details}</p>}
                              {repair.assigned_to_name && <p className="text-xs text-gray-400 mt-0.5">נציג: {repair.assigned_to_name}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${colorCls}`}>{repair.status_name}</span>
                              {isUrgent && (
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{repair.days_open}י׳</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{fmtDate(repair.created_at)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── זיכויים ── */}
            {activeTab === 'credits' && (
              <div className="p-6 space-y-4">
                {loadingCredits ? <Spinner /> : (
                  <>
                    {activeCredits.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">פעילים</h3>
                        <div className="space-y-2">
                          {activeCredits.map(credit => (
                            <div key={credit.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{credit.product_type_name || '—'}</p>
                                {credit.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{credit.notes}</p>}
                                <p className="text-xs text-gray-400 mt-0.5">נוסף {fmtDate(credit.created_at)} ע"י {credit.created_by_name || '—'}</p>
                              </div>
                              <div className="flex gap-2 items-center mr-3">
                                <button onClick={() => handleRedeem(credit.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700">
                                  <Check className="w-3 h-3" /> ממש
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handleDeleteCredit(credit.id)} className="text-red-400 hover:text-red-600 text-base px-1" title="מחק">×</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {redeemedCredits.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">ממושים</h3>
                        <div className="space-y-2">
                          {redeemedCredits.map(credit => (
                            <div key={credit.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/40 opacity-70">
                              <div className="flex-1">
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-through">{credit.product_type_name || '—'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">מומש {fmtDate(credit.redeemed_at)} ע"י {credit.redeemed_by_name || '—'}</p>
                              </div>
                              {isAdmin && (
                                <button onClick={() => handleUnredeem(credit.id)}
                                  className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline mr-3">
                                  בטל מימוש
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {credits.length === 0 && (
                      <p className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">אין זיכויים עבור לקוח זה</p>
                    )}

                    {showAddCredit ? (
                      <form onSubmit={handleAddCredit} className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                        <select required value={creditForm.product_type_id}
                          onChange={e => setCreditForm(f => ({ ...f, product_type_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                          <option value="">בחר מוצר...</option>
                          {creditTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input type="text" placeholder="הערה (אופציונלי)" value={creditForm.notes}
                          onChange={e => setCreditForm(f => ({ ...f, notes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                        <div className="flex gap-2">
                          <button type="submit" disabled={savingCredit}
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50">הוסף</button>
                          <button type="button" onClick={() => setShowAddCredit(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm">ביטול</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setShowAddCredit(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700">
                        <Plus className="w-4 h-4" /> הוסף זיכוי
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── הערות ── */}
            {activeTab === 'notes' && (
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !addingNote && handleAddNote()}
                    placeholder="הוסף הערה..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button onClick={handleAddNote} disabled={!noteInput.trim() || addingNote}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm disabled:opacity-50">
                    הוסף
                  </button>
                </div>

                {loadingNotes ? <Spinner /> : notes.length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">אין הערות עדיין</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map(note => (
                      <div key={note.id} className="flex gap-3 group">
                        <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{note.user_name || '—'}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{fmtDateTime(note.created_at)}</span>
                              {isAdmin && (
                                <button onClick={() => handleDeleteNote(note.id)}
                                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-base leading-none"
                                  title="מחק הערה">×</button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileModal;
