import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Archive, ArchiveRestore, Trash2, Edit, X, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';

const BUDGET_TYPE_LABELS = { amount: 'סכום (₪)', hours: 'שעות' };
const EXCEED_ACTION_LABELS = { warn: 'אזהרה', block: 'חסימה' };

const BudgetBar = ({ project }) => {
  if (!project.budget_type || !project.budget_limit) return null;

  const used = project.budget_type === 'hours'
    ? parseFloat(project.hours_used || 0)
    : parseFloat(project.cost_used || 0);
  const limit = parseFloat(project.budget_limit);
  const pct = Math.min((used / limit) * 100, 100);

  const color = pct >= 100
    ? 'bg-red-500'
    : pct >= 80
      ? 'bg-yellow-400'
      : 'bg-green-500';

  const label = project.budget_type === 'hours'
    ? `${used.toFixed(1)} / ${limit} שע'`
    : `₪${used.toFixed(0)} / ₪${limit.toFixed(0)}`;

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>תקציב</span>
        <span>{label}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const BudgetWarning = ({ project }) => {
  if (!project.budget_type || !project.budget_limit || project.budget_exceed_action !== 'warn') return null;

  const used = project.budget_type === 'hours'
    ? parseFloat(project.hours_used || 0)
    : parseFloat(project.cost_used || 0);
  const limit = parseFloat(project.budget_limit);
  const pct = (used / limit) * 100;

  if (pct < 80) return null;

  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${pct >= 100 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
      <AlertTriangle className="w-3 h-3" />
      <span>{pct >= 100 ? 'חרג מהתקציב' : 'מתקרב למגבלת התקציב'}</span>
    </div>
  );
};

const defaultForm = {
  name: '',
  description: '',
  freelancer_id: '',
  budget_type: '',
  budget_limit: '',
  budget_exceed_action: 'warn',
  customer_id: '',
  show_customer_to_freelancer: false,
};

const FreelanceProjects = () => {
  const { user, isAdmin } = useAuth();
  const isFreelancer = user?.role === 'freelancer';

  const [projects, setProjects] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [filterFreelancer, setFilterFreelancer] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [canAddProjects, setCanAddProjects] = useState(true);

  // Customer search for admin
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearchTimeout, setCustomerSearchTimeout] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (showArchived) params.set('status', 'archived');
      if (isAdmin && filterFreelancer) params.set('freelancer_id', filterFreelancer);
      const res = await api.get(`/freelance-projects?${params}`);
      const all = res.data;
      if (!showArchived) {
        setProjects(all.filter(p => p.status === 'active'));
      } else {
        setProjects(all.filter(p => p.status === 'archived'));
      }
    } catch (err) {
      console.error('Load projects error', err);
    }
  }, [showArchived, filterFreelancer, isAdmin]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadProjects();
      if (isAdmin) {
        try {
          const usersRes = await api.get('/users');
          setFreelancers(usersRes.data.filter(u => u.role === 'freelancer'));
        } catch {}
      }
      if (isFreelancer) {
        // Check if this freelancer can add projects
        try {
          const meRes = await api.get(`/users/${user.id}`);
          setCanAddProjects(meRes.data.can_add_projects !== false);
        } catch {}
      }
      setLoading(false);
    };
    init();
  }, [isAdmin, isFreelancer, user, loadProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const searchCustomers = (val) => {
    setCustomerSearch(val);
    if (customerSearchTimeout) clearTimeout(customerSearchTimeout);
    if (!val.trim()) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/customers?search=${encodeURIComponent(val)}&limit=10`);
        setCustomerResults(res.data.customers || res.data || []);
      } catch {}
    }, 300);
    setCustomerSearchTimeout(t);
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm(defaultForm);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setForm({
      name: project.name || '',
      description: project.description || '',
      freelancer_id: project.freelancer_id || '',
      budget_type: project.budget_type || '',
      budget_limit: project.budget_limit || '',
      budget_exceed_action: project.budget_exceed_action || 'warn',
      customer_id: project.customer_id || '',
      show_customer_to_freelancer: project.show_customer_to_freelancer || false,
    });
    setCustomerSearch(project.customer_name || '');
    setCustomerResults([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        budget_type: form.budget_type || null,
        budget_limit: form.budget_limit ? parseFloat(form.budget_limit) : null,
        budget_exceed_action: form.budget_exceed_action,
      };
      if (isAdmin) {
        payload.freelancer_id = form.freelancer_id || null;
        payload.customer_id = form.customer_id || null;
        payload.show_customer_to_freelancer = form.show_customer_to_freelancer;
      }
      if (editingProject) {
        await api.patch(`/freelance-projects/${editingProject.id}`, payload);
      } else {
        await api.post('/freelance-projects', payload);
      }
      setShowModal(false);
      await loadProjects();
    } catch (err) {
      console.error('Save project error', err);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (project) => {
    try {
      await api.patch(`/freelance-projects/${project.id}/archive`);
      await loadProjects();
    } catch {}
  };

  const handleUnarchive = async (project) => {
    try {
      await api.patch(`/freelance-projects/${project.id}/unarchive`);
      await loadProjects();
    } catch {}
  };

  const handleDelete = async (project) => {
    setConfirmDialog({
      message: `האם למחוק את הפרויקט "${project.name}"?`,
      onConfirm: async () => {
        try {
          await api.delete(`/freelance-projects/${project.id}`);
          await loadProjects();
        } catch {}
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const grouped = isAdmin
    ? freelancers.reduce((acc, f) => {
        const fp = projects.filter(p => p.freelancer_id === f.id);
        if (fp.length > 0 || !filterFreelancer || filterFreelancer === f.id) {
          acc.push({ freelancer: f, projects: fp });
        }
        return acc;
      }, [])
    : [{ freelancer: null, projects }];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p>טוען פרויקטים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">פרויקטים</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'פרויקטים פעילים' : 'ארכיון'}
          </button>
          {(isAdmin || canAddProjects) && !showArchived && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
            >
              <Plus className="w-4 h-4" />
              פרויקט חדש
            </button>
          )}
        </div>
      </div>

      {/* Admin: freelancer filter */}
      {isAdmin && (
        <div className="mb-4">
          <select
            value={filterFreelancer}
            onChange={e => setFilterFreelancer(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">כל הפרילנסרים</option>
            {freelancers.map(f => (
              <option key={f.id} value={f.id}>{f.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Project cards */}
      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg">{showArchived ? 'אין פרויקטים בארכיון' : 'אין פרויקטים פעילים'}</p>
          {!showArchived && (isAdmin || canAddProjects) && (
            <button onClick={openCreate} className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm">
              צור פרויקט חדש
            </button>
          )}
        </div>
      ) : (
        grouped.map(({ freelancer, projects: fps }) => (
          <div key={freelancer?.id || 'mine'} className="mb-6">
            {isAdmin && freelancer && (
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                {freelancer.full_name}
              </h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fps.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdmin={isAdmin}
                  isFreelancer={isFreelancer}
                  showArchived={showArchived}
                  onEdit={openEdit}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingProject ? 'עריכת פרויקט' : 'פרויקט חדש'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם הפרויקט *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="שם הפרויקט"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תיאור</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  placeholder="תיאור קצר (אופציונלי)"
                />
              </div>

              {/* Admin fields */}
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">פרילנסר</label>
                    <select
                      value={form.freelancer_id}
                      onChange={e => setForm(f => ({ ...f, freelancer_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">בחר פרילנסר</option>
                      {freelancers.map(f => (
                        <option key={f.id} value={f.id}>{f.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סוג תקציב</label>
                      <select
                        value={form.budget_type}
                        onChange={e => setForm(f => ({ ...f, budget_type: e.target.value, budget_limit: '' }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">ללא מגבלה</option>
                        <option value="hours">שעות</option>
                        <option value="amount">סכום (₪)</option>
                      </select>
                    </div>
                    {form.budget_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          מגבלה {form.budget_type === 'hours' ? '(שע\')' : '(₪)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step={form.budget_type === 'hours' ? '0.5' : '1'}
                          value={form.budget_limit}
                          onChange={e => setForm(f => ({ ...f, budget_limit: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {form.budget_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">בחריגה מהתקציב</label>
                      <div className="flex gap-3">
                        {['warn', 'block'].map(action => (
                          <label key={action} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="exceed_action"
                              value={action}
                              checked={form.budget_exceed_action === action}
                              onChange={() => setForm(f => ({ ...f, budget_exceed_action: action }))}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{EXCEED_ACTION_LABELS[action]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer linking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">קישור לקוח (אופציונלי)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={e => searchCustomers(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="חפש לקוח..."
                      />
                      {form.customer_id && (
                        <button
                          type="button"
                          onClick={() => { setForm(f => ({ ...f, customer_id: '' })); setCustomerSearch(''); }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {customerResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {customerResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                              onClick={() => {
                                setForm(f => ({ ...f, customer_id: c.id }));
                                setCustomerSearch(c.name);
                                setCustomerResults([]);
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {form.customer_id && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.show_customer_to_freelancer}
                          onChange={e => setForm(f => ({ ...f, show_customer_to_freelancer: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">הצג פרטי לקוח לפרילנסר</span>
                      </label>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {saving ? 'שומר...' : editingProject ? 'שמור שינויים' : 'צור פרויקט'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
};

const ProjectCard = ({ project, isAdmin, isFreelancer, showArchived, onEdit, onArchive, onUnarchive, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const hoursUsed = parseFloat(project.hours_used || 0);
  const costUsed = parseFloat(project.cost_used || 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
          {isAdmin && project.freelancer_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.freelancer_name}</p>
          )}
          {project.customer_name && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{project.customer_name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!showArchived && (
            <button
              onClick={() => onEdit(project)}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
              title="עריכה"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {isAdmin && !showArchived && (
            <button
              onClick={() => onArchive(project)}
              className="p-1.5 text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 rounded"
              title="העבר לארכיון"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          {isAdmin && showArchived && (
            <>
              <button
                onClick={() => onUnarchive(project)}
                className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded"
                title="שחזר"
              >
                <ArchiveRestore className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(project)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                title="מחק"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{project.description}</p>
      )}

      <BudgetBar project={project} />
      <BudgetWarning project={project} />

      {/* Stats row */}
      <div className="flex gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{hoursUsed.toFixed(1)} שע'</span>
        {costUsed > 0 && <span>₪{costUsed.toFixed(0)}</span>}
        {project.budget_type && project.budget_limit && (
          <span className={`mr-auto px-1.5 py-0.5 rounded text-xs ${
            project.budget_exceed_action === 'block'
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
          }`}>
            {EXCEED_ACTION_LABELS[project.budget_exceed_action]}
          </span>
        )}
      </div>
    </div>
  );
};

export default FreelanceProjects;
