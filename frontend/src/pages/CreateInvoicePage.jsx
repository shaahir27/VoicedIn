import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Trash2, Eye, EyeOff, Save, Download, Share2, Copy, ArrowLeft, FileText, User
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ShortcutHint from '../components/ui/ShortcutHint';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useInvoices } from '../context/InvoiceContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber';
import { formatDate, formatDateISO } from '../utils/dateHelpers';
import { templates } from '../data/templates';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { api, assetUrl } from '../utils/api';
import { copyTextToClipboard } from '../utils/clipboard';

const emptyItem = { description: '', qty: 1, rate: 0, tax: '' };
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const isEditMode = Boolean(invoiceId);
  const { clients, invoices, addInvoice, updateInvoice } = useInvoices();
  const { isDemo } = useAuth();
  const { showToast } = useApp();

  const [showPreview, setShowPreview] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientCompanyName, setClientCompanyName] = useState('');
  const [clientGstNumber, setClientGstNumber] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(formatDateISO(new Date()));
  const [dueDate, setDueDate] = useState(() => formatDateISO(new Date(Date.now() + 15 * 86400000)));
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [notes, setNotes] = useState('Thank you for your business!');
  const [template, setTemplate] = useState('modern');
  const [includeBankDetails, setIncludeBankDetails] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [hydratedInvoiceId, setHydratedInvoiceId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    api.get('/settings')
      .then(data => {
        if (!isMounted || !data.settings) return;

        const settings = data.settings;
        setIncludeBankDetails(Boolean(settings.includeBankDetails));
        if (settings.defaultTerms) setNotes(settings.defaultTerms);
        if (!isEditMode && settings.defaultTemplate) setTemplate(settings.defaultTemplate);
      })
      .catch(err => {
        console.error('Failed to load invoice defaults', err);
      });

    api.get('/business-profile')
      .then(data => {
        if (!isMounted) return;
        setBusinessProfile(data.profile || null);
      })
      .catch(err => {
        console.error('Failed to load business profile', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isEditMode]);

  useEffect(() => {
    if (!invoiceId || hydratedInvoiceId === invoiceId) return undefined;

    let isMounted = true;
    const hydrateInvoice = (invoice) => {
      if (!invoice || !isMounted) return;
      const matchedClient = clients.find(client => client.id === invoice.clientId) || null;
      setSelectedClient(matchedClient);
      setClientSearch(invoice.clientName || matchedClient?.name || '');
      setClientCompanyName(invoice.clientCompanyName || invoice.company || matchedClient?.companyName || matchedClient?.company || '');
      setClientGstNumber(invoice.clientGstNumber || matchedClient?.gstNumber || matchedClient?.gst || '');
      setClientAddress(invoice.clientAddress || matchedClient?.address || '');
      setClientEmail(matchedClient?.email || '');
      setClientPhone(matchedClient?.phone || '');
      setInvoiceNumber(invoice.number || generateInvoiceNumber());
      setInvoiceDate(invoice.date || formatDateISO(new Date()));
      setDueDate(invoice.dueDate || '');
      setItems(invoice.items?.length ? invoice.items.map(item => ({
        description: item.description || '',
        qty: Number(item.qty || 1),
        rate: Number(item.rate || 0),
        tax: item.tax === undefined || item.tax === null ? '' : Number(item.tax),
      })) : [{ ...emptyItem }]);
      setNotes(invoice.notes || invoice.terms || '');
      setTemplate(invoice.template || 'modern');
      setIncludeBankDetails(Boolean(invoice.includeBankDetails));
      setHydratedInvoiceId(invoiceId);
    };

    const existingInvoice = invoices.find(invoice => invoice.id === invoiceId);
    if (existingInvoice) {
      hydrateInvoice(existingInvoice);
      return () => {
        isMounted = false;
      };
    }

    api.get(`/invoices/${invoiceId}`)
      .then(data => hydrateInvoice(data.invoice))
      .catch(err => {
        if (!isMounted) return;
        showToast(err.message || 'Failed to load invoice for editing', 'error');
        navigate('/invoices');
      });

    return () => {
      isMounted = false;
    };
  }, [clients, hydratedInvoiceId, invoiceId, invoices, navigate, showToast]);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.companyName || c.company || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const applyClientDetails = (client, { overwrite = true } = {}) => {
    if (!client) return;
    setSelectedClient(client);
    setClientSearch(client.name);
    if (overwrite || !clientCompanyName) setClientCompanyName(client.companyName || client.company || '');
    if (overwrite || !clientGstNumber) setClientGstNumber(client.gstNumber || client.gst || '');
    if (overwrite || !clientAddress) setClientAddress(client.address || '');
    if (overwrite || !clientEmail) setClientEmail(client.email || '');
    if (overwrite || !clientPhone) setClientPhone(client.phone || '');
  };

  const selectClient = (client) => {
    applyClientDetails(client);
    const previousInvoice = invoices.find(invoice =>
      invoice.clientId === client.id ||
      invoice.clientName?.toLowerCase() === client.name?.toLowerCase()
    );
    if (previousInvoice) {
      if (!(client.companyName || client.company)) setClientCompanyName(previousInvoice.clientCompanyName || previousInvoice.company || '');
      if (!(client.gstNumber || client.gst)) setClientGstNumber(previousInvoice.clientGstNumber || previousInvoice.clientDetails?.gstNumber || '');
      if (!client.address) setClientAddress(previousInvoice.clientAddress || previousInvoice.clientDetails?.address || '');
      if (!isEditMode && previousInvoice.template) setTemplate(previousInvoice.template);
    }
    setShowClientSuggestions(false);
  };

  useEffect(() => {
    if (selectedClient || !clientSearch.trim()) return;

    const normalizedSearch = clientSearch.trim().toLowerCase();
    const exactClient = clients.find(client =>
      client.name?.toLowerCase() === normalizedSearch
    );

    if (exactClient) {
      applyClientDetails(exactClient, { overwrite: false });
      setShowClientSuggestions(false);
      return;
    }

    const previousInvoice = invoices.find(invoice =>
      invoice.clientName?.toLowerCase() === normalizedSearch
    );

    if (previousInvoice) {
      if (!clientCompanyName) setClientCompanyName(previousInvoice.clientCompanyName || previousInvoice.company || '');
      if (!clientGstNumber) setClientGstNumber(previousInvoice.clientGstNumber || previousInvoice.clientDetails?.gstNumber || '');
      if (!clientAddress) setClientAddress(previousInvoice.clientAddress || previousInvoice.clientDetails?.address || '');
      if (!isEditMode && previousInvoice.template) setTemplate(previousInvoice.template);
      setShowClientSuggestions(false);
    }
  }, [clientSearch, clients, invoices, selectedClient, clientCompanyName, clientGstNumber, clientAddress, clientEmail, clientPhone, isEditMode]);

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: field === 'description' || value === '' ? value : Number(value) };
    setItems(updated);
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0), [items]);
  const taxTotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0) * Number(item.tax || 0)) / 100, 0), [items]);
  const total = subtotal + taxTotal;
  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === template) || templates[0],
    [template],
  );

  const reuseLastInvoice = () => {
    if (!selectedClient) return;
    const lastInv = invoices.find(inv => inv.clientId === selectedClient.id);
    if (lastInv) {
      setItems(lastInv.items.map(i => ({ ...i })));
      setNotes(lastInv.notes || '');
      setTemplate(lastInv.template || 'modern');
      showToast('Reused last invoice items');
    } else {
      showToast('No previous invoice found for this client', 'warning');
    }
  };

  const resolveClientDetails = () => {
    const resolvedCompany = clientCompanyName || selectedClient?.companyName || selectedClient?.company;
    const resolvedGstNumber = clientGstNumber || selectedClient?.gstNumber || selectedClient?.gst;
    const resolvedAddress = clientAddress || selectedClient?.address;
    const resolvedEmail = clientEmail || selectedClient?.email;
    const resolvedPhone = clientPhone || selectedClient?.phone;

    return {
      clientId: selectedClient?.id || '',
      clientName: (selectedClient?.name || clientSearch || '').trim(),
      company: (resolvedCompany || '').trim(),
      gstNumber: (resolvedGstNumber || '').trim().toUpperCase(),
      address: (resolvedAddress || '').trim(),
      email: (resolvedEmail || '').trim(),
      phone: (resolvedPhone || '').trim(),
    };
  };

  const validateInvoice = (status, details) => {
    if (status === 'draft') return;

    if (!details.clientName) throw new Error('Client name is required');
    if (!details.company) throw new Error('Client company name is required');
    if (!details.gstNumber) throw new Error('Client GST number is required');
    if (!gstPattern.test(details.gstNumber)) throw new Error('Enter a valid GST number');
    if (!details.address) throw new Error('Client address is required');
    if (!details.clientId) {
      if (!details.email) throw new Error('Client email is required for new clients');
      if (!emailPattern.test(details.email)) throw new Error('Enter a valid client email');
      if (!details.phone) throw new Error('Client mobile number is required for new clients');
      if (details.phone.replace(/[\s\-()]/g, '').length < 10) throw new Error('Enter a valid client mobile number');
    }
    if (!invoiceDate) throw new Error('Invoice date is required');
    if (!dueDate) throw new Error('Due date is required');

    items.forEach((item, index) => {
      if (!item.description?.trim()) throw new Error(`Item ${index + 1} needs a description`);
      if (!item.qty || Number(item.qty) <= 0) throw new Error(`Item ${index + 1} needs a valid quantity`);
      if (item.rate === undefined || Number(item.rate) < 0) throw new Error(`Item ${index + 1} needs a valid rate`);
      if (item.tax === '' || item.tax === undefined || Number(item.tax) < 0) throw new Error(`Item ${index + 1} needs a GST rate`);
    });
  };

  const saveInvoice = async (status = 'draft') => {
    const details = resolveClientDetails();
    validateInvoice(status, details);

    const invoice = {
      clientId: details.clientId,
      clientName: details.clientName,
      company: details.company,
      clientCompanyName: details.company,
      clientGstNumber: details.gstNumber,
      clientAddress: details.address,
      clientEmail: details.email,
      clientPhone: details.phone,
      includeBankDetails,
      status,
      isDraft: status === 'draft',
      date: invoiceDate,
      dueDate,
      items: items.map(item => ({ ...item, tax: item.tax === '' ? 0 : Number(item.tax) })),
      notes,
      template,
    };

    if (isEditMode) {
      return await updateInvoice(invoiceId, invoice);
    }

    return await addInvoice(invoice);
  };

  const handleSaveDraft = async () => {
    try {
      await saveInvoice('draft');
      showToast(isEditMode ? 'Draft updated' : 'Invoice saved as draft');
      navigate('/invoices');
    } catch (err) {
      showToast(err.message || 'Failed to create invoice', 'error');
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      await saveInvoice('unpaid');
      showToast(isEditMode ? 'Invoice updated successfully!' : 'Invoice created successfully!');
      navigate('/invoices');
    } catch (err) {
      showToast(err.message || 'Failed to create invoice', 'error');
    }
  };

  const handleDownloadPdf = async () => {
    if (isDemo && invoices.length > 3) {
      showToast('Demo is limited to 3 invoices. Upgrade to download more PDFs.', 'error');
      return;
    }

    try {
      const invoice = await saveInvoice('unpaid');
      await downloadInvoicePdf(invoice.id, invoice.number, { showDemoWatermark: isDemo });
      showToast('PDF downloaded!');
      navigate('/invoices');
    } catch (err) {
      showToast(err.message || 'Failed to download PDF', 'error');
    }
  };

  const handleCreateShareLink = async () => {
    try {
      const invoice = await saveInvoice('unpaid');
      const data = await api.post('/share-links', { invoiceId: invoice.id });
      const path = data.url || `/share/${data.token}`;
      const link = path.startsWith('http') ? path : `${window.location.origin}${path}`;
      await copyTextToClipboard(link);
      showToast('Invoice link copied!');
      navigate('/invoices');
    } catch (err) {
      showToast(err.message || 'Failed to create share link', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Invoice' : 'Create Invoice'}</h1>
            <p className="text-sm text-slate-500">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} icon={showPreview ? EyeOff : Eye}>
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} icon={Save} data-shortcut-save="invoice">Save Draft</Button>
          <Button size="sm" onClick={handleGenerateInvoice} icon={FileText}>{isEditMode ? 'Update' : 'Generate'}</Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        {/* Form */}
        <div className="space-y-5">
          {/* Client */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Client Details</h3>
            <div className="relative mb-4">
                <Input
                  label="Client Name"
                  placeholder="Search or enter client name..."
                  icon={User}
                  value={clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value);
                  setShowClientSuggestions(true);
                  setSelectedClient(null);
                  setClientCompanyName('');
                  setClientGstNumber('');
                  setClientAddress('');
                  setClientEmail('');
                  setClientPhone('');
                }}
                  onFocus={() => setShowClientSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                  required
                />
              {showClientSuggestions && filteredClients.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        selectClient(c);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.companyName || c.company}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm animate-fade-in">
                <p className="text-slate-600"><span className="text-slate-400 text-xs">Company:</span> {selectedClient.companyName || selectedClient.company}</p>
                <p className="text-slate-600"><span className="text-slate-400 text-xs">Email:</span> {selectedClient.email}</p>
                <p className="text-slate-600"><span className="text-slate-400 text-xs">GST:</span> {selectedClient.gstNumber || selectedClient.gst}</p>
                <p className="text-slate-600"><span className="text-slate-400 text-xs">Address:</span> {selectedClient.address}</p>
                <Button variant="ghost" size="sm" onClick={reuseLastInvoice} icon={Copy} className="mt-2">
                  Reuse Last Invoice
                </Button>
              </div>
            )}

            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-amber-900">Invoice Client Details</h4>
                <p className="text-xs text-amber-700">Company, GST, address, email, and mobile are used to create a new client when this name is not saved yet.</p>
              </div>
              <Input label="Company Name" value={clientCompanyName} onChange={e => setClientCompanyName(e.target.value)} placeholder="Company name" required />
              <Input label="Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" required={!selectedClient} />
              <Input label="Mobile" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="10-digit mobile number" required={!selectedClient} />
              <Input label="GST Number" value={clientGstNumber} onChange={e => setClientGstNumber(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" required />
              <Input label="Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Full address" required />
            </div>
          </Card>

          {/* Dates & Template */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Invoice Date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <Select
                label="Template"
                value={template}
                onChange={e => setTemplate(e.target.value)}
                options={templates.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeBankDetails}
                onChange={e => setIncludeBankDetails(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-slate-800">Include bank details in this invoice PDF</span>
                <span className="block text-xs text-slate-500 mt-0.5">Uses the payment details saved in Settings.</span>
              </span>
            </label>
          </Card>

          {/* Line Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
              <Button variant="ghost" size="sm" onClick={addItem} icon={Plus}>Add Item</Button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-3 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      className="flex-1 bg-white rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">Qty</label>
                      <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)}
                        className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">Rate (₹)</label>
                      <input type="number" min="0" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)}
                        className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">GST %</label>
                      <input type="number" min="0" placeholder="Enter GST" value={item.tax} onChange={e => updateItem(i, 'tax', e.target.value)}
                        className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">Amount</label>
                      <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700">
                        {formatCurrency(Number(item.qty || 0) * Number(item.rate || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span className="font-medium text-slate-700">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-100">
                <span className="text-slate-800">Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes & Terms</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes or terms..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            />
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            <Button onClick={handleSaveDraft} variant="outline" icon={Save} data-shortcut-save="invoice" className="sm:w-auto">
              <span className="inline-flex items-center gap-2">
                Save Invoice
                <ShortcutHint keys={['Ctrl', 'S']} />
              </span>
            </Button>
            <Button onClick={handleGenerateInvoice} icon={FileText}>{isEditMode ? 'Update Invoice' : 'Generate Invoice'}</Button>
            <Button onClick={handleDownloadPdf} variant="secondary" icon={Download}>Download PDF</Button>
            <Button onClick={handleCreateShareLink} variant="ghost" icon={Share2}>Share</Button>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="block">
            <div className="lg:sticky lg:top-24">
              <Card className="!p-0 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: selectedTemplate.colors.accent, borderColor: `${selectedTemplate.colors.primary}22` }}>
                  <p className="text-sm font-medium text-slate-600">Live Preview</p>
                  <Badge status="draft">{selectedTemplate.name}</Badge>
                </div>
                <div className="p-8 bg-white min-h-[600px]">
                  {/* Invoice preview */}
                  <div className="flex items-start justify-between mb-8 border-b pb-5" style={{ borderColor: selectedTemplate.colors.primary }}>
                    <div>
                      {businessProfile?.logoUrl ? (
                        <img
                          src={assetUrl(businessProfile.logoUrl)}
                          alt="Business logo"
                          className="mb-2 max-h-14 max-w-40 object-contain"
                        />
                      ) : businessProfile?.businessName ? (
                        <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: selectedTemplate.colors.primary }}>{businessProfile.businessName}</h2>
                      ) : (
                        <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: selectedTemplate.colors.primary }}>Invoice</h2>
                      )}
                      <p className="text-xs text-slate-400 mt-1">Invoice</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: selectedTemplate.colors.primary }}>{invoiceNumber}</p>
                      <p className="text-xs text-slate-400">Date: {formatDate(invoiceDate)}</p>
                      <p className="text-xs text-slate-400">Due: {formatDate(dueDate)}</p>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="mb-8 p-4 rounded-xl border-l-4" style={{ backgroundColor: selectedTemplate.colors.accent, borderColor: selectedTemplate.colors.primary }}>
                    <p className="text-xs font-medium text-slate-400 mb-1">BILL TO</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedClient?.name || clientSearch || 'Client Name'}</p>
                    <p className="text-xs text-slate-500">{clientCompanyName || selectedClient?.companyName || selectedClient?.company || ''}</p>
                    <p className="text-xs text-slate-400">{clientEmail || selectedClient?.email || ''}</p>
                    <p className="text-xs text-slate-400">{clientPhone || selectedClient?.phone || ''}</p>
                    {clientGstNumber || selectedClient?.gstNumber || selectedClient?.gst ? <p className="text-xs text-slate-400">GST: {clientGstNumber || selectedClient?.gstNumber || selectedClient?.gst}</p> : null}
                    {clientAddress || selectedClient?.address ? <p className="text-xs text-slate-400">{clientAddress || selectedClient?.address}</p> : null}
                  </div>

                  {/* Items table */}
                  <table className="w-full mb-6 text-xs">
                    <thead>
                      <tr className="border-b-2" style={{ borderColor: selectedTemplate.colors.primary }}>
                        <th className="text-left py-2 text-slate-500 font-medium">Item</th>
                        <th className="text-center py-2 text-slate-500 font-medium">Qty</th>
                        <th className="text-right py-2 text-slate-500 font-medium">Rate</th>
                        <th className="text-center py-2 text-slate-500 font-medium">GST</th>
                        <th className="text-right py-2 text-slate-500 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2 text-slate-700">{item.description || `Item ${i + 1}`}</td>
                          <td className="py-2 text-center text-slate-600">{item.qty}</td>
                          <td className="py-2 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                          <td className="py-2 text-center text-slate-600">{item.tax === '' ? '-' : `${item.tax}%`}</td>
                          <td className="py-2 text-right text-slate-800 font-medium">{formatCurrency(Number(item.qty || 0) * Number(item.rate || 0) * (1 + Number(item.tax || 0) / 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="flex justify-end">
                    <div className="w-48 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-slate-600">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tax</span>
                        <span className="text-slate-600">{formatCurrency(taxTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                        <span className="text-slate-800">Total</span>
                        <span style={{ color: selectedTemplate.colors.primary }}>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  {notes && (
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Notes</p>
                      <p className="text-xs text-slate-500">{notes}</p>
                      {includeBankDetails && <p className="text-xs text-slate-400 mt-2">Bank details will be included in the downloaded PDF.</p>}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
