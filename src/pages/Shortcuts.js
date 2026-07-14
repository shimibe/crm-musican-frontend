import React, { useState, useEffect } from 'react';
import { Link2, Plus, Edit, Trash2, Copy, Check, ExternalLink, Sliders, X } from 'lucide-react';
import api from '../utils/api';
import ConfirmDialog from '../components/common/ConfirmDialog';

const Shortcuts = () => {
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [selectedShortcut, setSelectedShortcut] = useState(null);
  const [variableValues, setVariableValues] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [copiedVariableUrl, setCopiedVariableUrl] = useState(false);
  const [shortcutForm, setShortcutForm] = useState({
    name: '',
    url: '',
    description: '',
    variables: [],
  });
  const [newVariable, setNewVariable] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Load shortcuts from server
  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    try {
      const response = await api.get('/shortcuts');
      setShortcuts(response.data);
    } catch (error) {
      console.error('Error loading shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShortcut = () => {
    setEditingShortcut(null);
    setShortcutForm({
      name: '',
      url: '',
      description: '',
      variables: [],
    });
    setShowModal(true);
  };

  const handleEditShortcut = (shortcut) => {
    setEditingShortcut(shortcut);
    setShortcutForm({
      name: shortcut.name,
      url: shortcut.url,
      description: shortcut.description || '',
      variables: shortcut.variables || [],
    });
    setShowModal(true);
  };

  const handleSaveShortcut = async (e) => {
    e.preventDefault();

    try {
      if (editingShortcut) {
        // Update existing shortcut
        await api.put(`/shortcuts/${editingShortcut.id}`, shortcutForm);
      } else {
        // Add new shortcut
        await api.post('/shortcuts', shortcutForm);
      }

      setShowModal(false);
      setEditingShortcut(null);
      loadShortcuts();
    } catch (error) {
      console.error('Error saving shortcut:', error);
      alert('שגיאה בשמירת הקיצור');
    }
  };

  const handleDeleteShortcut = (id) => {
    setConfirmDialog({
      title: 'מחיקת קיצור',
      message: 'האם אתה בטוח שברצונך למחוק קיצור זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/shortcuts/${id}`);
          setConfirmDialog(null);
          loadShortcuts();
        } catch (error) {
          console.error('Error deleting shortcut:', error);
          alert('שגיאה במחיקת הקיצור');
        }
      },
    });
  };

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addVariable = () => {
    if (newVariable.trim() && !shortcutForm.variables.includes(newVariable.trim())) {
      setShortcutForm({
        ...shortcutForm,
        variables: [...shortcutForm.variables, newVariable.trim()],
      });
      setNewVariable('');
    }
  };

  const removeVariable = (variable) => {
    setShortcutForm({
      ...shortcutForm,
      variables: shortcutForm.variables.filter(v => v !== variable),
    });
  };

  const handleShowVariables = (shortcut) => {
    setSelectedShortcut(shortcut);
    const initialValues = {};
    (shortcut.variables || []).forEach(v => {
      initialValues[v] = '';
    });
    setVariableValues(initialValues);
    setShowVariablesModal(true);
  };

  const buildUrlWithVariables = () => {
    if (!selectedShortcut) return '';

    let url = selectedShortcut.url;
    const params = new URLSearchParams();

    Object.entries(variableValues).forEach(([key, value]) => {
      if (value.trim()) {
        params.append(key, value.trim());
      }
    });

    const queryString = params.toString();
    if (queryString) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${queryString}`;
    }

    return url;
  };

  const copyUrlWithVariables = async () => {
    const url = buildUrlWithVariables();
    await navigator.clipboard.writeText(url);
    setCopiedVariableUrl(true);
    setTimeout(() => setCopiedVariableUrl(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-8 h-8" />
            קיצורים
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            נהל קיצורי דרך לקישורים שלך
          </p>
        </div>
        <button
          onClick={handleAddShortcut}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          קיצור חדש
        </button>
      </div>

      {/* Shortcuts Grid */}
      {shortcuts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3"
            >
              {/* Title and Actions */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {shortcut.name}
                  </h3>
                  {shortcut.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {shortcut.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleEditShortcut(shortcut)}
                    className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteShortcut(shortcut.id)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* URL */}
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs font-mono break-all text-gray-600 dark:text-gray-300">
                {shortcut.url}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <a
                  href={shortcut.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  פתח
                </a>
                <button
                  onClick={() => copyToClipboard(shortcut.url, shortcut.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded ${
                    copiedId === shortcut.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {copiedId === shortcut.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      העתק
                    </>
                  )}
                </button>
                {shortcut.variables && shortcut.variables.length > 0 && (
                  <button
                    onClick={() => handleShowVariables(shortcut)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    <Sliders className="w-4 h-4" />
                    משתנים
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Link2 className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            אין קיצורים עדיין
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            התחל להוסיף קיצורי דרך לקישורים שאתה משתמש בהם לעיתים קרובות
          </p>
          <button
            onClick={handleAddShortcut}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            הוסף קיצור ראשון
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingShortcut ? 'עריכת קיצור' : 'קיצור חדש'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingShortcut(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveShortcut} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם הקיצור *
                </label>
                <input
                  type="text"
                  required
                  value={shortcutForm.name}
                  onChange={(e) => setShortcutForm({ ...shortcutForm, name: e.target.value })}
                  placeholder="למשל: פאנל ניהול"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  קישור *
                </label>
                <input
                  type="url"
                  required
                  value={shortcutForm.url}
                  onChange={(e) => setShortcutForm({ ...shortcutForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={shortcutForm.description}
                  onChange={(e) => setShortcutForm({ ...shortcutForm, description: e.target.value })}
                  placeholder="תיאור קצר של הקישור"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  משתנים (Query Parameters)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                    placeholder="שם המשתנה (למשל: userId)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addVariable}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    הוסף
                  </button>
                </div>
                {shortcutForm.variables.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {shortcutForm.variables.map((variable) => (
                      <span
                        key={variable}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm"
                      >
                        {variable}
                        <button
                          type="button"
                          onClick={() => removeVariable(variable)}
                          className="hover:text-purple-900 dark:hover:text-purple-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  onClick={() => {
                    setShowModal(false);
                    setEditingShortcut(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variables Modal */}
      {showVariablesModal && selectedShortcut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                הוספת משתנים לקישור
              </h2>
              <button
                onClick={() => {
                  setShowVariablesModal(false);
                  setSelectedShortcut(null);
                  setCopiedVariableUrl(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {selectedShortcut.name}
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs font-mono break-all text-gray-600 dark:text-gray-300 mb-4">
                  {selectedShortcut.url}
                </div>
              </div>

              {(selectedShortcut.variables || []).map((variable) => (
                <div key={variable}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {variable}
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => setVariableValues({ ...variableValues, [variable]: e.target.value })}
                    placeholder={`ערך ל-${variable}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}

              {Object.values(variableValues).some(v => v.trim()) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-2 font-medium">
                    קישור עם משתנים:
                  </p>
                  <p className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
                    {buildUrlWithVariables()}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={copyUrlWithVariables}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md ${
                    copiedVariableUrl
                      ? 'bg-green-600 text-white'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {copiedVariableUrl ? (
                    <>
                      <Check className="w-4 h-4" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      העתק קישור
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowVariablesModal(false);
                    setSelectedShortcut(null);
                    setCopiedVariableUrl(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

export default Shortcuts;
