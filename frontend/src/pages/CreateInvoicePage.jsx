import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Eye, EyeOff, Save, Download, Share2, Copy, ArrowLeft, FileText, Sparkles, User
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { useInvoices } from '../context/InvoiceContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber';
import { formatDate, formatDateISO } from '../utils/dateHelpers';
import { templates } from '../data/templates';

const emptyItem = { description: '', qty: 1, rate: 0, tax: 18 };

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { clients, invoices, addInvoice } = useInvoices();
  const { showToast } = useApp();

  const [showPreview, setShowPreview] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [invoiceNumber] = useState(generateInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(formatDateISO(new Date()));
  const [dueDate, setDueDate] = useState(formatDateISO(new Date(Date.now() + 15 * 86400000)));
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [notes, setNotes] = useState('Thank you for your business!');
  const [template, setTemplate] = useState('modern');

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.company.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientSuggestions(false);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: field === 'description' ? value : Number(value) || 0 };
    setItems(updated);
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.rate, 0), [items]);
  const taxTotal = useMemo(() => items.reduce((sum, item) => sum + (item.qty * item.rate * item.tax) / 100, 0), [items]);
  const total = subtotal + taxTotal;

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

  const handleSave = async (status = 'draft') => {
    const invoice = {
      clientId: selectedClient?.id || '',
      clientName: selectedClient?.name || clientSearch,
      company: selectedClient?.company || '',
      status,
      date: invoiceDate,
      dueDate,
      items,
      notes,
      template,
    };

    try {
      await addInvoice(invoice);
      showToast(status === 'draft' ? 'Invoice saved as draft' : 'Invoice created successfully!');
      navigate('/invoices');
    } catch (err) {
      showToast(err.message || 'Failed to create invoice', 'error');
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
            <h1 className="text-xl font-bold text-slate-900">Create Invoice</h1>
            <p className="text-sm text-slate-500">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} icon={showPreview ? EyeOff : Eye}>
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSave('draft')} icon={Save}>Save Draft</Button>
          <Button size="sm" onClick={() => handleSave('unpaid')} icon={FileText}>Generate</Button>
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
                onChange={e => { setClientSearch(e.target.value); setShowClientSuggestions(true); setSelectedClient(null); }}
                onFocus={() => setShowClientSuggestions(true)}
                onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
              />
              {showClientSuggestions && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.company}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm animate-fade-in">
                <p className="text-slate-600"><span className="text-slate-400 text-xs">Company:</span> {selectedClient.company}</p>
                <p className="text-slate-600"><span className="text-slate-400 text-xs">Email:</span> {selectedClient.email}</p>
                <p className="text-slate-600"><span className="text-slate-400 text-xs">GST:</span> {selectedClient.gst}</p>
                <p className="text-slate-600"><span className="text-slate-400 text-xs">Address:</span> {selectedClient.address}</p>
                <Button variant="ghost" size="sm" onClick={reuseLastInvoice} icon={Copy} className="mt-2">
                  Reuse Last Invoice
                </Button>
              </div>
            )}
          </Card>

          {/* Dates & Template */}
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input label="Invoice Date" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <Select
                label="Template"
                value={template}
                onChange={e => setTemplate(e.target.value)}
                options={templates.map(t => ({ value: t.id, label: t.name }))}
              />
            </div>
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
                  <div className="grid grid-cols-4 gap-2">
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
                      <label className="text-[10px] text-slate-400 mb-0.5 block">Tax %</label>
                      <input type="number" min="0" value={item.tax} onChange={e => updateItem(i, 'tax', e.target.value)}
                        className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-0.5 block">Amount</label>
                      <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700">
                        {formatCurrency(item.qty * item.rate)}
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleSave('draft')} variant="outline" icon={Save}>Save Draft</Button>
            <Button onClick={() => handleSave('unpaid')} icon={FileText}>Generate Invoice</Button>
            <Button onClick={() => { handleSave('unpaid'); showToast('PDF downloaded!'); }} variant="secondary" icon={Download}>Download PDF</Button>
            <Button onClick={() => { showToast('Share link copied!'); }} variant="ghost" icon={Share2}>Share</Button>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Card className="!p-0 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600">Live Preview</p>
                  <Badge status="draft">Draft</Badge>
                </div>
                <div className="p-8 bg-white min-h-[600px]">
                  {/* Invoice preview */}
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight">
                        <span className="text-slate-800">voiced</span>
                        <span className="text-primary-500">In</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Invoice</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">{invoiceNumber}</p>
                      <p className="text-xs text-slate-400">Date: {formatDate(invoiceDate)}</p>
                      <p className="text-xs text-slate-400">Due: {formatDate(dueDate)}</p>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="mb-8 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-400 mb-1">BILL TO</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedClient?.name || clientSearch || 'Client Name'}</p>
                    <p className="text-xs text-slate-500">{selectedClient?.company || ''}</p>
                    <p className="text-xs text-slate-400">{selectedClient?.email || ''}</p>
                    {selectedClient?.gst && <p className="text-xs text-slate-400">GST: {selectedClient.gst}</p>}
                  </div>

                  {/* Items table */}
                  <table className="w-full mb-6 text-xs">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-2 text-slate-500 font-medium">Item</th>
                        <th className="text-center py-2 text-slate-500 font-medium">Qty</th>
                        <th className="text-right py-2 text-slate-500 font-medium">Rate</th>
                        <th className="text-right py-2 text-slate-500 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2 text-slate-700">{item.description || `Item ${i + 1}`}</td>
                          <td className="py-2 text-center text-slate-600">{item.qty}</td>
                          <td className="py-2 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                          <td className="py-2 text-right text-slate-800 font-medium">{formatCurrency(item.qty * item.rate)}</td>
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
                        <span className="text-primary-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  {notes && (
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Notes</p>
                      <p className="text-xs text-slate-500">{notes}</p>
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
