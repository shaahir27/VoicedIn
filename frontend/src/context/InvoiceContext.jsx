import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const InvoiceContext = createContext(null);

export function InvoiceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalInvoices: 0, totalRevenue: 0, pendingAmount: 0, overdueAmount: 0,
    paidCount: 0, unpaidCount: 0, overdueCount: 0, draftCount: 0
  });
  const [chartData, setChartData] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [invRes, clientsRes, payRes, dashRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/clients'),
        api.get('/payments'),
        api.get('/dashboard')
      ]);
      setInvoices(invRes.invoices || []);
      setClients(clientsRes.clients || []);
      setPayments(payRes.payments || []);
      setStats(dashRes.stats || stats);
      setChartData(dashRes.chartData || []);
      setRecentInvoices(dashRes.recentInvoices || []);
      setAlerts(dashRes.alerts || []);
    } catch (err) {
      console.error('Failed to load invoice data', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addInvoice = useCallback(async (invoiceData) => {
    const data = await api.post('/invoices', invoiceData);
    setInvoices(prev => [data.invoice, ...prev]);
    fetchData(); // Refresh stats etc
    return data.invoice;
  }, [fetchData]);

  const updateInvoice = useCallback(async (id, updates) => {
    const data = await api.put(`/invoices/${id}`, updates);
    setInvoices(prev => prev.map(inv => inv.id === id ? data.invoice : inv));
    fetchData();
  }, [fetchData]);

  const deleteInvoice = useCallback(async (id) => {
    await api.delete(`/invoices/${id}`);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    fetchData();
  }, [fetchData]);

  const addClient = useCallback(async (clientData) => {
    const data = await api.post('/clients', clientData);
    setClients(prev => [data.client, ...prev]);
    return data.client;
  }, []);

  const updateClient = useCallback(async (id, updates) => {
    const data = await api.put(`/clients/${id}`, updates);
    setClients(prev => prev.map(c => c.id === id ? data.client : c));
  }, []);

  const deleteClient = useCallback(async (id) => {
    await api.delete(`/clients/${id}`);
    setClients(prev => prev.filter(c => c.id !== id));
  }, []);

  const markAsPaid = useCallback(async (invoiceId, paymentDate, method) => {
    await api.post(`/invoices/${invoiceId}/pay`, { paymentDate, method });
    fetchData(); // Refresh everything
  }, [fetchData]);

  const getClientInvoices = useCallback((clientId) => {
    return invoices.filter(inv => inv.clientId === clientId);
  }, [invoices]);

  const getClientPayments = useCallback((clientId) => {
    const clientInvoiceIds = invoices.filter(inv => inv.clientId === clientId).map(inv => inv.id);
    return payments.filter(p => clientInvoiceIds.includes(p.invoiceId));
  }, [invoices, payments]);

  return (
    <InvoiceContext.Provider value={{
      invoices, clients, payments, stats,
      chartData, recentInvoices, alerts,
      addInvoice, updateInvoice, deleteInvoice,
      addClient, updateClient, deleteClient,
      markAsPaid,
      getClientInvoices, getClientPayments,
      refreshData: fetchData
    }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (!context) throw new Error('useInvoices must be used within InvoiceProvider');
  return context;
}
