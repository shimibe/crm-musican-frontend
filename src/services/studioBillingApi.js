import api from '../utils/api';

// Clients
export const getClients = async () => {
  const response = await api.get('/studio-billing/clients');
  return response.data;
};

export const getClient = async (id) => {
  const response = await api.get(`/studio-billing/clients/${id}`);
  return response.data;
};

export const createClient = async (clientData) => {
  const response = await api.post('/studio-billing/clients', clientData);
  return response.data;
};

// Invoices
export const getInvoices = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.client_id) params.append('client_id', filters.client_id);
  if (filters.paid !== undefined) params.append('paid', filters.paid);
  if (filters.from_date) params.append('from_date', filters.from_date);
  if (filters.to_date) params.append('to_date', filters.to_date);

  const response = await api.get(`/studio-billing/invoices?${params}`);
  return response.data;
};

export const createInvoice = async (invoiceData) => {
  const response = await api.post('/studio-billing/invoices', invoiceData);
  return response.data;
};

export const updateInvoice = async (id, invoiceData) => {
  const response = await api.put(`/studio-billing/invoices/${id}`, invoiceData);
  return response.data;
};

export const markInvoicePaid = async (id, paid) => {
  const response = await api.patch(`/studio-billing/invoices/${id}/paid`, { paid });
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await api.delete(`/studio-billing/invoices/${id}`);
  return response.data;
};

// Debtors
export const getDebtors = async () => {
  const response = await api.get('/studio-billing/debtors');
  return response.data;
};

// Statistics
export const getStats = async () => {
  const response = await api.get('/studio-billing/stats');
  return response.data;
};
