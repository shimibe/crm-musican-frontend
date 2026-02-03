import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Copy, Plus, Trash2, CheckCircle, X } from 'lucide-react';
import * as billingApi from '../../services/studioBillingApi';

const StudioBillingApp = () => {
  const [clientName, setClientName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [percentDiscount, setPercentDiscount] = useState('');
  const [shekelDiscount, setShekelDiscount] = useState('');
  const [additionalItems, setAdditionalItems] = useState([]);
  const [hourlyRate, setHourlyRate] = useState(250);

  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Client history with invoices
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientInvoices, setClientInvoices] = useState([]);

  // Generated invoice
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);

  // Modals
  const [showDebtorsModal, setShowDebtorsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // Edit form data
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPercentDiscount, setEditPercentDiscount] = useState('');
  const [editShekelDiscount, setEditShekelDiscount] = useState('');
  const [editAdditionalItems, setEditAdditionalItems] = useState([]);
  const [editHourlyRate, setEditHourlyRate] = useState(250);

  // Debtors data
  const [debtors, setDebtors] = useState([]);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  // Load invoices when client is selected
  useEffect(() => {
    if (selectedClient) {
      loadClientInvoices(selectedClient.id);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      const data = await billingApi.getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      alert('שגיאה בטעינת לקוחות');
    }
  };

  const loadClientInvoices = async (clientId) => {
    try {
      const data = await billingApi.getInvoices({ client_id: clientId });
      setClientInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const loadDebtors = async () => {
    try {
      const data = await billingApi.getDebtors();
      setDebtors(data);
    } catch (error) {
      console.error('Failed to load debtors:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerStart) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - timerStart);
      }, 1000);
    } else if (!isTimerRunning) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStart]);

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDateToHebrew = (dateStr) => {
    const date = new Date(dateStr);
    const dayNames = ['יום א\'', 'יום ב\'', 'יום ג\'', 'יום ד\'', 'יום ה\'', 'יום ו\'', 'יום ש\''];
    const dayName = dayNames[date.getDay()];
    const formatted = date.toLocaleDateString('he-IL');
    return `${dayName}, ${formatted}`;
  };

  const formatHours = (hours) => {
    return hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
  };

  const updateHourlyRate = (value) => {
    const rate = parseFloat(value) || 250;
    setHourlyRate(rate);
  };

  const startTimer = () => {
    setTimerStart(Date.now() - elapsedTime);
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (elapsedTime > 0) {
      const now = new Date();
      const start = new Date(now.getTime() - elapsedTime);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndTime(now.toTimeString().slice(0, 5));
    }
    setElapsedTime(0);
    setTimerStart(null);
  };

  const addAdditionalItem = () => {
    setAdditionalItems([...additionalItems, { description: '', price: '' }]);
  };

  const updateAdditionalItem = (index, field, value) => {
    const updated = additionalItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setAdditionalItems(updated);
  };

  const removeAdditionalItem = (index) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end - start) / 3600000; // hours
  };

  const calculateTotal = () => {
    const duration = calculateDuration();
    let studioPrice = duration * hourlyRate;

    if (percentDiscount) {
      studioPrice *= (1 - parseFloat(percentDiscount) / 100);
    }
    if (shekelDiscount) {
      studioPrice -= parseFloat(shekelDiscount);
    }
    studioPrice = Math.max(0, studioPrice);

    const additionalTotal = additionalItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

    return studioPrice + additionalTotal;
  };

  const loadClient = async (name) => {
    setClientName(name);
    const client = clients.find(c => c.name === name);
    if (client) {
      setSelectedClient(client);
    }
  };

  const getUnpaidInvoices = () => {
    return clientInvoices.filter(invoice => !invoice.paid) || [];
  };

  const getTotalUnpaid = () => {
    return getUnpaidInvoices().reduce((sum, invoice) => sum + parseFloat(invoice.total), 0);
  };

  const generateInvoice = async () => {
    try {
      const duration = calculateDuration();
      const currentTotal = calculateTotal();

      if (!clientName.trim()) {
        alert('נא להזין שם לקוח');
        return;
      }

      if (!startTime || !endTime) {
        alert('נא להזין שעות התחלה וסיום');
        return;
      }

      // Create or get client
      let client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (!client) {
        client = await billingApi.createClient({ name: clientName });
        await loadClients();
      }

      // Create invoice
      const invoiceData = {
        client_id: client.id,
        invoice_date: date,
        start_time: startTime,
        end_time: endTime,
        duration: duration,
        hourly_rate: hourlyRate,
        percent_discount: percentDiscount || 0,
        shekel_discount: shekelDiscount || 0,
        additional_items: additionalItems.filter(item => item.description && item.price)
      };

      const newInvoice = await billingApi.createInvoice(invoiceData);

      // Reload data
      await loadClients();
      await loadClientInvoices(client.id);
      setSelectedClient(client);

      // Generate invoice text
      const unpaidInvoices = await billingApi.getInvoices({
        client_id: client.id,
        paid: false
      });

      const invoiceText = generateInvoiceText(unpaidInvoices);
      const paymentUrl = generatePaymentLink(unpaidInvoices);

      setGeneratedInvoice(invoiceText);
      setPaymentLink(paymentUrl);
      setCurrentInvoiceId(newInvoice.id);

      alert('החשבון נוצר בהצלחה! 📋');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('שגיאה ביצירת החשבון: ' + (error.response?.data?.error || error.message));
    }
  };

  const generateInvoiceText = (invoices) => {
    if (invoices.length === 0) return '';

    const unpaidTotal = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);

    let invoice = `🎙️ *חשבון אולפן הקלטות*\n\n`;

    if (invoices.length > 1) {
      invoice += `*חשבונות קודמים -*\n`;
      invoices.slice(0, -1).forEach(inv => {
        invoice += `${formatDateToHebrew(inv.invoice_date)}\n`;
        invoice += `${inv.start_time}-${inv.end_time}\n`;
        invoice += `${formatHours(inv.duration)} שעות - *${parseFloat(inv.studio_price).toFixed(0)} ש"ח*\n`;

        (inv.items || []).forEach(item => {
          if (item.description && item.price) {
            invoice += `${item.description} - *${parseFloat(item.price).toFixed(0)} ש"ח*\n`;
          }
        });
        invoice += `\n`;
      });

      const lastInvoice = invoices[invoices.length - 1];
      invoice += `*חשבון היום -*\n`;
      invoice += `${formatDateToHebrew(lastInvoice.invoice_date)}\n`;
      invoice += `${lastInvoice.start_time}-${lastInvoice.end_time}\n`;
      invoice += `${formatHours(lastInvoice.duration)} שעות - *${parseFloat(lastInvoice.studio_price).toFixed(0)} ש"ח*\n`;

      (lastInvoice.items || []).forEach(item => {
        if (item.description && item.price) {
          invoice += `${item.description} - *${parseFloat(item.price).toFixed(0)} ש"ח*\n`;
        }
      });
    } else {
      const singleInvoice = invoices[0];
      invoice += `*חשבון היום -*\n`;
      invoice += `${formatDateToHebrew(singleInvoice.invoice_date)}\n`;
      invoice += `${singleInvoice.start_time}-${singleInvoice.end_time}\n`;
      invoice += `${formatHours(singleInvoice.duration)} שעות - *${parseFloat(singleInvoice.studio_price).toFixed(0)} ש"ח*\n`;

      (singleInvoice.items || []).forEach(item => {
        if (item.description && item.price) {
          invoice += `${item.description} - *${parseFloat(item.price).toFixed(0)} ש"ח*\n`;
        }
      });
    }

    invoice += `---------\n`;
    invoice += `סה"כ לתשלום: *${unpaidTotal.toFixed(0)} ש"ח*\n\n`;
    invoice += `תודה! 🙏`;

    return invoice;
  };

  const generatePaymentLink = (invoices) => {
    if (invoices.length === 0) return '';

    const unpaidTotal = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const totalStudioHours = invoices.reduce((sum, inv) => sum + parseFloat(inv.duration), 0);

    let serviceDescription = `${formatHours(totalStudioHours)} שעות אולפן`;

    const allAdditionalItems = [];
    invoices.forEach(inv => {
      if (inv.items) {
        allAdditionalItems.push(...inv.items);
      }
    });

    const additionalItemsNames = allAdditionalItems
      .filter(item => item.description && item.price)
      .map(item => item.description);

    if (additionalItemsNames.length > 0) {
      serviceDescription += `, ${additionalItemsNames.join(', ')}`;
    }

    return `https://sbe-studio.com/pay?a=${Math.round(unpaidTotal)}&s=${encodeURI(serviceDescription)}`;
  };

  const markInvoicePaid = async (invoiceId, paid = true) => {
    try {
      await billingApi.markInvoicePaid(invoiceId, paid);

      if (selectedClient) {
        await loadClientInvoices(selectedClient.id);
      }
      await loadClients();

      alert(paid ? 'החשבון סומן כשולם ✅' : 'החשבון סומן כלא שולם');
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      alert('שגיאה בעדכון סטטוס תשלום');
    }
  };

  const deleteInvoice = async (invoiceId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את החשבון?')) {
      return;
    }

    try {
      await billingApi.deleteInvoice(invoiceId);

      if (selectedClient) {
        await loadClientInvoices(selectedClient.id);
      }
      await loadClients();

      alert('החשבון נמחק בהצלחה 🗑️');
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('שגיאה במחיקת החשבון');
    }
  };

  const startEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setEditStartTime(invoice.start_time);
    setEditEndTime(invoice.end_time);
    setEditDate(invoice.invoice_date);
    setEditPercentDiscount(invoice.percent_discount);
    setEditShekelDiscount(invoice.shekel_discount);
    setEditAdditionalItems(invoice.items || []);
    setEditHourlyRate(invoice.hourly_rate);
    setShowEditModal(true);
  };

  const saveEditedInvoice = async () => {
    try {
      const editDuration = calculateEditDuration();

      const invoiceData = {
        invoice_date: editDate,
        start_time: editStartTime,
        end_time: editEndTime,
        duration: editDuration,
        hourly_rate: editHourlyRate,
        percent_discount: editPercentDiscount || 0,
        shekel_discount: editShekelDiscount || 0,
        additional_items: editAdditionalItems.filter(item => item.description && item.price)
      };

      await billingApi.updateInvoice(editingInvoice.id, invoiceData);

      if (selectedClient) {
        await loadClientInvoices(selectedClient.id);
      }
      await loadClients();

      setShowEditModal(false);
      setEditingInvoice(null);

      alert('החשבון עודכן בהצלחה ✅');
    } catch (error) {
      console.error('Failed to update invoice:', error);
      alert('שגיאה בעדכון החשבון');
    }
  };

  const calculateEditDuration = () => {
    if (!editStartTime || !editEndTime) return 0;
    const start = new Date(`2000-01-01T${editStartTime}`);
    const end = new Date(`2000-01-01T${editEndTime}`);
    return (end - start) / 3600000;
  };

  const updateEditAdditionalItem = (index, field, value) => {
    const updated = editAdditionalItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setEditAdditionalItems(updated);
  };

  const removeEditAdditionalItem = (index) => {
    setEditAdditionalItems(editAdditionalItems.filter((_, i) => i !== index));
  };

  const addEditAdditionalItem = () => {
    setEditAdditionalItems([...editAdditionalItems, { description: '', price: '' }]);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedInvoice);
    alert('הטקסט הועתק ללוח! 📋');
  };

  const openDebtorsModal = async () => {
    await loadDebtors();
    setShowDebtorsModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        🎙️ מערכת חיוב אולפן הקלטות
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel - Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-blue-800">פרטי הסשן</h2>

            {/* Client Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">שם הלקוח</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="flex-1 p-2 border rounded-md"
                  placeholder="הכנס שם לקוח"
                />
                <select
                  onChange={(e) => loadClient(e.target.value)}
                  className="p-2 border rounded-md bg-white"
                  value=""
                >
                  <option value="">בחר לקוח קיים</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.name}>{client.name}</option>
                  ))}
                </select>
              </div>
              {selectedClient && (
                <div className="mt-2 text-sm text-blue-600">
                  חוב לא שולם: ₪{selectedClient.total_unpaid || 0} |
                  חשבונות: {selectedClient.unpaid_invoices || 0} לא שולמו, {(selectedClient.total_invoices || 0) - (selectedClient.unpaid_invoices || 0)} שולמו
                </div>
              )}
            </div>

            {/* Timer Section */}
            <div className="mb-4 p-4 bg-white rounded-md border">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">טיימר</span>
                <div className="text-2xl font-mono">
                  {formatTime(elapsedTime)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={startTimer}
                  disabled={isTimerRunning}
                  className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md disabled:opacity-50 cursor-pointer"
                >
                  <Play size={16} /> התחל
                </button>
                <button
                  onClick={pauseTimer}
                  disabled={!isTimerRunning}
                  className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50 cursor-pointer"
                >
                  <Pause size={16} /> השהה
                </button>
                <button
                  onClick={stopTimer}
                  className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-md cursor-pointer"
                >
                  <Square size={16} /> עצור
                </button>
              </div>
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">שעת התחלה</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">שעת סיום</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">תאריך</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">תעריף שעתי (₪)</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => updateHourlyRate(e.target.value)}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
          </div>

          {/* Discounts */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-yellow-800">הנחות (רק על זמן אולפן)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">הנחה באחוזים (%)</label>
                <input
                  type="number"
                  value={percentDiscount}
                  onChange={(e) => setPercentDiscount(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">הנחה בשקלים (₪)</label>
                <input
                  type="number"
                  value={shekelDiscount}
                  onChange={(e) => setShekelDiscount(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Additional Items */}
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-green-800">תוספות</h3>
              <button
                onClick={addAdditionalItem}
                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md cursor-pointer"
              >
                <Plus size={16} /> הוסף
              </button>
            </div>
            {additionalItems.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateAdditionalItem(index, 'description', e.target.value)}
                  placeholder="תיאור"
                  className="flex-1 p-2 border rounded-md"
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateAdditionalItem(index, 'price', e.target.value)}
                  placeholder="מחיר"
                  className="w-24 p-2 border rounded-md"
                  min="0"
                />
                <button
                  onClick={() => removeAdditionalItem(index)}
                  className="p-2 bg-red-500 text-white rounded-md cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={generateInvoice}
            className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg text-lg hover:bg-blue-700 mb-4 cursor-pointer"
          >
            🧾 צור חשבון
          </button>

          <button
            onClick={openDebtorsModal}
            className="w-full p-4 bg-purple-600 text-white font-bold rounded-lg text-lg hover:bg-purple-700 cursor-pointer"
          >
            👥 רשימת חייבים ({debtors.length})
          </button>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-gray-800">תצוגה מקדימה</h3>
            <div className="space-y-2 text-sm">
              <div><strong>משך הסשן:</strong> {formatHours(calculateDuration())} שעות</div>
              <div><strong>מחיר בסיס:</strong> ₪{(calculateDuration() * hourlyRate).toFixed(2)}</div>
              <div><strong>אחרי הנחות:</strong> ₪{(calculateDuration() * hourlyRate * (1 - (parseFloat(percentDiscount) || 0) / 100) - (parseFloat(shekelDiscount) || 0)).toFixed(2)}</div>
              <div><strong>תוספות:</strong> ₪{additionalItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)}</div>
              <div className="text-lg font-bold text-blue-600">
                <strong>סך הכל היום:</strong> ₪{calculateTotal().toFixed(2)}
              </div>
              {selectedClient && getTotalUnpaid() > 0 && (
                <div className="text-lg font-bold text-red-600">
                  <strong>כולל חובות:</strong> ₪{(calculateTotal() + getTotalUnpaid()).toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Generated Invoice */}
          {generatedInvoice && (
            <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-blue-800">חשבון מוכן</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => markInvoicePaid(currentInvoiceId)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md cursor-pointer"
                  >
                    <CheckCircle size={16} /> שולם
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-md cursor-pointer"
                  >
                    <Copy size={16} /> העתק
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-line text-sm bg-gray-50 p-4 rounded-md border font-mono">
                {generatedInvoice}
              </div>
            </div>
          )}

          {/* Payment Link */}
          {paymentLink && (
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-green-800">קישור תשלום</h3>
                <button
                  onClick={() => {navigator.clipboard.writeText(paymentLink); alert('קישור תשלום הועתק ללוח! 🔗');}}
                  className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md cursor-pointer"
                >
                  <Copy size={16} /> העתק קישור
                </button>
              </div>
              <div className="text-sm bg-white p-4 rounded-md border break-all">
                {paymentLink}
              </div>
            </div>
          )}

          {/* Client History */}
          {selectedClient && clientInvoices.length > 0 && (
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-purple-800">היסטוריית {selectedClient.name}</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {clientInvoices.map((invoice) => (
                  <div key={invoice.id} className={`flex justify-between items-center text-sm p-3 rounded ${invoice.paid ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="flex-1">
                      <div className="font-medium">{formatDateToHebrew(invoice.invoice_date)}</div>
                      <div className="text-xs text-gray-600">{invoice.start_time}-{invoice.end_time} ({formatHours(invoice.duration)}ש)</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₪{parseFloat(invoice.total).toFixed(0)}</span>
                      <div className="flex gap-1">
                        {!invoice.paid && (
                          <button
                            onClick={() => markInvoicePaid(invoice.id)}
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
                            title="סמן כשולם"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {invoice.paid && (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                        <button
                          onClick={() => startEditInvoice(invoice)}
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                          title="ערוך"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteInvoice(invoice.id)}
                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                          title="מחק"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-bold">
                  <span>לא שולם:</span>
                  <span className="text-red-600">₪{getTotalUnpaid().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debtors Modal */}
      {showDebtorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">👥 רשימת חייבים</h2>
              <button
                onClick={() => setShowDebtorsModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {debtors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                🎉 אין חובות פתוחים!
              </div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-purple-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-800">
                      ₪{debtors.reduce((sum, d) => sum + parseFloat(d.total_unpaid), 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">
                      סה"כ חובות | {debtors.length} חייבים
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {debtors.map(debtor => (
                    <div key={debtor.client_id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-lg">{debtor.client_name}</div>
                          <div className="text-sm text-gray-600">
                            {debtor.unpaid_count} חשבונות לא שולמו
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-red-600">
                            ₪{parseFloat(debtor.total_unpaid).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            loadClient(debtor.client_name);
                            setShowDebtorsModal(false);
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 cursor-pointer"
                        >
                          📝 צור חשבון חדש
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">✏️ עריכת חשבון</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Time inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">שעת התחלה</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">שעת סיום</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2">תאריך</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {/* Hourly Rate */}
              <div>
                <label className="block text-sm font-medium mb-2">תעריף שעתי (₪)</label>
                <input
                  type="number"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(parseFloat(e.target.value) || 250)}
                  className="w-full p-2 border rounded-md"
                  min="0"
                />
              </div>

              {/* Discounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">הנחה באחוזים (%)</label>
                  <input
                    type="number"
                    value={editPercentDiscount}
                    onChange={(e) => setEditPercentDiscount(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">הנחה בשקלים (₪)</label>
                  <input
                    type="number"
                    value={editShekelDiscount}
                    onChange={(e) => setEditShekelDiscount(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    min="0"
                  />
                </div>
              </div>

              {/* Additional Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">תוספות</label>
                  <button
                    onClick={addEditAdditionalItem}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm cursor-pointer"
                  >
                    + הוסף
                  </button>
                </div>
                {editAdditionalItems.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateEditAdditionalItem(index, 'description', e.target.value)}
                      placeholder="תיאור"
                      className="flex-1 p-2 border rounded-md"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateEditAdditionalItem(index, 'price', e.target.value)}
                      placeholder="מחיר"
                      className="w-24 p-2 border rounded-md"
                      min="0"
                    />
                    <button
                      onClick={() => removeEditAdditionalItem(index)}
                      className="p-2 bg-red-500 text-white rounded cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">תצוגה מקדימה:</h4>
                <div className="text-sm space-y-1">
                  <div>משך: {formatHours(calculateEditDuration())} שעות</div>
                  <div>מחיר אחרי הנחות: ₪{(calculateEditDuration() * editHourlyRate * (1 - (parseFloat(editPercentDiscount) || 0) / 100) - (parseFloat(editShekelDiscount) || 0)).toFixed(2)}</div>
                  <div>תוספות: ₪{editAdditionalItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)}</div>
                  <div className="font-bold">סה"כ: ₪{(
                    Math.max(0, calculateEditDuration() * editHourlyRate * (1 - (parseFloat(editPercentDiscount) || 0) / 100) - (parseFloat(editShekelDiscount) || 0)) +
                    editAdditionalItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
                  ).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={saveEditedInvoice}
                className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                💾 שמור שינויים
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 p-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 cursor-pointer"
              >
                ❌ ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioBillingApp;
