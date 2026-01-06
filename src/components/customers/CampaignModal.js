import React, { useState, useEffect } from 'react';
import { Send, X, Plus, Trash2, ArrowUp, ArrowDown, TestTube } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const CampaignModal = ({ show, onClose, selectedCustomers }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    emailTemplate: '',
    emailSubject: '',
    whatsappTemplate: '',
    emailVariables: [{ name: '', value: '' }],
    whatsappVariables: [{ value: '' }], // רק ערכים, הסדר הוא המפתח
  });
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState({ email: '', whatsapp: '' });
  const [showNewTemplate, setShowNewTemplate] = useState({ email: false, whatsapp: false });
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (show) {
      loadTemplates();
    }
  }, [show]);

  // טען משתנים מקמפיין אחרון כשבוחרים תבנית אימייל
  useEffect(() => {
    if (formData.emailTemplate) {
      loadLastCampaignVariables('email', formData.emailTemplate);
    }
  }, [formData.emailTemplate]);

  // טען משתנים מקמפיין אחרון כשבוחרים תבנית וואטסאפ
  useEffect(() => {
    if (formData.whatsappTemplate) {
      loadLastCampaignVariables('whatsapp', formData.whatsappTemplate);
    }
  }, [formData.whatsappTemplate]);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/campaign-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      // If templates endpoint doesn't exist yet, continue without error
      setTemplates([]);
    }
  };

  const loadLastCampaignVariables = async (type, templateName) => {
    try {
      const response = await api.get('/campaigns/last-variables', {
        params: { type, template: templateName }
      });

      if (response.data.campaign) {
        if (type === 'email') {
          // טען subject ומשתנים לאימייל
          const emailVars = response.data.campaign.email_variables;
          setFormData(prev => ({
            ...prev,
            emailSubject: response.data.campaign.email_subject || '',
            emailVariables: emailVars && typeof emailVars === 'object'
              ? Object.entries(emailVars).map(([name, value]) => ({ name, value }))
              : [{ name: '', value: '' }]
          }));
        } else {
          // טען משתני וואטסאפ
          const whatsappVars = response.data.campaign.whatsapp_variables;
          setFormData(prev => ({
            ...prev,
            whatsappVariables: Array.isArray(whatsappVars) && whatsappVars.length > 0
              ? whatsappVars.map(v => ({ value: v }))
              : [{ value: '' }]
          }));
        }
      }
    } catch (error) {
      console.error('Error loading last campaign variables:', error);
      // לא להציג שגיאה - זה לא קריטי
    }
  };

  const addEmailVariable = () => {
    setFormData({
      ...formData,
      emailVariables: [...formData.emailVariables, { name: '', value: '' }],
    });
  };

  const removeEmailVariable = (index) => {
    setFormData({
      ...formData,
      emailVariables: formData.emailVariables.filter((_, i) => i !== index),
    });
  };

  const updateEmailVariable = (index, field, value) => {
    const newVariables = [...formData.emailVariables];
    newVariables[index][field] = value;
    setFormData({ ...formData, emailVariables: newVariables });
  };

  const addWhatsAppVariable = () => {
    setFormData({
      ...formData,
      whatsappVariables: [...formData.whatsappVariables, { value: '' }],
    });
  };

  const removeWhatsAppVariable = (index) => {
    setFormData({
      ...formData,
      whatsappVariables: formData.whatsappVariables.filter((_, i) => i !== index),
    });
  };

  const updateWhatsAppVariable = (index, value) => {
    const newVariables = [...formData.whatsappVariables];
    newVariables[index].value = value;
    setFormData({ ...formData, whatsappVariables: newVariables });
  };

  const moveWhatsAppVariable = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.whatsappVariables.length - 1)
    ) {
      return;
    }

    const newVariables = [...formData.whatsappVariables];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newVariables[index], newVariables[newIndex]] = [newVariables[newIndex], newVariables[index]];
    setFormData({ ...formData, whatsappVariables: newVariables });
  };

  const saveNewTemplate = async (type) => {
    const templateName = type === 'email' ? newTemplateName.email : newTemplateName.whatsapp;
    if (!templateName.trim()) return;

    try {
      await api.post('/campaign-templates', {
        name: templateName,
        type: type,
      });

      // Update form with new template
      if (type === 'email') {
        setFormData({ ...formData, emailTemplate: templateName });
        setNewTemplateName({ ...newTemplateName, email: '' });
      } else {
        setFormData({ ...formData, whatsappTemplate: templateName });
        setNewTemplateName({ ...newTemplateName, whatsapp: '' });
      }

      setShowNewTemplate({ ...showNewTemplate, [type]: false });
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('שגיאה בשמירת תבנית');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.emailTemplate && !formData.whatsappTemplate) {
      alert('יש לבחור לפחות תבנית אחת (אימייל או וואטסאפ)');
      return;
    }

    if (formData.emailTemplate && !formData.emailSubject.trim()) {
      alert('נושא האימייל הוא שדה חובה');
      return;
    }

    if (selectedCustomers.length === 0) {
      alert('לא נבחרו לקוחות');
      return;
    }

    // הצג דיאלוג אישור
    setShowConfirmation(true);
  };

  const confirmAndSend = async () => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      // Process email variables as object (key-value pairs)
      const emailVariables = formData.emailVariables
        .filter(v => v.name.trim() !== '' && v.value.trim() !== '')
        .reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});

      // Process WhatsApp variables as ordered array
      const whatsappVariables = formData.whatsappVariables
        .map(v => v.value.trim())
        .filter(v => v !== '');

      const campaignData = {
        customerIds: selectedCustomers.map(c => c.id),
        emailTemplate: formData.emailTemplate || null,
        emailSubject: formData.emailSubject || null,
        whatsappTemplate: formData.whatsappTemplate || null,
        emailVariables: Object.keys(emailVariables).length > 0 ? emailVariables : null,
        whatsappVariables: whatsappVariables.length > 0 ? whatsappVariables : null,
      };

      const response = await api.post('/campaigns/send', campaignData);

      // הצג את התוצאות האמיתיות מהשרת
      const stats = response.data.stats;
      if (stats) {
        const messages = [];
        if (stats.emailsSent > 0) messages.push(`${stats.emailsSent} אימיילים`);
        if (stats.whatsappSent > 0) messages.push(`${stats.whatsappSent} הודעות וואטסאפ`);
        if (stats.failed > 0) messages.push(`${stats.failed} נכשלו`);

        const summary = messages.join(', ');
        alert(`הקמפיין הושלם!\nנשלחו: ${summary}\nסה"כ לקוחות: ${stats.totalCustomers}`);
      } else {
        alert(`הקמפיין נשלח בהצלחה ל-${selectedCustomers.length} לקוחות`);
      }

      onClose();
      resetForm();
    } catch (error) {
      console.error('Error sending campaign:', error);
      const errorMessage = error.response?.data?.error || 'שגיאה בשליחת קמפיין';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (formData.emailTemplate && !formData.emailSubject.trim()) {
      alert('נושא האימייל הוא שדה חובה');
      return;
    }

    if (!formData.emailTemplate && !formData.whatsappTemplate) {
      alert('יש לבחור לפחות תבנית אחת');
      return;
    }

    setSendingTest(true);

    try {
      const emailVariables = formData.emailVariables
        .filter(v => v.name.trim() !== '' && v.value.trim() !== '')
        .reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});

      const whatsappVariables = formData.whatsappVariables
        .map(v => v.value.trim())
        .filter(v => v !== '');

      const testData = {
        emailTemplate: formData.emailTemplate || null,
        emailSubject: formData.emailSubject || null,
        whatsappTemplate: formData.whatsappTemplate || null,
        emailVariables: Object.keys(emailVariables).length > 0 ? emailVariables : null,
        whatsappVariables: whatsappVariables.length > 0 ? whatsappVariables : null,
      };

      await api.post('/campaigns/send-test', testData);
      alert('קמפיין ניסיון נשלח לכתובת שלך!');
    } catch (error) {
      console.error('Error sending test campaign:', error);
      const errorMessage = error.response?.data?.error || 'שגיאה בשליחת קמפיין ניסיון';
      alert(errorMessage);
    } finally {
      setSendingTest(false);
    }
  };

  const resetForm = () => {
    setFormData({
      emailTemplate: '',
      emailSubject: '',
      whatsappTemplate: '',
      emailVariables: [{ name: '', value: '' }],
      whatsappVariables: [{ value: '' }],
    });
    setNewTemplateName({ email: '', whatsapp: '' });
    setShowNewTemplate({ email: false, whatsapp: false });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!show) return null;

  const emailTemplates = templates.filter(t => t.type === 'email');
  const whatsappTemplates = templates.filter(t => t.type === 'whatsapp');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              שליחת קמפיין
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedCustomers.length} לקוחות נבחרו
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selected Customers Preview */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              לקוחות שנבחרו:
            </h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {selectedCustomers.map(customer => (
                <span
                  key={customer.id}
                  className="px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-md text-sm"
                >
                  {customer.name}
                </span>
              ))}
            </div>
          </div>

          {/* Email Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              תבנית אימייל
            </label>
            {!showNewTemplate.email ? (
              <div className="flex gap-2">
                <select
                  value={formData.emailTemplate}
                  onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">ללא אימייל</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewTemplate({ ...showNewTemplate, email: true })}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                  title="הוסף תבנית חדשה"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTemplateName.email}
                  onChange={(e) => setNewTemplateName({ ...newTemplateName, email: e.target.value })}
                  placeholder="שם התבנית החדשה"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveNewTemplate('email')}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTemplate({ ...showNewTemplate, email: false });
                    setNewTemplateName({ ...newTemplateName, email: '' });
                  }}
                  className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          {/* Email Subject */}
          {formData.emailTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                נושא האימייל *
              </label>
              <input
                type="text"
                required
                value={formData.emailSubject}
                onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                placeholder="לדוגמה: הזמנה לוובינר - כלים חדשים למוזיקאים"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Email Variables */}
          {formData.emailTemplate && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  משתנים לאימייל (זוגות key-value)
                </label>
                <button
                  type="button"
                  onClick={addEmailVariable}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  הוסף משתנה
                </button>
              </div>
              <div className="space-y-2">
                {formData.emailVariables.map((variable, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateEmailVariable(index, 'name', e.target.value)}
                      placeholder="שם המשתנה (firstName)"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => updateEmailVariable(index, 'value', e.target.value)}
                      placeholder="ערך ({{customer.name}})"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeEmailVariable(index)}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                טיפ: השתמש במשתנים כמו customer.name, customer.email
              </p>
            </div>
          )}

          {/* WhatsApp Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              תבנית וואטסאפ
            </label>
            {!showNewTemplate.whatsapp ? (
              <div className="flex gap-2">
                <select
                  value={formData.whatsappTemplate}
                  onChange={(e) => setFormData({ ...formData, whatsappTemplate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">ללא וואטסאפ</option>
                  {whatsappTemplates.map((template) => (
                    <option key={template.id} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewTemplate({ ...showNewTemplate, whatsapp: true })}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                  title="הוסף תבנית חדשה"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTemplateName.whatsapp}
                  onChange={(e) => setNewTemplateName({ ...newTemplateName, whatsapp: e.target.value })}
                  placeholder="שם התבנית החדשה"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveNewTemplate('whatsapp')}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTemplate({ ...showNewTemplate, whatsapp: false });
                    setNewTemplateName({ ...newTemplateName, whatsapp: '' });
                  }}
                  className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          {/* WhatsApp Variables */}
          {formData.whatsappTemplate && (
            <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  משתנים לוואטסאפ (סדר חשוב!)
                </label>
                <button
                  type="button"
                  onClick={addWhatsAppVariable}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  הוסף משתנה
                </button>
              </div>
              <div className="space-y-2">
                {formData.whatsappVariables.map((variable, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">
                      {'{{'}{index + 1}{'}}'}
                    </span>
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => updateWhatsAppVariable(index, e.target.value)}
                      placeholder={`ערך עבור פרמטר ${index + 1} ({{customer.name}})`}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveWhatsAppVariable(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                        title="הזז למעלה"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWhatsAppVariable(index, 'down')}
                        disabled={index === formData.whatsappVariables.length - 1}
                        className="px-2 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                        title="הזז למטה"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWhatsAppVariable(index)}
                        className="px-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⚠️ הסדר קריטי! המשתנה הראשון ישלח כ-{'{1}'}, השני כ-{'{2}'}, וכן הלאה. השתמש בחצים לשינוי סדר.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading || sendingTest}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>טוען...</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  שלח קמפיין
                </>
              )}
            </button>
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest || loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="שלח קמפיין ניסיון לכתובת שלך"
              >
                {sendingTest ? (
                  <>שולח...</>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    ניסיון
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || sendingTest}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              אישור שליחת קמפיין
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              הקמפיין יישלח ל-<span className="font-semibold">{selectedCustomers.length}</span> אנשים
              {formData.emailTemplate && formData.whatsappTemplate && ' (אימייל + וואטסאפ)'}
              {formData.emailTemplate && !formData.whatsappTemplate && ' (אימייל בלבד)'}
              {!formData.emailTemplate && formData.whatsappTemplate && ' (וואטסאפ בלבד)'}
              .
              <br />
              האם להמשיך?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmAndSend}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                אישור ושליחה
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignModal;
