import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Edit2, Trash2, Mail, MessageSquare, X } from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CampaignTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' // 'email' או 'whatsapp'
  });
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/campaign-templates');
      console.log('Templates response:', response.data);

      // וודא שזה מערך
      const templatesData = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data.templates) ? response.data.templates : []);

      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      alert('שגיאה בטעינת תבניות');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData({ name: '', type: 'email' });
    setShowModal(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type
    });
    setShowModal(true);
  };

  const handleDelete = (template) => {
    setConfirmDialog({
      title: 'מחיקת תבנית',
      message: `האם אתה בטוח שברצונך למחוק את התבנית "${template.name}"?`,
      onConfirm: async () => {
        try {
          await api.delete(`/campaign-templates/${template.id}`);
          setConfirmDialog(null);
          loadTemplates();
        } catch (error) {
          console.error('Error deleting template:', error);
          alert('שגיאה במחיקת תבנית');
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('שם התבנית הוא שדה חובה');
      return;
    }

    try {
      if (editingTemplate) {
        // עריכה
        await api.put(`/campaign-templates/${editingTemplate.id}`, formData);
        alert('התבנית עודכנה בהצלחה');
      } else {
        // הוספה
        await api.post('/campaign-templates', formData);
        alert('התבנית נוספה בהצלחה');
      }

      setShowModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('שגיאה בשמירת תבנית');
    }
  };

  // וודא שtemplates הוא מערך לפני filter
  const emailTemplates = Array.isArray(templates) ? templates.filter(t => t.type === 'email') : [];
  const whatsappTemplates = Array.isArray(templates) ? templates.filter(t => t.type === 'whatsapp') : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ניהול תבניות קמפיינים
        </h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          תבנית חדשה
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          טוען...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Templates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  תבניות אימייל
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({emailTemplates.length})
                </span>
              </div>
            </div>
            <div className="p-4">
              {emailTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  אין תבניות אימייל
                </p>
              ) : (
                <div className="space-y-2">
                  {emailTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">
                        {template.name}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="ערוך"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Templates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  תבניות וואטסאפ
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({whatsappTemplates.length})
                </span>
              </div>
            </div>
            <div className="p-4">
              {whatsappTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  אין תבניות וואטסאפ
                </p>
              ) : (
                <div className="space-y-2">
                  {whatsappTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">
                        {template.name}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="ערוך"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    שם התבנית
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="לדוגמה: הזמנה לאירוע"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    סוג התבנית
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="email"
                        checked={formData.type === 'email'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-gray-900 dark:text-white">אימייל</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="whatsapp"
                        checked={formData.type === 'whatsapp'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-4 h-4 text-primary-600"
                      />
                      <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-gray-900 dark:text-white">וואטסאפ</span>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>שים לב:</strong> שם התבנית צריך להתאים לשם התבנית ב-SendPulse בדיוק.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingTemplate ? 'עדכן' : 'הוסף'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
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

export default CampaignTemplates;
