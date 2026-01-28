import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { X, Plus, Trash2, Edit2, Save } from 'lucide-react';

const ProgressModal = ({ show, onClose, task }) => {
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    update_date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({ title: '', update_date: '' });

  useEffect(() => {
    if (show && task) {
      loadProgressUpdates();
    }
  }, [show, task]);

  const loadProgressUpdates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${task.id}/progress`);
      setProgressUpdates(response.data);
    } catch (error) {
      console.error('Error loading progress updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate.title.trim()) return;

    try {
      await api.post(`/tasks/${task.id}/progress`, newUpdate);
      setNewUpdate({
        title: '',
        update_date: new Date().toISOString().split('T')[0]
      });
      loadProgressUpdates();
    } catch (error) {
      console.error('Error adding progress update:', error);
      alert('שגיאה בהוספת התקדמות');
    }
  };

  const handleEdit = (update) => {
    setEditingId(update.id);
    setEditingData({
      title: update.title,
      update_date: update.update_date.split('T')[0]
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await api.put(`/tasks/${task.id}/progress/${id}`, editingData);
      setEditingId(null);
      loadProgressUpdates();
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('שגיאה בעדכון התקדמות');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק התקדמות זו?')) return;

    try {
      await api.delete(`/tasks/${task.id}/progress/${id}`);
      loadProgressUpdates();
    } catch (error) {
      console.error('Error deleting progress update:', error);
      alert('שגיאה במחיקת התקדמות');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              התקדמות טיפול - {task?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Agent Note Section */}
          {task?.agent_note && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                💬 הערת נציג {task.agent_note_author && `(${task.agent_note_author})`}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {task.agent_note}
              </p>
            </div>
          )}

          {/* Add New Progress Update */}
          <form onSubmit={handleAddUpdate} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              הוסף התקדמות חדשה
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  כותרת *
                </label>
                <input
                  type="text"
                  required
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                  placeholder="תיאור קצר של ההתקדמות..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תאריך
                </label>
                <input
                  type="date"
                  value={newUpdate.update_date}
                  onChange={(e) => setNewUpdate({ ...newUpdate, update_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף התקדמות
            </button>
          </form>

          {/* Progress Updates List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              היסטוריית התקדמות ({progressUpdates.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                טוען...
              </div>
            ) : progressUpdates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                אין עדיין עדכוני התקדמות
              </div>
            ) : (
              <div className="space-y-2">
                {progressUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    {editingId === update.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={editingData.title}
                              onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={editingData.update_date}
                              onChange={(e) => setEditingData({ ...editingData, update_date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(update.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 text-sm"
                          >
                            <Save className="w-3 h-3" />
                            שמור
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                              {formatDate(update.update_date)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {update.created_by_name}
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-white">
                            {update.title}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(update)}
                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(update.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;
