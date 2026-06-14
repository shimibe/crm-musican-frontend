import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Edit, Trash2, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomerModal from '../components/tasks/CustomerModal';
import ColumnToggle from '../components/common/ColumnToggle';
import ProgressModal from '../components/tasks/ProgressModal';

const Tasks = () => {
  const { user, updatePreferences } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedTaskForProgress, setSelectedTaskForProgress] = useState(null);
  const [taskProgressCounts, setTaskProgressCounts] = useState({});
  const [inlineDateEditTaskId, setInlineDateEditTaskId] = useState(null);
  const [completingTaskIds, setCompletingTaskIds] = useState(new Set());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'medium',
    status: 'open',
    assigned_to: '',
    customer_id: '',
    due_date: '',
    agent_note: '',
  });

  // Column visibility state - load from user preferences
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultColumns = {
      title: true,
      customer: true,
      category: true,
      priority: true,
      status: true,
      assignedTo: true,
      createdAt: true,
      updatedAt: true,
    };
    return user?.preferences?.tasks_visible_columns || defaultColumns;
  });

  const columnDefinitions = [
    { key: 'title', label: 'כותרת' },
    { key: 'customer', label: 'לקוח' },
    { key: 'category', label: 'קטגוריה' },
    { key: 'priority', label: 'עדיפות' },
    { key: 'status', label: 'סטטוס' },
    { key: 'assignedTo', label: 'מוקצה ל' },
    { key: 'createdAt', label: 'נוצר ב' },
    { key: 'updatedAt', label: 'עודכן ב' },
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
      tasks_visible_columns: newColumns,
    };
    await updatePreferences(newPreferences);
  };

  // Calculate due date badge for priority column
  const getDueDateBadge = (dueDate) => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - yellow + star
      return {
        label: '⭐ לטיפול היום!',
        colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      };
    } else if (diffDays === 1) {
      // Tomorrow - medium (yellow)
      return {
        label: '🕐 1',
        colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      };
    } else if (diffDays > 1) {
      // More than 1 day - green (low priority color)
      return {
        label: `🕐 ${diffDays}`,
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    } else {
      // Past - overdue
      return {
        label: `🔴 לפני ${Math.abs(diffDays)} ימים`,
        colorClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    }
  };

  // Update visible columns when user preferences change
  useEffect(() => {
    if (user?.preferences?.tasks_visible_columns) {
      setVisibleColumns(user.preferences.tasks_visible_columns);
    }
  }, [user?.preferences?.tasks_visible_columns]);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      // Load all tasks - filtering will be done client-side
      const [tasksRes, customersRes, categoriesRes, usersRes] = await Promise.all([
        api.get('/tasks?limit=1000'),
        api.get('/customers?status=active&limit=1000'),
        api.get('/categories'),
        api.get('/users'),
      ]);

      let filteredTasks = tasksRes.data.tasks;

      // Filter "my tasks" to include: assigned to me, assigned to null, or assigned to "general"
      if (filter === 'my') {
        filteredTasks = filteredTasks.filter(task =>
          task.assigned_to === user?.id ||
          task.assigned_to === null ||
          task.assigned_to === 'general'
        );
      }

      setTasks(filteredTasks);
      setCustomers(customersRes.data.customers);
      setCategories(categoriesRes.data);
      setUsers(usersRes.data);

      // Load progress counts for all tasks
      loadProgressCounts(filteredTasks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgressCounts = async (tasksList) => {
    try {
      const counts = {};
      await Promise.all(
        tasksList.map(async (task) => {
          try {
            const response = await api.get(`/tasks/${task.id}/progress`);
            counts[task.id] = response.data.length;
          } catch (error) {
            counts[task.id] = 0;
          }
        })
      );
      setTaskProgressCounts(counts);
    } catch (error) {
      console.error('Error loading progress counts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };

      // Handle "general" as null for assigned_to
      if (!data.assigned_to || data.assigned_to === 'general') {
        data.assigned_to = null;
      }

      if (!data.customer_id) delete data.customer_id;
      if (!data.category_id) delete data.category_id;
      if (!data.due_date) data.due_date = null;
      if (!data.priority) delete data.priority; // Don't send empty priority
      // Keep agent_note even if empty to allow clearing it

      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, data);
      } else {
        await api.post('/tasks', data);
      }
      setShowModal(false);
      setEditingTask(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('שגיאה בשמירת משימה');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) return;

    try {
      await api.delete(`/tasks/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('שגיאה במחיקת משימה');
    }
  };

  const handleToggleComplete = async (task) => {
    if (completingTaskIds.has(task.id)) return;
    setCompletingTaskIds(prev => new Set([...prev, task.id]));
    try {
      const newStatus = task.status === 'closed' ? 'open' : 'closed';
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('שגיאה בעדכון סטטוס משימה');
    } finally {
      setCompletingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleQuickUpdate = async (taskId, field, value) => {
    try {
      // Handle special cases
      let processedValue = value;

      if (field === 'assigned_to') {
        // If empty string or "general", send null
        if (value === '' || value === 'general') {
          processedValue = null;
        }
      }

      await api.put(`/tasks/${taskId}`, { [field]: processedValue });
      loadData();
    } catch (error) {
      console.error('Error updating task:', error);
      console.error('Error details:', error.response?.data);
      alert(error.response?.data?.error || 'שגיאה בעדכון משימה');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getFilteredAndSortedTasks = () => {
    let filtered = [...tasks];

    // Filter by completed status
    if (hideCompleted) {
      filtered = filtered.filter(task => task.status !== 'closed');
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category_id === categoryFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => getDisplayPriority(task) === priorityFilter);
    }

    // Filter by customer
    if (customerFilter !== 'all') {
      filtered = filtered.filter(task => task.customer_id === customerFilter);
    }

    // Filter by search term
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(task =>
        (task.title && task.title.toLowerCase().includes(searchLower)) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        (task.customer_name && task.customer_name.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    if (!sortConfig.key) return filtered;

    return filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Special handling for priority when using auto priority
      if (sortConfig.key === 'priority' && user?.useAutoPriority) {
        aVal = getDisplayPriority(a);
        bVal = getDisplayPriority(b);
      }

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle dates
      if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at' || sortConfig.key === 'due_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Handle strings
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const SortableHeader = ({ column, children }) => (
    <th
      onClick={() => handleSort(column)}
      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
    >
      <div className="flex items-center gap-2">
        {children}
        {sortConfig.key === column ? (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      category_id: task.category_id || '',
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to || '',
      customer_id: task.customer_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      agent_note: task.agent_note || '',
    });
    // Set customer search term to customer name if exists
    setCustomerSearchTerm(task.customer_name || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      priority: 'medium',
      status: 'open',
      assigned_to: '',
      customer_id: '',
      due_date: '',
      agent_note: '',
    });
    setCustomerSearchTerm('');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getText = (value, type) => {
    const texts = {
      priority: { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' },
      status: { open: 'פתוח', in_progress: 'בטיפול', closed: 'סגור' },
    };
    return texts[type]?.[value] || value;
  };

  // Get automatic priority based on last update time
  const getAutoPriority = (updatedAt) => {
    if (!updatedAt) return 'low';

    const now = new Date();
    const updated = new Date(updatedAt);
    const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));

    // Get thresholds from user settings or use defaults
    const lowToMediumDays = user?.taskPriorityLowToMedium || 1;
    const mediumToHighDays = user?.taskPriorityMediumToHigh || 3;

    if (daysDiff >= mediumToHighDays) return 'high';
    if (daysDiff >= lowToMediumDays) return 'medium';
    return 'low';
  };

  // Get display priority - uses automatic calculation if enabled
  const getDisplayPriority = (task) => {
    if (user?.useAutoPriority) {
      return getAutoPriority(task.updated_at);
    }
    return task.priority;
  };

  const handleCustomerClick = async (customerId) => {
    if (!customerId) return;

    try {
      const response = await api.get(`/customers/${customerId}`);
      setSelectedCustomer(response.data);
      setShowCustomerModal(true);
    } catch (error) {
      console.error('Error loading customer:', error);
      alert('שגיאה בטעינת פרטי לקוח');
    }
  };

  const getSortedCustomers = () => {
    return [...customers].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return nameA.localeCompare(nameB, 'he');
    });
  };

  const getFilteredCustomers = () => {
    const sorted = getSortedCustomers();
    if (!customerSearchTerm || customerSearchTerm.trim() === '') return sorted;

    const searchLower = customerSearchTerm.toLowerCase().trim();
    return sorted.filter(customer =>
      (customer.name && customer.name.toLowerCase().includes(searchLower)) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ניהול משימות
        </h1>
        <div className="flex gap-2">
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
            משימה חדשה
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        {/* Assignment Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            כל המשימות
          </button>
          <button
            onClick={() => setFilter('my')}
            className={`px-4 py-2 rounded-md ${
              filter === 'my'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            המשימות שלי
          </button>
        </div>

        {/* Additional Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Hide Completed */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">הסתר משימות שהושלמו</span>
          </label>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">כל הקטגוריות</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">כל העדיפויות</option>
            <option value="high">גבוהה</option>
            <option value="medium">בינונית</option>
            <option value="low">נמוכה</option>
          </select>

          {/* Customer Filter */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">כל הלקוחות</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="חיפוש משימות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            טוען...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            לא נמצאו משימות
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {visibleColumns.customer && <SortableHeader column="customer_name">לקוח</SortableHeader>}
                  {visibleColumns.title && <SortableHeader column="title">כותרת</SortableHeader>}
                  {visibleColumns.priority && <SortableHeader column="priority">עדיפות</SortableHeader>}
                  {visibleColumns.category && <SortableHeader column="category_name">קטגוריה</SortableHeader>}
                  {visibleColumns.status && <SortableHeader column="status">סטטוס</SortableHeader>}
                  {visibleColumns.assignedTo && <SortableHeader column="assigned_to_name">משויך ל</SortableHeader>}
                  {visibleColumns.createdAt && <SortableHeader column="created_at">נוצר ב</SortableHeader>}
                  {visibleColumns.updatedAt && <SortableHeader column="updated_at">עודכן ב</SortableHeader>}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {getFilteredAndSortedTasks().map((task) => (
                  <tr
                    key={task.id}
                    className={`cursor-pointer transition-colors duration-150 ${
                      completingTaskIds.has(task.id)
                        ? 'bg-green-50 dark:bg-green-900/20 opacity-60 pointer-events-none'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => !completingTaskIds.has(task.id) && handleEdit(task)}
                  >
                    {visibleColumns.customer && (
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                        onClick={(e) => {
                          if (task.customer_id) {
                            e.stopPropagation();
                            handleCustomerClick(task.customer_id);
                          }
                        }}
                      >
                        {task.customer_name ? (
                          <span className={task.customer_id ? "text-primary-600 dark:text-primary-400 hover:underline cursor-pointer" : ""}>
                            {task.customer_name}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                    {visibleColumns.title && (
                      <td className="px-6 py-4 text-sm">
                        {(() => {
                          const progressCount = taskProgressCounts[task.id] || 0;
                          return (
                            <div className="flex items-center gap-1">
                              {task.agent_note && (
                                <span className="text-blue-600 dark:text-blue-400" title={`הערת נציג: ${task.agent_note}`}>
                                  🔔
                                </span>
                              )}
                              {progressCount > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskForProgress(task);
                                    setShowProgressModal(true);
                                  }}
                                  className="text-green-600 dark:text-green-400 hover:text-green-700 inline-flex items-center"
                                  title={`${progressCount} עדכוני התקדמות`}
                                >
                                  <ClipboardList className="w-4 h-4" />
                                  <span className="text-xs">({progressCount})</span>
                                </button>
                              )}
                              <div className="flex-1 truncate">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {task.title}
                                </span>
                                {task.description && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {' '}{task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    {visibleColumns.priority && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {inlineDateEditTaskId === task.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              defaultValue={task.due_date ? task.due_date.split('T')[0] : ''}
                              autoFocus
                              onBlur={(e) => {
                                const val = e.target.value;
                                handleQuickUpdate(task.id, 'due_date', val || null);
                                setInlineDateEditTaskId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setInlineDateEditTaskId(null);
                              }}
                              className="text-xs px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
                            />
                          </div>
                        ) : (
                          (() => {
                            const dueBadge = getDueDateBadge(task.due_date);
                            if (dueBadge) {
                              return (
                                <span
                                  onClick={() => setInlineDateEditTaskId(task.id)}
                                  className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 ${dueBadge.colorClass}`}
                                  title="לחץ לעריכת תאריך יעד"
                                >
                                  {dueBadge.label}
                                </span>
                              );
                            }
                            if (user?.useAutoPriority) {
                              return (
                                <span
                                  onClick={() => setInlineDateEditTaskId(task.id)}
                                  className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 ${getPriorityColor(getDisplayPriority(task))}`}
                                  title="לחץ לעריכת תאריך יעד"
                                >
                                  {getText(getDisplayPriority(task), 'priority')}
                                </span>
                              );
                            }
                            return (
                              <div className="flex items-center gap-1">
                                <select
                                  value={task.priority}
                                  onChange={(e) => handleQuickUpdate(task.id, 'priority', e.target.value)}
                                  className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${getPriorityColor(task.priority)}`}
                                >
                                  <option value="low">נמוכה</option>
                                  <option value="medium">בינונית</option>
                                  <option value="high">גבוהה</option>
                                </select>
                                <button
                                  onClick={() => setInlineDateEditTaskId(task.id)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                                  title="הגדר תאריך יעד"
                                >
                                  📅
                                </button>
                              </div>
                            );
                          })()
                        )}
                      </td>
                    )}
                    {visibleColumns.category && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.category_name || '-'}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickUpdate(task.id, 'status', e.target.value)}
                          className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${getStatusColor(task.status)}`}
                        >
                          <option value="open">פתוח</option>
                          <option value="in_progress">בטיפול</option>
                          <option value="closed">סגור</option>
                        </select>
                      </td>
                    )}
                    {visibleColumns.assignedTo && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.assigned_to || ''}
                          onChange={(e) => handleQuickUpdate(task.id, 'assigned_to', e.target.value || null)}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">לא משויך</option>
                          <option value="general">כללי (כולם)</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(task.created_at)}
                      </td>
                    )}
                    {visibleColumns.updatedAt && (
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(task.updated_at)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          disabled={completingTaskIds.has(task.id)}
                          className={`transition-opacity ${
                            completingTaskIds.has(task.id)
                              ? 'opacity-50 cursor-not-allowed'
                              : task.status === 'closed'
                              ? 'text-green-600 hover:text-green-700 dark:text-green-400'
                              : 'text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400'
                          }`}
                          title={task.status === 'closed' ? 'סמן כפתוח' : 'סמן כהושלם'}
                        >
                          {completingTaskIds.has(task.id) ? (
                            <svg className="w-4 h-4 animate-spin text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                            </svg>
                          ) : (
                            <CheckCircle className={`w-4 h-4 ${task.status === 'closed' ? 'fill-current' : ''}`} />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(task)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
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

      {/* Customer Modal */}
      <CustomerModal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customer={selectedCustomer}
      />

      {/* Progress Modal */}
      <ProgressModal
        show={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedTaskForProgress(null);
          loadData(); // Reload to update progress counts
        }}
        task={selectedTaskForProgress}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingTask ? 'עריכת משימה' : 'משימה חדשה'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    כותרת *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תיאור
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      🔔 הערת נציג {editingTask?.agent_note_author && `(${editingTask.agent_note_author})`}
                    </label>
                    <textarea
                      value={formData.agent_note}
                      onChange={(e) => setFormData({ ...formData, agent_note: e.target.value })}
                      rows={3}
                      placeholder="הערה פנימית לנציגים..."
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>
                  {editingTask && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForProgress(editingTask);
                        setShowProgressModal(true);
                        setShowModal(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                    >
                      <ClipboardList className="w-4 h-4" />
                      התקדמות טיפול {taskProgressCounts[editingTask.id] > 0 && `(${taskProgressCounts[editingTask.id]})`}
                    </button>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    לקוח
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="חפש לקוח (שם, טלפון, אימייל)..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onFocus={() => setCustomerSearchTerm(customerSearchTerm || '')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    {customerSearchTerm && (
                      <div className="relative flex-1">
                        <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                          {getFilteredCustomers().length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                              לא נמצאו לקוחות
                            </div>
                          ) : (
                            getFilteredCustomers().map((customer) => (
                              <div
                                key={customer.id}
                                onClick={() => {
                                  setFormData({ ...formData, customer_id: customer.id });
                                  setCustomerSearchTerm(customer.name);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-white"
                              >
                                {customer.name}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      קטגוריה
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">בחר קטגוריה</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      עדיפות
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">נמוכה</option>
                      <option value="medium">בינונית</option>
                      <option value="high">גבוהה</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      משויך ל
                    </label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">בחר עובד</option>
                      <option value="general">כללי (כולם)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      תאריך יעד
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 flex-wrap">
                {editingTask && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStatus = formData.status === 'closed' ? 'open' : 'closed';
                      setFormData({ ...formData, status: newStatus });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                      formData.status === 'closed'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {formData.status === 'closed' ? 'סמן כפתוח' : 'סמן כהושלם'}
                  </button>
                )}
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
                    setEditingTask(null);
                    resetForm();
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
    </div>
  );
};

export default Tasks;
