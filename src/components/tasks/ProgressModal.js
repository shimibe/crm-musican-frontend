import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { X, Plus, Trash2, Edit2, Save } from 'lucide-react';

const ProgressModal = ({ show, onClose, task }) => {
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    update_date: new Date().toISOString().split('T')[0]
  });
  const [editingProgressId, setEditingProgressId] = useState(null);
  const [editingProgressData, setEditingProgressData] = useState({ title: '', update_date: '' });
  const [editingAgentNote, setEditingAgentNote] = useState(false);
  const [agentNoteValue, setAgentNoteValue] = useState('');

  useEffect(() => {
    if (show && task) {
      loadProgressUpdates();
      setAgentNoteValue(task.agent_note || '');
      setEditingAgentNote(false);
      setShowAddForm(false);
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
      setShowAddForm(false);
      loadProgressUpdates();
    } catch (error) {
      console.error('Error adding progress update:', error);
      alert('שגיאה בהוספת התקדמות');
    }
  };

  const handleEditProgress = (update) => {
    setEditingProgressId(update.id);
    setEditingProgressData({
      title: update.title,
      update_date: update.update_date.split('T')[0]
    });
  };

  const handleSaveProgressEdit = async (id) => {
    try {
      await api.put(`/tasks/${task.id}/progress/${id}`, editingProgressData);
      setEditingProgressId(null);
      loadProgressUpdates();
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('שגיאה בעדכון התקדמות');
    }
  };

  const handleDeleteProgress = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק התקדמות זו?')) return;

    try {
      await api.delete(`/tasks/${task.id}/progress/${id}`);
      loadProgressUpdates();
    } catch (error) {
      console.error('Error deleting progress update:', error);
      alert('שגיאה במחיקת התקדמות');
    }
  };

  const handleSaveAgentNote = async () => {
    try {
      await api.put(`/tasks/${task.id}`, { agent_note: agentNoteValue });
      setEditingAgentNote(false);
      // Update the task object with the new note
      task.agent_note = agentNoteValue;
    } catch (error) {
      console.error('Error updating agent note:', error);
      alert('שגיאה בעדכון הערת נציג');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                💬 הערת נציג {task?.agent_note_author && !editingAgentNote && `(${task.agent_note_author})`}
              </h3>
              {!editingAgentNote ? (
                <button
                  onClick={() => setEditingAgentNote(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  title="ערוך הערת נציג"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAgentNote}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    שמור
                  </button>
                  <button
                    onClick={() => {
                      setEditingAgentNote(false);
                      setAgentNoteValue(task.agent_note || '');
                    }}
                    className="text-gray-600 hover:text-gray-700 dark:text-gray-400 text-sm"
                  >
                    ביטול
                  </button>
                </div>
              )}
            </div>
            {editingAgentNote ? (
              <textarea
                value={agentNoteValue}
                onChange={(e) => setAgentNoteValue(e.target.value)}
                rows={3}
                placeholder="הערה פנימית לנציגים..."
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {task?.agent_note || 'אין הערת נציג'}
              </p>
            )}
          </div>

          {/* Progress Updates Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                היסטוריית התקדמות ({progressUpdates.length})
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                title="הוסף התקדמות"
              >
                <Plus className="w-4 h-4" />
                הוסף
              </button>
            </div>

            {/* Add New Progress Form */}
            {showAddForm && (
              <form onSubmit={handleAddUpdate} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תיאור קצר *
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
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewUpdate({
                        title: '',
                        update_date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}

            {/* Progress Updates Table */}

            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                טוען...
              </div>
            ) : progressUpdates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                אין עדיין עדכוני התקדמות
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">
                        תאריך
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        תיאור
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32">
                        נוצר ע"י
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {progressUpdates.map((update) => (
                      <tr key={update.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {editingProgressId === update.id ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                value={editingProgressData.update_date}
                                onChange={(e) => setEditingProgressData({ ...editingProgressData, update_date: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-2" colSpan="2">
                              <input
                                type="text"
                                value={editingProgressData.title}
                                onChange={(e) => setEditingProgressData({ ...editingProgressData, title: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSaveProgressEdit(update.id)}
                                  className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                                  title="שמור"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingProgressId(null)}
                                  className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400"
                                  title="ביטול"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm text-primary-600 dark:text-primary-400 font-medium">
                              {formatDate(update.update_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {update.title}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                              {update.created_by_name}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditProgress(update)}
                                  className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                  title="ערוך"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProgress(update.id)}
                                  className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                                  title="מחק"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
