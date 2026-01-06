import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Send, Eye, RefreshCw, AlertCircle, Calendar, User, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [failedCustomers, setFailedCustomers] = useState([]);
  const [selectedFailedCustomers, setSelectedFailedCustomers] = useState([]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
  };

  const handleResend = (campaign) => {
    setSelectedCampaign(campaign);
    setShowResendModal(true);
  };

  const handleResendFailed = async (campaign) => {
    try {
      // טען את הלקוחות שהשליחה נכשלה אליהם
      const response = await api.get(`/campaigns/${campaign.id}/failed-customers`);
      setFailedCustomers(response.data.customers || []);
      setSelectedFailedCustomers(response.data.customers || []);
      setSelectedCampaign(campaign);
      setShowResendModal(true);
    } catch (error) {
      console.error('Error loading failed customers:', error);
      alert('שגיאה בטעינת רשימת לקוחות שנכשלו');
    }
  };

  const confirmResend = async () => {
    if (!selectedCampaign) return;

    const customerIds = failedCustomers.length > 0
      ? selectedFailedCustomers.map(c => c.id)
      : null; // null = שלח לכל הלקוחות המקוריים

    try {
      const campaignData = {
        customerIds: customerIds,
        emailTemplate: selectedCampaign.email_template,
        emailSubject: selectedCampaign.email_subject,
        whatsappTemplate: selectedCampaign.whatsapp_template,
        emailVariables: selectedCampaign.email_variables,
        whatsappVariables: selectedCampaign.whatsapp_variables,
      };

      const response = await api.post('/campaigns/send', campaignData);

      const stats = response.data.stats;
      if (stats) {
        const messages = [];
        if (stats.emailsSent > 0) messages.push(`${stats.emailsSent} אימיילים`);
        if (stats.whatsappSent > 0) messages.push(`${stats.whatsappSent} הודעות וואטסאפ`);
        if (stats.failed > 0) messages.push(`${stats.failed} נכשלו`);

        const summary = messages.join(', ');
        alert(`הקמפיין נשלח מחדש!\nנשלחו: ${summary}`);
      } else {
        alert('הקמפיין נשלח מחדש בהצלחה');
      }

      setShowResendModal(false);
      setFailedCustomers([]);
      setSelectedFailedCustomers([]);
      loadCampaigns();
    } catch (error) {
      console.error('Error resending campaign:', error);
      alert('שגיאה בשליחת קמפיין מחדש');
    }
  };

  const toggleFailedCustomer = (customer) => {
    setSelectedFailedCustomers(prev => {
      const isSelected = prev.find(c => c.id === customer.id);
      if (isSelected) {
        return prev.filter(c => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { text: 'הושלם', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      sending: { text: 'שולח...', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      failed: { text: 'נכשל', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      pending: { text: 'ממתין', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          היסטוריית קמפיינים
        </h1>
      </div>

      {/* Campaigns List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            טוען...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            לא נמצאו קמפיינים
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    תאריך
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    תבניות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    לקוחות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    נשלחו
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    נכשלו
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
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(campaign.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col gap-1">
                        {campaign.email_template && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs">{campaign.email_template}</span>
                          </div>
                        )}
                        {campaign.whatsapp_template && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span className="text-xs">{campaign.whatsapp_template}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {campaign.customer_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-col gap-1 text-xs">
                        {campaign.emails_sent > 0 && (
                          <span className="text-blue-600 dark:text-blue-400">
                            {campaign.emails_sent} אימיילים
                          </span>
                        )}
                        {campaign.whatsapp_sent > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            {campaign.whatsapp_sent} וואטסאפ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {campaign.failed_count > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {campaign.failed_count}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(campaign)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          title="צפה בפרטים"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResend(campaign)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="שלח מחדש"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {campaign.failed_count > 0 && (
                          <button
                            onClick={() => handleResendFailed(campaign)}
                            className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
                            title="שלח מחדש ללקוחות שנכשלו"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                פרטי קמפיין
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">תאריך שליחה</h3>
                <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedCampaign.created_at)}</p>
              </div>

              {selectedCampaign.email_template && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">תבנית אימייל</h3>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedCampaign.email_template}</p>
                  </div>
                  {selectedCampaign.email_subject && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">נושא אימייל</h3>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedCampaign.email_subject}</p>
                    </div>
                  )}
                  {selectedCampaign.email_variables && Object.keys(selectedCampaign.email_variables).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">משתני אימייל</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 space-y-1">
                        {Object.entries(selectedCampaign.email_variables).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{' '}
                            <span className="text-gray-900 dark:text-white">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedCampaign.whatsapp_template && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">תבנית וואטסאפ</h3>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedCampaign.whatsapp_template}</p>
                  </div>
                  {selectedCampaign.whatsapp_variables && selectedCampaign.whatsapp_variables.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">משתני וואטסאפ</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 space-y-1">
                        {selectedCampaign.whatsapp_variables.map((value, index) => (
                          <div key={index} className="text-xs">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{`{{${index + 1}}}`}:</span>{' '}
                            <span className="text-gray-900 dark:text-white">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">סטטיסטיקות</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">סה"כ לקוחות</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCampaign.customer_count || 0}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">נשלחו בהצלחה</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(selectedCampaign.emails_sent || 0) + (selectedCampaign.whatsapp_sent || 0)}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">נכשלו</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCampaign.failed_count || 0}</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400">סטטוס</div>
                    <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Modal */}
      {showResendModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {failedCustomers.length > 0 ? 'שליחה חוזרת ללקוחות שנכשלו' : 'שליחה חוזרת של קמפיין'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {failedCustomers.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    בחר את הלקוחות שתרצה לשלוח להם מחדש:
                  </p>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                    {failedCustomers.map((customer) => (
                      <label
                        key={customer.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFailedCustomers.some(c => c.id === customer.id)}
                          onChange={() => toggleFailedCustomer(customer)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {customer.email || ''} {customer.phone ? `• ${customer.phone}` : ''}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    נבחרו {selectedFailedCustomers.length} מתוך {failedCustomers.length} לקוחות
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  הקמפיין ישלח מחדש לכל {selectedCampaign.customer_count} הלקוחות המקוריים
                </p>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={confirmResend}
                disabled={failedCustomers.length > 0 && selectedFailedCustomers.length === 0}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                שלח מחדש
              </button>
              <button
                onClick={() => {
                  setShowResendModal(false);
                  setFailedCustomers([]);
                  setSelectedFailedCustomers([]);
                }}
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

export default Campaigns;
