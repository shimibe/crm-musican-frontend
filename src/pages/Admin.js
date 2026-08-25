import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Edit, Trash2, Shield, Key, Copy, Check, FileText, Edit2, Mail, MessageSquare, X, Zap, Wrench, ReceiptText, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';

const Admin = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [interests, setInterests] = useState([]);
  const [apiTokens, setApiTokens] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [repairStatuses, setRepairStatuses] = useState([]);
  const [creditTypes, setCreditTypes] = useState([]);

  // Repair type modal states
  const [showRepairTypeModal, setShowRepairTypeModal] = useState(false);
  const [editingRepairType, setEditingRepairType] = useState(null);
  const [repairTypeForm, setRepairTypeForm] = useState({ name: '', description: '' });

  // Repair status modal states
  const [showRepairStatusModal, setShowRepairStatusModal] = useState(false);
  const [editingRepairStatus, setEditingRepairStatus] = useState(null);
  const [repairStatusForm, setRepairStatusForm] = useState({ name: '', color: 'gray', sort_order: 0, is_final: false });

  // Credit type modal states
  const [showCreditTypeModal, setShowCreditTypeModal] = useState(false);
  const [editingCreditType, setEditingCreditType] = useState(null);
  const [creditTypeForm, setCreditTypeForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Tools tab state
  const [retryInvoiceId, setRetryInvoiceId] = useState('');
  const [retryInvoiceLoading, setRetryInvoiceLoading] = useState(false);
  const [retryInvoiceResult, setRetryInvoiceResult] = useState(null); // { success, message }

  // User modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    is_active: true,
    hourly_wage: 0,
    can_edit_attendance: false,
  });

  // Category modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  // Interest modal states
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [editingInterest, setEditingInterest] = useState(null);
  const [interestForm, setInterestForm] = useState({
    name: '',
    description: '',
  });

  // Automation modal states
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationInterest, setAutomationInterest] = useState(null);
  const [automationForm, setAutomationForm] = useState({
    is_active: false,
    email_template: '',
    email_subject: '',
    email_variables: '{}',
    whatsapp_template: '',
    whatsapp_variables: '[]',
  });

  // API Token modal states
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [newToken, setNewToken] = useState(null);
  const [tokenForm, setTokenForm] = useState({
    name: '',
    permissions: {
      customers: [],
      tasks: [],
      categories: [],
      interests: [],
    },
  });
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCategoryId, setCopiedCategoryId] = useState(null);

  // Campaign Templates states
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'email',
  });

  // Settings states
  const [settings, setSettings] = useState({
    studio_hourly_rate: 250
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      const requests = [
        api.get('/users'),
        api.get('/categories'),
        api.get('/interests'),
      ];

      if (activeTab === 'api-keys') {
        requests.push(api.get('/admin/api-tokens'));
      }

      if (activeTab === 'templates') {
        requests.push(api.get('/campaign-templates'));
      }

      if (activeTab === 'settings') {
        await loadSettings();
      }

      const [repairTypesRes, repairStatusesRes, creditTypesRes] = await Promise.all([
        api.get('/repair-types'),
        api.get('/repair-statuses'),
        api.get('/credit-types'),
      ]);
      setRepairTypes(repairTypesRes.data || []);
      setRepairStatuses(repairStatusesRes.data || []);
      setCreditTypes(creditTypesRes.data || []);

      const responses = await Promise.all(requests);
      setUsers(responses[0].data);
      setCategories(responses[1].data);
      setInterests(responses[2].data.interests || []);

      if (responses[3]) {
        if (activeTab === 'api-keys') {
          setApiTokens(responses[3].data);
        } else if (activeTab === 'templates') {
          setTemplates(responses[3].data);
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'api-keys') {
      loadApiTokens();
    } else if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab]);

  const loadApiTokens = async () => {
    try {
      const response = await api.get('/admin/api-tokens');
      setApiTokens(response.data);
    } catch (error) {
      console.error('Error loading API tokens:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/campaign-templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error loading campaign templates:', error);
      setTemplates([]);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data || { studio_hourly_rate: 250 });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await api.post('/admin/settings', settings);
      alert('ההגדרות נשמרו בהצלחה!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('שגיאה בשמירת ההגדרות');
    }
  };

  const getRoleText = (role) => {
    return role === 'admin' ? 'מנהל' : role === 'manager' ? 'מנהל צוות' : 'עובד';
  };

  // User handlers
  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'employee',
      is_active: true,
      hourly_wage: 0,
      can_edit_attendance: false,
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '',
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
      hourly_wage: user.hourly_wage || 0,
      can_edit_attendance: user.can_edit_attendance || false,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const data = {
        username: userForm.username,
        full_name: userForm.full_name,
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        is_active: userForm.is_active,
        hourly_wage: parseFloat(userForm.hourly_wage) || 0,
        can_edit_attendance: userForm.can_edit_attendance,
      };

      if (editingUser) {
        // Update existing user
        if (userForm.password) {
          data.password = userForm.password;
        }
        delete data.username; // Can't change username
        await api.put(`/users/${editingUser.id}`, data);
      } else {
        // Create new user - password is required
        const registerData = {
          username: userForm.username,
          password: userForm.password,
          fullName: userForm.full_name,
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          hourly_wage: parseFloat(userForm.hourly_wage) || 0,
          can_edit_attendance: userForm.can_edit_attendance,
        };
        console.log('Sending data to server:', registerData);
        const response = await api.post('/auth/register', registerData);
        console.log('Server response:', response.data);

        // If user should be inactive, update it
        if (!userForm.is_active && response.data.user?.id) {
          await api.put(`/users/${response.data.user.id}`, { is_active: false });
        }
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'שגיאה בשמירת משתמש';
      alert(errorMessage);
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      color: '#3B82F6',
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, categoryForm);
      } else {
        await api.post('/categories', categoryForm);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('שגיאה בשמירת קטגוריה');
    }
  };

  const handleDeleteCategory = (id) => {
    setConfirmDialog({
      title: 'מחיקת קטגוריה',
      message: 'האם אתה בטוח שברצונך למחוק קטגוריה זו?',
      onConfirm: async () => {
        try {
          await api.delete(`/categories/${id}`);
          setConfirmDialog(null);
          loadData();
        } catch (error) {
          console.error('Error deleting category:', error);
          alert('שגיאה במחיקת קטגוריה');
        }
      },
    });
  };

  // Interest handlers
  const handleAddInterest = () => {
    setEditingInterest(null);
    setInterestForm({
      name: '',
      description: '',
    });
    setShowInterestModal(true);
  };

  const handleEditInterest = (interest) => {
    setEditingInterest(interest);
    setInterestForm({
      name: interest.name,
      description: interest.description || '',
    });
    setShowInterestModal(true);
  };

  const handleSaveInterest = async (e) => {
    e.preventDefault();
    try {
      if (editingInterest) {
        await api.put(`/interests/${editingInterest.id}`, interestForm);
      } else {
        await api.post('/interests', interestForm);
      }
      setShowInterestModal(false);
      setEditingInterest(null);
      loadData();
    } catch (error) {
      console.error('Error saving interest:', error);
      alert('שגיאה בשמירת תחום עניין');
    }
  };

  const handleDeleteInterest = (id) => {
    setConfirmDialog({
      title: 'מחיקת תחום עניין',
      message: 'האם אתה בטוח שברצונך למחוק תחום עניין זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/interests/${id}`);
          setConfirmDialog(null);
          loadData();
        } catch (error) {
          console.error('Error deleting interest:', error);
          alert('שגיאה במחיקת תחום עניין');
        }
      },
    });
  };

  // Repair type handlers
  const handleAddRepairType = () => {
    setEditingRepairType(null);
    setRepairTypeForm({ name: '', description: '' });
    setShowRepairTypeModal(true);
  };

  const handleEditRepairType = (rt) => {
    setEditingRepairType(rt);
    setRepairTypeForm({ name: rt.name, description: rt.description || '' });
    setShowRepairTypeModal(true);
  };

  const handleSaveRepairType = async (e) => {
    e.preventDefault();
    try {
      if (editingRepairType) {
        await api.put(`/repair-types/${editingRepairType.id}`, repairTypeForm);
      } else {
        await api.post('/repair-types', repairTypeForm);
      }
      setShowRepairTypeModal(false);
      setEditingRepairType(null);
      const res = await api.get('/repair-types');
      setRepairTypes(res.data || []);
    } catch (error) {
      console.error('Error saving repair type:', error);
      alert('שגיאה בשמירת סוג תיקון');
    }
  };

  const handleDeleteRepairType = (id) => {
    setConfirmDialog({
      title: 'מחיקת סוג תיקון',
      message: 'האם אתה בטוח שברצונך למחוק סוג תיקון זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/repair-types/${id}`);
          setConfirmDialog(null);
          const res = await api.get('/repair-types');
          setRepairTypes(res.data || []);
        } catch (error) {
          const msg = error.response?.data?.error || 'שגיאה במחיקת סוג תיקון';
          alert(msg);
        }
      },
    });
  };

  // Repair status handlers
  const handleAddRepairStatus = () => {
    setEditingRepairStatus(null);
    setRepairStatusForm({ name: '', color: 'gray', sort_order: repairStatuses.length, is_final: false });
    setShowRepairStatusModal(true);
  };

  const handleEditRepairStatus = (s) => {
    setEditingRepairStatus(s);
    setRepairStatusForm({ name: s.name, color: s.color || 'gray', sort_order: s.sort_order ?? 0, is_final: s.is_final || false });
    setShowRepairStatusModal(true);
  };

  const handleSaveRepairStatus = async (e) => {
    e.preventDefault();
    try {
      if (editingRepairStatus) {
        await api.put(`/repair-statuses/${editingRepairStatus.id}`, repairStatusForm);
      } else {
        await api.post('/repair-statuses', repairStatusForm);
      }
      setShowRepairStatusModal(false);
      setEditingRepairStatus(null);
      const res = await api.get('/repair-statuses');
      setRepairStatuses(res.data || []);
    } catch (error) {
      console.error('Error saving repair status:', error);
      alert('שגיאה בשמירת סטטוס');
    }
  };

  const handleDeleteRepairStatus = (id) => {
    setConfirmDialog({
      title: 'מחיקת סטטוס תיקון',
      message: 'האם אתה בטוח שברצונך למחוק סטטוס זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/repair-statuses/${id}`);
          setConfirmDialog(null);
          const res = await api.get('/repair-statuses');
          setRepairStatuses(res.data || []);
        } catch (error) {
          const msg = error.response?.data?.error || 'שגיאה במחיקת סטטוס';
          alert(msg);
        }
      },
    });
  };

  // Credit type handlers
  const handleAddCreditType = () => {
    setEditingCreditType(null);
    setCreditTypeForm({ name: '', description: '' });
    setShowCreditTypeModal(true);
  };

  const handleEditCreditType = (ct) => {
    setEditingCreditType(ct);
    setCreditTypeForm({ name: ct.name, description: ct.description || '' });
    setShowCreditTypeModal(true);
  };

  const handleSaveCreditType = async (e) => {
    e.preventDefault();
    try {
      if (editingCreditType) {
        await api.put(`/credit-types/${editingCreditType.id}`, creditTypeForm);
      } else {
        await api.post('/credit-types', creditTypeForm);
      }
      setShowCreditTypeModal(false);
      setEditingCreditType(null);
      const res = await api.get('/credit-types');
      setCreditTypes(res.data || []);
    } catch (error) {
      console.error('Error saving credit type:', error);
      alert('שגיאה בשמירת סוג זיכוי');
    }
  };

  const handleDeleteCreditType = (id) => {
    setConfirmDialog({
      title: 'מחיקת סוג זיכוי',
      message: 'האם אתה בטוח שברצונך למחוק סוג זיכוי זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/credit-types/${id}`);
          setConfirmDialog(null);
          const res = await api.get('/credit-types');
          setCreditTypes(res.data || []);
        } catch (error) {
          const msg = error.response?.data?.error || 'שגיאה במחיקת סוג זיכוי';
          alert(msg);
        }
      },
    });
  };

  // Automation handlers
  const handleOpenAutomation = async (interest) => {
    setAutomationInterest(interest);
    if (templates.length === 0) {
      try {
        const res = await api.get('/campaign-templates');
        setTemplates(res.data.templates || []);
      } catch (e) {}
    }
    try {
      const res = await api.get(`/interests/${interest.id}/automation`);
      const auto = res.data;
      setAutomationForm({
        is_active: auto.is_active || false,
        email_template: auto.email_template || '',
        email_subject: auto.email_subject || '',
        email_variables: JSON.stringify(auto.email_variables || {}, null, 2),
        whatsapp_template: auto.whatsapp_template || '',
        whatsapp_variables: JSON.stringify(auto.whatsapp_variables || [], null, 2),
      });
    } catch (e) {
      setAutomationForm({ is_active: false, email_template: '', email_subject: '', email_variables: '{}', whatsapp_template: '', whatsapp_variables: '[]' });
    }
    setShowAutomationModal(true);
  };

  const handleSaveAutomation = async (e) => {
    e.preventDefault();
    let email_variables = {};
    let whatsapp_variables = [];
    try { email_variables = JSON.parse(automationForm.email_variables); } catch { alert('שגיאה ב-JSON של משתני אימייל'); return; }
    try { whatsapp_variables = JSON.parse(automationForm.whatsapp_variables); } catch { alert('שגיאה ב-JSON של משתני וואטסאפ'); return; }
    try {
      await api.put(`/interests/${automationInterest.id}/automation`, {
        is_active: automationForm.is_active,
        email_template: automationForm.email_template || null,
        email_subject: automationForm.email_subject || null,
        email_variables,
        whatsapp_template: automationForm.whatsapp_template || null,
        whatsapp_variables,
      });
      setShowAutomationModal(false);
      setAutomationInterest(null);
    } catch (error) {
      console.error('Error saving automation:', error);
      alert('שגיאה בשמירת הגדרת אוטומציה');
    }
  };

  // API Token handlers
  const handleCreateToken = () => {
    setEditingToken(null);
    setNewToken(null);
    setTokenForm({
      name: '',
      permissions: {
        customers: [],
        tasks: [],
        categories: [],
        interests: [],
      },
    });
    setCopiedToken(false);
    setShowTokenModal(true);
  };

  const handleEditToken = (token) => {
    setEditingToken(token);
    setNewToken(null);
    setTokenForm({
      name: token.name,
      permissions: token.permissions || {
        customers: [],
        tasks: [],
        categories: [],
        interests: [],
      },
    });
    setCopiedToken(false);
    setShowTokenModal(true);
  };

  const handleSaveToken = async (e) => {
    e.preventDefault();
    try {
      if (editingToken) {
        // Update existing token permissions
        await api.put(`/admin/api-tokens/${editingToken.id}`, {
          name: tokenForm.name,
          permissions: tokenForm.permissions,
        });
        setShowTokenModal(false);
        setEditingToken(null);
      } else {
        // Create new token
        const response = await api.post('/admin/api-tokens', {
          user_id: user.id,
          name: tokenForm.name,
          permissions: tokenForm.permissions,
        });
        setNewToken(response.data.token);
      }
      loadApiTokens();
    } catch (error) {
      console.error('Error saving API token:', error);
      alert('שגיאה בשמירת API token');
    }
  };

  const handleDeleteToken = (id) => {
    setConfirmDialog({
      title: 'מחיקת API Token',
      message: 'האם אתה בטוח שברצונך למחוק API token זה?',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/api-tokens/${id}`);
          setConfirmDialog(null);
          loadApiTokens();
        } catch (error) {
          console.error('Error deleting API token:', error);
          alert('שגיאה במחיקת API token');
        }
      },
    });
  };

  const copyToClipboard = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const copyCategoryId = async (id) => {
    await navigator.clipboard.writeText(id);
    setCopiedCategoryId(id);
    setTimeout(() => setCopiedCategoryId(null), 2000);
  };

  const togglePermission = (resource, permission) => {
    setTokenForm(prev => {
      const current = prev.permissions[resource] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [resource]: updated,
        },
      };
    });
  };

  // Campaign Template handlers
  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      type: 'email',
    });
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.put(`/campaign-templates/${editingTemplate.id}`, templateForm);
      } else {
        await api.post('/campaign-templates', templateForm);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('שגיאה בשמירת תבנית');
    }
  };

  const handleDeleteTemplate = (id) => {
    setConfirmDialog({
      title: 'מחיקת תבנית',
      message: 'האם אתה בטוח שברצונך למחוק תבנית זו?',
      onConfirm: async () => {
        try {
          await api.delete(`/campaign-templates/${id}`);
          setConfirmDialog(null);
          loadTemplates();
        } catch (error) {
          console.error('Error deleting template:', error);
          alert('שגיאה במחיקת תבנית');
        }
      },
    });
  };

  const handleRetryInvoice = async (e) => {
    e.preventDefault();
    setRetryInvoiceLoading(true);
    setRetryInvoiceResult(null);
    try {
      await api.post('/tools/retry-invoice', { paymentId: retryInvoiceId.trim() });
      setRetryInvoiceResult({ success: true, message: 'החשבונית הופקה בהצלחה!' });
      setRetryInvoiceId('');
    } catch (err) {
      const msg = err.response?.data?.error || 'שגיאה בהפקת החשבונית';
      setRetryInvoiceResult({ success: false, message: msg });
    } finally {
      setRetryInvoiceLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-8 h-8" />
          ניהול מערכת
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          ניהול משתמשים, קטגוריות והגדרות מערכת
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            משתמשים
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            קטגוריות
          </button>
          <button
            onClick={() => setActiveTab('interests')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'interests'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            תחומי עניין
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            תבניות קמפיינים
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api-keys'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('repair-types')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'repair-types'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            סוגי תיקונים
          </button>
          <button
            onClick={() => setActiveTab('repair-statuses')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'repair-statuses'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            סטטוסי תיקון
          </button>
          <button
            onClick={() => setActiveTab('credit-types')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'credit-types'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            סוגי זיכויים
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            הגדרות
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
              activeTab === 'tools'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            כלים
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              ניהול משתמשים
            </h2>
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              משתמש חדש
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    שם משתמש
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    שם מלא
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    אימייל
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    תפקיד
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
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer text-right"
                      >
                        {user.username}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer text-right"
                      >
                        {user.full_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer text-right"
                      >
                        {user.email}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getRoleText(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {user.is_active ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              קטגוריות משימות
            </h2>
            <button
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              קטגוריה חדשה
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || '#6B7280' }}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-1 truncate">
                        ID: {category.id}
                      </span>
                      <button
                        onClick={() => copyCategoryId(category.id)}
                        className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                          copiedCategoryId === category.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {copiedCategoryId === category.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            הועתק
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            העתק ID
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interests Tab */}
      {activeTab === 'interests' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              תחומי עניין
            </h2>
            <button
              onClick={handleAddInterest}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              תחום עניין חדש
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interests.map((interest) => (
                <div
                  key={interest.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {interest.name}
                      </h3>
                      {interest.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {interest.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenAutomation(interest)}
                        className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        title="הגדרת אוטומציה"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditInterest(interest)}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInterest(interest.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingUser ? 'עריכת משתמש' : 'משתמש חדש'}
              </h2>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם משתמש *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סיסמה {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? 'השאר ריק כדי לא לשנות' : ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם מלא *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  אימייל *
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  מספר טלפון
                </label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="972501234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  לשליחת קמפיין ניסיון לוואטסאפ
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תפקיד *
                </label>
                <select
                  required
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="employee">עובד</option>
                  <option value="manager">מנהל צוות</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שכר שעתי (₪)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={userForm.hourly_wage}
                  onChange={(e) => setUserForm({ ...userForm, hourly_wage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                  משתמש פעיל
                </label>
              </div>
              {userForm.role !== 'admin' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={userForm.can_edit_attendance}
                    onChange={(e) => setUserForm({ ...userForm, can_edit_attendance: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                    אפשר עריכת משמרות
                  </label>
                </div>
              )}
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
                    setShowUserModal(false);
                    setEditingUser(null);
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

      {/* Campaign Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              תבניות קמפיינים
            </h2>
            <button
              onClick={handleAddTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              תבנית חדשה
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {template.type === 'email' ? (
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : template.type === 'sms' ? (
                        <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {template.type === 'email' ? 'אימייל' : template.type === 'sms' ? 'SMS' : 'וואטסאפ'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {templates.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין תבניות קמפיינים עדיין</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              API Keys
            </h2>
            <button
              onClick={handleCreateToken}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              צור API Key חדש
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    שם
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    הרשאות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    נוצר ב
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    שימוש אחרון
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
                {apiTokens.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {token.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(token.permissions || {}).map(([resource, perms]) =>
                          Array.isArray(perms) && perms.length > 0 ? (
                            <span
                              key={resource}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                            >
                              {resource}: {perms.join(', ')}
                            </span>
                          ) : null
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(token.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {token.last_used ? new Date(token.last_used).toLocaleDateString('he-IL') : 'מעולם לא'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          token.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {token.is_active ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditToken(token)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteToken(token.id)}
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
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">הגדרות מערכת</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">הגדרות חיוב אולפן</h3>
              <div className="max-w-md">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  תעריף שעתי ברירת מחדל (₪)
                </label>
                <input
                  type="number"
                  value={settings.studio_hourly_rate}
                  onChange={(e) => setSettings({ ...settings, studio_hourly_rate: parseFloat(e.target.value) || 250 })}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                  step="10"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  תעריף זה ישמש כברירת מחדל בעמוד חיוב האולפן
                </p>
              </div>
            </div>

            <div>
              <button
                onClick={saveSettings}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                שמור הגדרות
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingCategory ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
              </h2>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם קטגוריה *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  צבע
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
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
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
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

      {/* Interest Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingInterest ? 'עריכת תחום עניין' : 'תחום עניין חדש'}
              </h2>
            </div>
            <form onSubmit={handleSaveInterest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם תחום עניין *
                </label>
                <input
                  type="text"
                  required
                  value={interestForm.name}
                  onChange={(e) => setInterestForm({ ...interestForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תיאור
                </label>
                <textarea
                  value={interestForm.description}
                  onChange={(e) => setInterestForm({ ...interestForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
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
                    setShowInterestModal(false);
                    setEditingInterest(null);
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

      {/* Automation Modal */}
      {showAutomationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  אוטומציה — {automationInterest?.name}
                </h2>
              </div>
              <button onClick={() => setShowAutomationModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveAutomation} className="p-6 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">הפעל אוטומציה</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">שלח הודעה אוטומטית כשהתגית מתווספת ללקוח</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutomationForm({ ...automationForm, is_active: !automationForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${automationForm.is_active ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${automationForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Email Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">אימייל</h3>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">תבנית אימייל (שם ב-SendPulse)</label>
                  <select
                    value={automationForm.email_template}
                    onChange={(e) => setAutomationForm({ ...automationForm, email_template: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">— ללא אימייל —</option>
                    {templates.filter(t => t.type === 'email').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                {automationForm.email_template && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">נושא האימייל</label>
                      <input
                        type="text"
                        value={automationForm.email_subject}
                        onChange={(e) => setAutomationForm({ ...automationForm, email_subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="נושא ההודעה"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">משתני אימייל (JSON)</label>
                      <textarea
                        value={automationForm.email_variables}
                        onChange={(e) => setAutomationForm({ ...automationForm, email_variables: e.target.value })}
                        rows={3}
                        dir="ltr"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                        placeholder={'{"firstName": "{{customer.firstName}}"}'}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* WhatsApp Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">וואטסאפ</h3>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">תבנית וואטסאפ (שם ב-SendPulse)</label>
                  <select
                    value={automationForm.whatsapp_template}
                    onChange={(e) => setAutomationForm({ ...automationForm, whatsapp_template: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">— ללא וואטסאפ —</option>
                    {templates.filter(t => t.type === 'whatsapp').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                {automationForm.whatsapp_template && (
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">משתני וואטסאפ (JSON array, לפי סדר)</label>
                    <textarea
                      value={automationForm.whatsapp_variables}
                      onChange={(e) => setAutomationForm({ ...automationForm, whatsapp_variables: e.target.value })}
                      rows={3}
                      dir="ltr"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                      placeholder={'["{{customer.firstName}}", "מוזיקן"]'}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  שמור הגדרות
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutomationModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {newToken ? 'API Key נוצר בהצלחה' : editingToken ? 'ערוך API Key' : 'צור API Key חדש'}
              </h2>
            </div>

            {newToken ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                    ⚠️ שמור את ה-token הזה - לא תוכל לראות אותו שוב!
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newToken}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                        copiedToken
                          ? 'bg-green-600 text-white'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {copiedToken ? (
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
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowTokenModal(false);
                      setNewToken(null);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    סגור
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveToken} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שם ה-Token *
                  </label>
                  <input
                    type="text"
                    required
                    value={tokenForm.name}
                    onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                    placeholder="למשל: Production API Key"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    הרשאות
                  </label>

                  <div className="space-y-3">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        <Key className="w-4 h-4 inline ml-2" />
                        Customers
                      </h4>
                      <div className="space-y-2">
                        {['read', 'write', 'delete'].map((perm) => (
                          <label key={perm} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={tokenForm.permissions.customers?.includes(perm)}
                              onChange={() => togglePermission('customers', perm)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                              {perm === 'read' ? 'קריאה' : perm === 'write' ? 'כתיבה' : 'מחיקה'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        <Key className="w-4 h-4 inline ml-2" />
                        Tasks
                      </h4>
                      <div className="space-y-2">
                        {['read', 'write', 'delete'].map((perm) => (
                          <label key={perm} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={tokenForm.permissions.tasks?.includes(perm)}
                              onChange={() => togglePermission('tasks', perm)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                              {perm === 'read' ? 'קריאה' : perm === 'write' ? 'כתיבה' : 'מחיקה'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        <Key className="w-4 h-4 inline ml-2" />
                        Categories
                      </h4>
                      <div className="space-y-2">
                        {['read', 'write', 'delete'].map((perm) => (
                          <label key={perm} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={tokenForm.permissions.categories?.includes(perm)}
                              onChange={() => togglePermission('categories', perm)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                              {perm === 'read' ? 'קריאה' : perm === 'write' ? 'כתיבה' : 'מחיקה'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        <Key className="w-4 h-4 inline ml-2" />
                        Interests
                      </h4>
                      <div className="space-y-2">
                        {['read', 'write', 'delete'].map((perm) => (
                          <label key={perm} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={tokenForm.permissions.interests?.includes(perm)}
                              onChange={() => togglePermission('interests', perm)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                              {perm === 'read' ? 'קריאה' : perm === 'write' ? 'כתיבה' : 'מחיקה'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    {editingToken ? 'עדכן הרשאות' : 'צור API Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTokenModal(false);
                      setEditingToken(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Campaign Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}
              </h2>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="למשל: קמפיין פתיחה"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  סוג הקמפיין *
                </label>
                <select
                  required
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="email">אימייל</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">וואטסאפ</option>
                </select>
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
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
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
      {/* Repair Types Tab */}
      {activeTab === 'repair-types' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">סוגי תיקונים</h2>
            <button
              onClick={handleAddRepairType}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              סוג חדש
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repairTypes.map((rt) => (
                <div key={rt.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{rt.name}</h3>
                    {rt.description && <p className="text-sm text-gray-500 dark:text-gray-400">{rt.description}</p>}
                    {!rt.is_active && <span className="text-xs text-gray-400">לא פעיל</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditRepairType(rt)} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteRepairType(rt.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Repair Statuses Tab */}
      {activeTab === 'repair-statuses' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">סטטוסי תיקון</h2>
            <button
              onClick={handleAddRepairStatus}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              סטטוס חדש
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repairStatuses.map((s) => (
                <div key={s.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: { red: '#EF4444', yellow: '#EAB308', green: '#22C55E', blue: '#3B82F6', orange: '#F97316', purple: '#A855F7', gray: '#6B7280' }[s.color] || '#6B7280' }} />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{s.name}</h3>
                      <span className="text-xs text-gray-400">סדר: {s.sort_order}</span>
                      {s.is_final && <span className="text-xs text-green-600 dark:text-green-400 mr-2">✓ סטטוס סיום</span>}
                      {!s.is_active && <span className="text-xs text-gray-400 mr-2">לא פעיל</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditRepairStatus(s)} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteRepairStatus(s.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credit Types Tab */}
      {activeTab === 'credit-types' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">סוגי מוצרי זיכוי</h2>
            <button
              onClick={handleAddCreditType}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              סוג חדש
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditTypes.map((ct) => (
                <div key={ct.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{ct.name}</h3>
                    {ct.description && <p className="text-sm text-gray-500 dark:text-gray-400">{ct.description}</p>}
                    {!ct.is_active && <span className="text-xs text-gray-400">לא פעיל</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditCreditType(ct)} className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCreditType(ct.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Repair Type Modal */}
      {showRepairTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingRepairType ? 'עריכת סוג תיקון' : 'סוג תיקון חדש'}
              </h2>
            </div>
            <form onSubmit={handleSaveRepairType} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם *</label>
                <input
                  type="text"
                  required
                  value={repairTypeForm.name}
                  onChange={(e) => setRepairTypeForm({ ...repairTypeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תיאור</label>
                <textarea
                  value={repairTypeForm.description}
                  onChange={(e) => setRepairTypeForm({ ...repairTypeForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">שמור</button>
                <button
                  type="button"
                  onClick={() => { setShowRepairTypeModal(false); setEditingRepairType(null); }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repair Status Modal */}
      {showRepairStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingRepairStatus ? 'עריכת סטטוס' : 'סטטוס חדש'}
              </h2>
            </div>
            <form onSubmit={handleSaveRepairStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם *</label>
                <input
                  type="text"
                  required
                  value={repairStatusForm.name}
                  onChange={(e) => setRepairStatusForm({ ...repairStatusForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">צבע</label>
                <select
                  value={repairStatusForm.color}
                  onChange={(e) => setRepairStatusForm({ ...repairStatusForm, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="red">אדום</option>
                  <option value="yellow">צהוב</option>
                  <option value="green">ירוק</option>
                  <option value="blue">כחול</option>
                  <option value="orange">כתום</option>
                  <option value="purple">סגול</option>
                  <option value="gray">אפור</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סדר תצוגה</label>
                <input
                  type="number"
                  value={repairStatusForm.sort_order}
                  onChange={(e) => setRepairStatusForm({ ...repairStatusForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_final"
                  checked={repairStatusForm.is_final}
                  onChange={(e) => setRepairStatusForm({ ...repairStatusForm, is_final: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="is_final" className="text-sm text-gray-700 dark:text-gray-300">סטטוס סיום (הושלם) — לא יופיע בדשבורד</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">שמור</button>
                <button
                  type="button"
                  onClick={() => { setShowRepairStatusModal(false); setEditingRepairStatus(null); }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Type Modal */}
      {showCreditTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingCreditType ? 'עריכת סוג זיכוי' : 'סוג זיכוי חדש'}
              </h2>
            </div>
            <form onSubmit={handleSaveCreditType} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם *</label>
                <input
                  type="text"
                  required
                  value={creditTypeForm.name}
                  onChange={(e) => setCreditTypeForm({ ...creditTypeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תיאור</label>
                <textarea
                  value={creditTypeForm.description}
                  onChange={(e) => setCreditTypeForm({ ...creditTypeForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">שמור</button>
                <button
                  type="button"
                  onClick={() => { setShowCreditTypeModal(false); setEditingCreditType(null); }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tools Tab */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">כלי מנהל</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">פעולות חד-פעמיות וכלי עזר לניהול המערכת</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* Tool Card: Retry Invoice */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <ReceiptText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">הפקת חשבונית ידנית</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    שלח בקשת retry לאתר Wix להפקת חשבונית שנכשלה
                  </p>
                </div>
              </div>

              <form onSubmit={handleRetryInvoice} className="p-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Payment ID
                  </label>
                  <input
                    type="text"
                    value={retryInvoiceId}
                    onChange={(e) => { setRetryInvoiceId(e.target.value); setRetryInvoiceResult(null); }}
                    placeholder="הדבק את ה-ID מתיאור המשימה"
                    dir="ltr"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>

                {retryInvoiceResult && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                    retryInvoiceResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
                    {retryInvoiceResult.success
                      ? <Check className="w-4 h-4 shrink-0" />
                      : <X className="w-4 h-4 shrink-0" />}
                    <span>{retryInvoiceResult.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={retryInvoiceLoading || !retryInvoiceId.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {retryInvoiceLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</>
                    : <><ReceiptText className="w-4 h-4" /> הפק חשבונית</>}
                </button>
              </form>
            </div>

            {/* Future tool cards will be added here */}

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

export default Admin;
