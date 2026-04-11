import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Download, Link2, Eye, Copy, Grid3X3, List, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices } from '../context/InvoiceContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { api } from '../utils/api';

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
];

export default function InvoicesPage() {
  const { invoices, markAsPaid, loadingData, dataError } = useInvoices();
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [sharingInvoiceId, setSharingInvoiceId] = useState(null);

  const filtered = invoices.filter(inv => {
    const matchesSearch = inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkPaid = async (inv) => {
    try {
      await markAsPaid(inv.id);
      showToast(`${inv.number} marked as paid`);
    } catch {
      showToast('Failed to mark as paid', 'error');
    }
  };

  const handleDownloadPdf = async (inv) => {
    try {
      await downloadInvoicePdf(inv.id, inv.number);
      showToast(`${inv.number} downloaded as PDF`);
    } catch (err) {
      showToast(err.message || 'Failed to download PDF', 'error');
    }
  };

  const handleShareInvoice = async (inv) => {
    setSharingInvoiceId(inv.id);
    try {
      const data = await api.post('/share-links', { invoiceId: inv.id });
      const path = data.url || `/share/${data.token}`;
      const link = path.startsWith('http') ? path : `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(link);
      showToast('Invoice link copied!');
    } catch (err) {
      showToast(err.message || 'Failed to create share link', 'error');
    } finally {
      setSharingInvoiceId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} total · {invoices.filter(i => i.status === 'unpaid').length} unpaid</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => showToast('Exported as CSV')}>Export</Button>
          <Link to="/invoices/new">
            <Button icon={Plus} size="sm">New Invoice</Button>
          </Link>
        </div>
      </div>

      {dataError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not fully refresh invoice data: {dataError}. Your saved data is still tied to this login; check the backend/Supabase logs if this persists.
        </div>
      )}

      {loadingData && invoices.length === 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Loading your saved invoices...
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="flex-1 max-w-sm" />
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer
                ${statusFilter === f.value ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
          <div className="hidden sm:flex items-center gap-1 ml-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>
              <Grid3X3 className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
              <List className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No invoices found" description={search ? 'Try a different search' : 'Create your first invoice to get started'} />
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inv => (
            <Card key={inv.id} hover className="group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{inv.number}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                </div>
                <Badge status={inv.status} />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">{inv.clientName}</p>
              <p className="text-xs text-slate-400 mb-4">{inv.company}</p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <p className="text-lg font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreviewInvoice(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                    <Eye className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => handleShareInvoice(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" disabled={sharingInvoiceId === inv.id}>
                    <Link2 className={`w-4 h-4 ${sharingInvoiceId === inv.id ? 'text-primary-500' : 'text-slate-400'}`} />
                  </button>
                  {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                    <button onClick={() => handleMarkPaid(inv)} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 cursor-pointer">
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Invoice</th>
                  <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Client</th>
                  <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Date</th>
                  <th className="text-right text-xs font-medium text-slate-400 py-3 px-4">Amount</th>
                  <th className="text-center text-xs font-medium text-slate-400 py-3 px-4">Status</th>
                  <th className="text-right text-xs font-medium text-slate-400 py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4"><p className="text-sm font-medium text-slate-800">{inv.number}</p></td>
                    <td className="py-3 px-4"><p className="text-sm text-slate-600">{inv.clientName}</p></td>
                    <td className="py-3 px-4"><p className="text-sm text-slate-500">{formatDate(inv.date)}</p></td>
                    <td className="py-3 px-4 text-right"><p className="text-sm font-semibold text-slate-800">{formatCurrency(inv.total)}</p></td>
                    <td className="py-3 px-4 text-center"><Badge status={inv.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreviewInvoice(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"><Eye className="w-4 h-4 text-slate-400" /></button>
                        {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                          <button onClick={() => handleMarkPaid(inv)} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 cursor-pointer">Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      <Modal isOpen={!!previewInvoice} onClose={() => setPreviewInvoice(null)} title={previewInvoice?.number} size="lg">
        {previewInvoice && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-slate-500">Client</p>
                <p className="font-semibold text-slate-800">{previewInvoice.clientName}</p>
                <p className="text-sm text-slate-400">{previewInvoice.clientCompanyName || previewInvoice.company}</p>
                {previewInvoice.clientGstNumber && <p className="text-xs text-slate-400">GST: {previewInvoice.clientGstNumber}</p>}
                {previewInvoice.clientAddress && <p className="text-xs text-slate-400">{previewInvoice.clientAddress}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-primary-600">{formatCurrency(previewInvoice.total)}</p>
                <Badge status={previewInvoice.status} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Date:</span> <span className="text-slate-700">{formatDate(previewInvoice.date)}</span></div>
              <div><span className="text-slate-400">Due:</span> <span className="text-slate-700">{formatDate(previewInvoice.dueDate)}</span></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200"><th className="text-left py-2 text-slate-500">Item</th><th className="text-center py-2 text-slate-500">Qty</th><th className="text-right py-2 text-slate-500">Rate</th><th className="text-right py-2 text-slate-500">Amount</th></tr></thead>
              <tbody>
                {previewInvoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-50"><td className="py-2">{item.description}</td><td className="text-center py-2">{item.qty}</td><td className="text-right py-2">{formatCurrency(item.rate)}</td><td className="text-right py-2 font-medium">{formatCurrency(item.qty * item.rate)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" icon={Download} onClick={() => handleDownloadPdf(previewInvoice)}>Download</Button>
              <Button variant="outline" icon={Copy} loading={sharingInvoiceId === previewInvoice.id} onClick={() => handleShareInvoice(previewInvoice)}>Share</Button>
              {(previewInvoice.status === 'unpaid' || previewInvoice.status === 'overdue') && (
                <Button variant="success" onClick={() => { handleMarkPaid(previewInvoice); setPreviewInvoice(null); }}>Mark as Paid</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
