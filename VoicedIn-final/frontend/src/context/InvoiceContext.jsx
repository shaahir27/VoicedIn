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
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  const emptyStats = {
    totalInvoices: 0, totalRevenue: 0, pendingAmount: 0, overdueAmount: 0,
    paidCount: 0, unpaidCount: 0, overdueCount: 0, draftCount: 0
  };

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setInvoices([]);
      setClients([]);
      setPayments([]);
      setStats(emptyStats);
      setChartData([]);
      setRecentInvoices([]);
      setAlerts([]);
      setDataError(null);
      return;
    }

    setLoadingData(true);
    setDataError(null);

    const results = await Promise.allSettled([
      api.get('/invoices'),
      api.get('/clients'),
      api.get('/payments'),
      api.get('/dashboard')
    ]);

    const [invoiceResult, clientResult, paymentResult, dashboardResult] = results;

    if (invoiceResult.status === 'fulfilled') {
      setInvoices(invoiceResult.value.invoices || []);
    } else {
      console.error('Failed to load invoices', invoiceResult.reason);
      setDataError(invoiceResult.reason?.message || 'Failed to load invoices');
    }

    if (clientResult.status === 'fulfilled') {
      setClients(clientResult.value.clients || []);
    } else {
      console.error('Failed to load clients', clientResult.reason);
    }

    if (paymentResult.status === 'fulfilled') {
      setPayments(paymentResult.value.payments || []);
    } else {
      console.error('Failed to load payments', paymentResult.reason);
    }

    if (dashboardResult.status === 'fulfilled') {
      const dashRes = dashboardResult.value;
      setStats(dashRes.stats || emptyStats);
      setChartData(dashRes.chartData || []);
      setRecentInvoices(dashRes.recentInvoices || []);
      setAlerts(dashRes.alerts || []);
    } else {
      console.error('Failed to load dashboard', dashboardResult.reason);
      if (invoiceResult.status === 'fulfilled') {
        const loadedInvoices = invoiceResult.value.invoices || [];
        setStats(buildStatsFromInvoices(loadedInvoices));
        setRecentInvoices([...loadedInvoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
        setAlerts(buildAlertsFromInvoices(loadedInvoices));
      }
    }

    setLoadingData(false);
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
      loadingData, dataError,
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

function buildStatsFromInvoices(invoices) {
  return invoices.reduce((acc, invoice) => {
    const total = Number(invoice.total || 0);
    acc.totalInvoices += 1;
    if (invoice.status === 'paid') {
      acc.paidCount += 1;
      acc.totalRevenue += total;
    }
    if (invoice.status === 'unpaid') {
      acc.unpaidCount += 1;
      acc.pendingAmount += total;
    }
    if (invoice.status === 'overdue') {
      acc.overdueCount += 1;
      acc.overdueAmount += total;
    }
    if (invoice.status === 'draft') {
      acc.draftCount += 1;
    }
    return acc;
  }, {
    totalInvoices: 0, totalRevenue: 0, pendingAmount: 0, overdueAmount: 0,
    paidCount: 0, unpaidCount: 0, overdueCount: 0, draftCount: 0
  });
}

function buildAlertsFromInvoices(invoices) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return invoices.filter(invoice => {
    if (invoice.status === 'overdue') return true;
    if (invoice.status !== 'unpaid' || !invoice.dueDate) return false;

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate - today) / 86400000);
    return daysUntilDue >= 0 && daysUntilDue <= 3;
  });
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (!context) throw new Error('useInvoices must be used within InvoiceProvider');
  return context;
}
