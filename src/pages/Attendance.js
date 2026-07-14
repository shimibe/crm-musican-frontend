import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Clock, Play, Square, Plus, Edit, Trash2, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as XLSX from 'xlsx';

const Attendance = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showWorkFromHomePrompt, setShowWorkFromHomePrompt] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [totals, setTotals] = useState({
    totalHours: 0,
    workFromHome: 0,
    workFromOffice: 0,
    totalDays: 0,
    estimatedSalary: 0
  });

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Initialize filters from localStorage or use current month as default
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('attendanceFilterMonth');
    return saved !== null ? saved : (new Date().getMonth() + 1).toString();
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('attendanceFilterYear');
    return saved || new Date().getFullYear().toString();
  });
  const [selectedUserId, setSelectedUserId] = useState(() => {
    return localStorage.getItem('attendanceFilterUserId') || '';
  });

  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    work_from_home: false,
  });

  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Save filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem('attendanceFilterMonth', selectedMonth);
    localStorage.setItem('attendanceFilterYear', selectedYear);
    localStorage.setItem('attendanceFilterUserId', selectedUserId);
  }, [selectedMonth, selectedYear, selectedUserId]);

  useEffect(() => {
    loadShifts();
    checkActiveShift();
    if (isAdmin || isManager) {
      loadUsers();
      loadActiveEmployees();
    }
  }, [selectedMonth, selectedYear, selectedUserId]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);
      if ((isAdmin || isManager) && selectedUserId) {
        params.append('user_id', selectedUserId);
      }

      const response = await api.get(`/attendance/shifts?${params.toString()}`);
      setShifts(response.data.shifts || []);
      setTotals(response.data.totals || {
        totalHours: 0,
        workFromHome: 0,
        workFromOffice: 0,
        totalDays: 0,
        estimatedSalary: 0
      });
      setCanEdit(response.data.canEdit || false);
    } catch (error) {
      console.error('Error loading shifts:', error);
      alert('שגיאה בטעינת משמרות');
    } finally {
      setLoading(false);
    }
  };

  const checkActiveShift = async () => {
    try {
      const response = await api.get('/attendance/active-shift');
      setHasActiveShift(response.data.hasActiveShift);
      setActiveShift(response.data.activeShift);
    } catch (error) {
      console.error('Error checking active shift:', error);
    }
  };

  const loadActiveEmployees = async () => {
    try {
      const response = await api.get('/attendance/active-shifts/all');
      setActiveEmployees(response.data.activeShifts || []);
    } catch (error) {
      console.error('Error loading active employees:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const handleStartShift = () => {
    setShowWorkFromHomePrompt(true);
  };

  const confirmStartShift = async (workFromHome) => {
    try {
      await api.post('/attendance/shifts/start', { work_from_home: workFromHome });
      setShowWorkFromHomePrompt(false);
      await checkActiveShift();
      // Trigger sidebar update by reloading the page
      window.location.reload();
    } catch (error) {
      console.error('Error starting shift:', error);
      alert(error.response?.data?.error || 'שגיאה בהתחלת משמרת');
    }
  };

  const handleEndShift = () => {
    setConfirmDialog({
      title: 'סיום משמרת',
      message: 'האם אתה בטוח שברצונך לסיים את המשמרת?',
      confirmLabel: 'סיים',
      onConfirm: async () => {
        try {
          await api.post('/attendance/shifts/end');
          setConfirmDialog(null);
          await checkActiveShift();
          await loadShifts();
          window.location.reload();
        } catch (error) {
          console.error('Error ending shift:', error);
          alert(error.response?.data?.error || 'שגיאה בסיום משמרת');
        }
      },
    });
  };

  const handleManualEntry = () => {
    setEditingShift(null);
    setManualForm({
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      work_from_home: false,
    });
    setShowManualModal(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    const startDate = new Date(shift.start_time);
    const endDate = new Date(shift.end_time);
    setManualForm({
      date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_time: endDate.toTimeString().slice(0, 5),
      work_from_home: shift.work_from_home,
    });
    setShowManualModal(true);
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${manualForm.date}T${manualForm.start_time}`);
      const endDateTime = new Date(`${manualForm.date}T${manualForm.end_time}`);

      const data = {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        work_from_home: manualForm.work_from_home,
      };

      if ((isAdmin || isManager) && selectedUserId) {
        data.user_id = selectedUserId;
      }

      if (editingShift) {
        await api.patch(`/attendance/shifts/${editingShift.id}`, data);
      } else {
        await api.post('/attendance/shifts', data);
      }

      setShowManualModal(false);
      setEditingShift(null);
      await loadShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert(error.response?.data?.error || 'שגיאה בשמירת משמרת');
    }
  };

  const handleDeleteShift = (id) => {
    setConfirmDialog({
      title: 'מחיקת משמרת',
      message: 'האם אתה בטוח שברצונך למחוק משמרת זו?',
      onConfirm: async () => {
        try {
          await api.delete(`/attendance/shifts/${id}`);
          setConfirmDialog(null);
          await loadShifts();
        } catch (error) {
          console.error('Error deleting shift:', error);
          alert(error.response?.data?.error || 'שגיאה במחיקת משמרת');
        }
      },
    });
  };

  const handleInlineEdit = (shiftId, field, currentValue) => {
    setEditingCell({ shiftId, field });
    if (field === 'start_time' || field === 'end_time') {
      setEditingValue(toLocalISOString(currentValue));
    } else {
      setEditingValue(currentValue || '');
    }
  };

  const handleInlineSave = async (shiftId) => {
    if (!editingCell) return;

    try {
      const data = {};
      if (editingCell.field === 'start_time' || editingCell.field === 'end_time') {
        // Parse the datetime-local value (which is in local time) and convert to ISO
        const localDate = new Date(editingValue);
        data[editingCell.field] = localDate.toISOString();
      } else {
        data[editingCell.field] = editingValue;
      }

      await api.patch(`/attendance/shifts/${shiftId}`, data);
      setEditingCell(null);
      setEditingValue('');
      await loadShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert('שגיאה בעדכון');
    }
  };

  const handleInlineToggle = async (shiftId, field, currentValue) => {
    try {
      await api.patch(`/attendance/shifts/${shiftId}`, {
        [field]: !currentValue
      });
      await loadShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert('שגיאה בעדכון');
    }
  };

  const handleInlineCancel = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const exportToExcel = () => {
    const exportData = shifts.map(shift => {
      const startDate = new Date(shift.start_time);
      const endDate = new Date(shift.end_time);
      const hours = parseFloat(shift.hours) || 0;

      return {
        'תאריך': startDate.toLocaleDateString('he-IL'),
        'יום': getDayOfWeek(shift.start_time),
        'שעת התחלה': startDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        'שעת סיום': endDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        'סה"כ שעות': `${Math.floor(hours)}:${String(Math.round((hours % 1) * 60)).padStart(2, '0')}`,
        'עבודה מהבית': shift.work_from_home ? 'כן' : '',
      };
    });

    // Add summary rows
    const summaryRows = [
      {},
      { 'תאריך': 'סיכום:' },
      { 'תאריך': 'סה"כ שעות', 'שעת התחלה': `${Math.floor(totals.totalHours)}:${String(Math.round((totals.totalHours % 1) * 60)).padStart(2, '0')}` },
      { 'תאריך': 'עבודה מהבית', 'שעת התחלה': totals.workFromHome },
      { 'תאריך': 'עבודה מהמשרד', 'שעת התחלה': totals.workFromOffice },
      { 'תאריך': 'סה"כ ימי עבודה', 'שעת התחלה': totals.totalDays },
      { 'תאריך': 'משכורת ברוטו משוערת (₪)', 'שעת התחלה': totals.estimatedSalary.toFixed(2) },
    ];

    const allData = [...exportData, ...summaryRows];

    const ws = XLSX.utils.json_to_sheet(allData, { skipHeader: false });

    // Set RTL for the worksheet
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][0] = { width: 15 };
    ws['!cols'][1] = { width: 15 };
    ws['!cols'][2] = { width: 15 };
    ws['!cols'][3] = { width: 15 };
    ws['!cols'][4] = { width: 15 };

    // Create workbook and set RTL
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'משמרות');

    // Set workbook to RTL
    if (!wb.Workbook) wb.Workbook = {};
    if (!wb.Workbook.Views) wb.Workbook.Views = [];
    wb.Workbook.Views[0] = { RTL: true };

    const fileName = `משמרות_${users ? users.find(user => user.id === selectedUserId)?.full_name : user.full_name}_${selectedYear}_${selectedMonth || 'כל_השנה'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours % 1) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const getDayOfWeek = (dateString) => {
    if (!dateString) return '-';
    const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'שבת'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const toLocalISOString = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Generate month options
  const months = [
    { value: '', label: 'כל החודשים' },
    { value: '1', label: 'ינואר' },
    { value: '2', label: 'פברואר' },
    { value: '3', label: 'מרץ' },
    { value: '4', label: 'אפריל' },
    { value: '5', label: 'מאי' },
    { value: '6', label: 'יוני' },
    { value: '7', label: 'יולי' },
    { value: '8', label: 'אוגוסט' },
    { value: '9', label: 'ספטמבר' },
    { value: '10', label: 'אוקטובר' },
    { value: '11', label: 'נובמבר' },
    { value: '12', label: 'דצמבר' },
  ];

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map(y => ({
    value: y.toString(),
    label: y.toString()
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-8 h-8" />
          שעון נוכחות
        </h1>
        <div className="flex gap-2">
          {hasActiveShift ? (
            <button
              onClick={handleEndShift}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Square className="w-5 h-5" />
              סוף משמרת
            </button>
          ) : (
            <button
              onClick={handleStartShift}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Play className="w-5 h-5" />
              התחלת משמרת
            </button>
          )}
          <button
            onClick={handleManualEntry}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            הזנה ידנית
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={shifts.length === 0}
          >
            <Download className="w-5 h-5" />
            EXCEL
          </button>
        </div>
      </div>

      {/* Active Employees List (Manager/Admin Only) */}
      {console.log("activeEmployees", activeEmployees)}
      
      {(isAdmin || isManager) && activeEmployees.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <span className="text-xl">🟢</span>
            עובדים במשמרת פעילה ({activeEmployees.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeEmployees.map(emp => {
              const elapsedHours = parseFloat(emp.elapsed_hours) || 0;
              return (
                <div key={emp.id} className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
                  <div className="font-medium text-gray-900 dark:text-white">{emp.user_name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    התחיל: {formatTime(emp.start_time)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    זמן עבודה: {formatHours(elapsedHours)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {emp.work_from_home ? '🏠 מהבית' : '🏢 מהמשרד'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              חודש
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              שנה
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>{year.label}</option>
              ))}
            </select>
          </div>

          {(isAdmin || isManager) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                עובד
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">כל העובדים</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">סה"כ שעות</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatHours(totals.totalHours)}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">עבודה מהבית</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totals.workFromHome}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">עבודה מהמשרד</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totals.workFromOffice}
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">סה"כ ימי עבודה</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totals.totalDays}
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">משכורת ברוטו משוערת</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ₪{totals.estimatedSalary.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              (לפני הפחתות, נסיעות ובונוסים)
            </div>
          </div>
        </div>
      </div>

      {/* Open Shift Alert */}
      {hasActiveShift && activeShift && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              יש לך משמרת פתוחה! התחלת ב-{formatTime(activeShift.start_time)}
              {activeShift.work_from_home ? ' (מהבית)' : ' (מהמשרד)'}
            </span>
          </div>
        </div>
      )}

      {/* Shifts Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  תאריך
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  יום
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  שעת התחלה
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  שעת סיום
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  סה"כ שעות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  עבודה מהבית
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    לא נמצאו משמרות
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(shift.start_time)}
                    </td>
                    {/* Day of Week */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                      {getDayOfWeek(shift.start_time)}
                    </td>
                    {/* Start Time - Inline Edit */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {canEdit && editingCell?.shiftId === shift.id && editingCell?.field === 'start_time' ? (
                        <input
                          type="datetime-local"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineSave(shift.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleInlineSave(shift.id);
                            if (e.key === 'Escape') handleInlineCancel();
                          }}
                          autoFocus
                          className="w-full px-2 py-1 border border-primary-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            if (canEdit) {
                              handleInlineEdit(shift.id, 'start_time', shift.start_time);
                            }
                          }}
                          className={canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded' : ''}
                        >
                          {formatTime(shift.start_time)}
                        </span>
                      )}
                    </td>
                    {/* End Time - Inline Edit */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {canEdit && editingCell?.shiftId === shift.id && editingCell?.field === 'end_time' ? (
                        <input
                          type="datetime-local"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleInlineSave(shift.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleInlineSave(shift.id);
                            if (e.key === 'Escape') handleInlineCancel();
                          }}
                          autoFocus
                          className="w-full px-2 py-1 border border-primary-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            if (canEdit) {
                              handleInlineEdit(shift.id, 'end_time', shift.end_time);
                            }
                          }}
                          className={canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded' : ''}
                        >
                          {formatTime(shift.end_time)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatHours(parseFloat(shift.hours) || 0)}
                    </td>
                    {/* Work From Home - Checkbox */}
                    <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                      <input
                        type="checkbox"
                        checked={shift.work_from_home || false}
                        onChange={() => {
                          if (canEdit) {
                            handleInlineToggle(shift.id, 'work_from_home', shift.work_from_home);
                          }
                        }}
                        disabled={!canEdit}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                      {canEdit && (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditShift(shift)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work From Home Prompt Modal */}
      {showWorkFromHomePrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                האם המשמרת היא מהבית?
              </h3>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => confirmStartShift(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  כן, מהבית
                </button>
                <button
                  onClick={() => confirmStartShift(false)}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  לא, מהמשרד
                </button>
                <button
                  onClick={() => setShowWorkFromHomePrompt(false)}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingShift ? 'עריכת משמרת' : 'הזנה ידנית'}
              </h3>
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setEditingShift(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  תאריך *
                </label>
                <input
                  type="date"
                  required
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שעת התחלה *
                </label>
                <input
                  type="time"
                  required
                  value={manualForm.start_time}
                  onChange={(e) => setManualForm({ ...manualForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  שעת סיום *
                </label>
                <input
                  type="time"
                  required
                  value={manualForm.end_time}
                  onChange={(e) => setManualForm({ ...manualForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="work_from_home"
                  checked={manualForm.work_from_home}
                  onChange={(e) => setManualForm({ ...manualForm, work_from_home: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                />
                <label htmlFor="work_from_home" className="text-sm text-gray-700 dark:text-gray-300">
                  עבודה מהבית
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualModal(false);
                    setEditingShift(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  {editingShift ? 'עדכן' : 'צור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmDialog
          {...confirmDialog}
          confirmLabel={confirmDialog.confirmLabel || 'מחק'}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default Attendance;
