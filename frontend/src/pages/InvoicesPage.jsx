import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Plus, Download, Link2, Eye, Copy, Grid3X3, List, Pencil, Trash2, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices } from '../context/InvoiceContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { api } from '../utils/api';
import { copyTextToClipboard } from '../utils/clipboard';

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
];

const getItemTotal = (item) => item.lineTotal || Number(item.qty || 0) * Number(item.rate || 0) * (1 + Number(item.tax || 0) / 100);

export default function InvoicesPage() {
  const { invoices, markAsPaid, deleteInvoice, loadingData, dataError } = useInvoices();
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [sharingInvoiceId, setSharingInvoiceId] = useState(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);

  useEffect(() => {
    if (!previewInvoice) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewInvoice(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewInvoice]);

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
      await copyTextToClipboard(link);
      showToast('Invoice link copied!');
    } catch (err) {
      showToast(err.message || 'Failed to create share link', 'error');
    } finally {
      setSharingInvoiceId(null);
    }
  };

  const handleDeleteInvoice = async (inv) => {
    const confirmed = window.confirm(`Delete invoice ${inv.number}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingInvoiceId(inv.id);
    try {
      await deleteInvoice(inv.id);
      if (previewInvoice?.id === inv.id) setPreviewInvoice(null);
      showToast(`${inv.number} deleted`);
    } catch (err) {
      showToast(err.message || 'Failed to delete invoice', 'error');
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} total · {invoices.filter(i => i.status === 'unpaid').length} unpaid</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {filtered.map(inv => (
            <Card key={inv.id} hover className="h-full flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{inv.number}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                </div>
                <div className="shrink-0"><Badge status={inv.status} /></div>
              </div>
              <div className="min-h-[3.5rem]">
                <p className="text-sm font-medium text-slate-700 mb-1 truncate">{inv.clientName}</p>
                <p className="text-xs text-slate-400 truncate">{inv.clientCompanyName || inv.company || 'No company added'}</p>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-3 border-t border-slate-100">
                <p className="text-lg font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPreviewInvoice(inv)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Eye className="w-4 h-4 text-slate-400" />
                    View
                  </button>
                  <Link to={`/invoices/${inv.id}/edit`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Pencil className="w-4 h-4 text-slate-400" />
                    Edit
                  </Link>
                  <button type="button" onClick={() => handleDownloadPdf(inv)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Download className="w-4 h-4 text-slate-400" />
                    Download
                  </button>
                  <button type="button" onClick={() => handleShareInvoice(inv)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 cursor-pointer" disabled={sharingInvoiceId === inv.id}>
                    <Link2 className={`w-4 h-4 ${sharingInvoiceId === inv.id ? 'text-primary-500' : 'text-slate-400'}`} />
                    Copy
                  </button>
                  <button type="button" onClick={() => handleDeleteInvoice(inv)} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60 cursor-pointer" disabled={deletingInvoiceId === inv.id}>
                    <Trash2 className="w-4 h-4" />
                    {deletingInvoiceId === inv.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                <div className="min-h-[2.25rem]">
                  {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                    <button type="button" onClick={() => handleMarkPaid(inv)} className="w-full px-2 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 cursor-pointer">
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
                        <button type="button" onClick={() => setPreviewInvoice(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" title="View invoice"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <Link to={`/invoices/${inv.id}/edit`} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" title="Edit invoice"><Pencil className="w-4 h-4 text-slate-400" /></Link>
                        <button type="button" onClick={() => handleDownloadPdf(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" title="Download PDF"><Download className="w-4 h-4 text-slate-400" /></button>
                        <button type="button" onClick={() => handleShareInvoice(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" title="Copy link" disabled={sharingInvoiceId === inv.id}><Link2 className={`w-4 h-4 ${sharingInvoiceId === inv.id ? 'text-primary-500' : 'text-slate-400'}`} /></button>
                        <button type="button" onClick={() => handleDeleteInvoice(inv)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer" title="Delete invoice" disabled={deletingInvoiceId === inv.id}><Trash2 className="w-4 h-4 text-red-400" /></button>
                        {(inv.status === 'unpaid' || inv.status === 'overdue') && (
                          <button type="button" onClick={() => handleMarkPaid(inv)} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 cursor-pointer">Mark Paid</button>
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

      {/* Invoice Preview */}
      {previewInvoice && createPortal((
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-preview-title"
        >
          <button type="button" aria-label="Close invoice preview" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setPreviewInvoice(null)} />
          <section
            className="relative z-10 flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-4xl sm:rounded-2xl"
            onClick={event => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p id="invoice-preview-title" className="truncate text-sm font-bold text-slate-900 sm:text-lg">{previewInvoice.number}</p>
                <p className="text-xs text-slate-500 sm:text-sm">{formatDate(previewInvoice.date)}</p>
              </div>
              <button type="button" onClick={() => setPreviewInvoice(null)} className="shrink-0 rounded-lg p-2 hover:bg-slate-100" aria-label="Close preview">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Client</p>
                      <p className="mt-1 break-words text-base font-semibold text-slate-900">{previewInvoice.clientName}</p>
                      <p className="break-words text-sm text-slate-500">{previewInvoice.clientCompanyName || previewInvoice.company || 'No company added'}</p>
                    </div>
                    <div className="shrink-0"><Badge status={previewInvoice.status} /></div>
                  </div>
                  {previewInvoice.clientGstNumber && <p className="mt-3 break-words text-xs text-slate-500">GST: {previewInvoice.clientGstNumber}</p>}
                  {previewInvoice.clientAddress && <p className="mt-1 break-words text-xs text-slate-500">{previewInvoice.clientAddress}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-400">Due Date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(previewInvoice.dueDate)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3 md:text-right">
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="mt-1 text-lg font-bold text-primary-600 sm:text-2xl">{formatCurrency(previewInvoice.total)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Items</p>

                <div className="space-y-2 md:hidden">
                  {(previewInvoice.items || []).map((item, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                      <p className="break-words text-sm font-semibold text-slate-800">{item.description || `Item ${i + 1}`}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <div><span className="block text-slate-400">Qty</span>{item.qty}</div>
                        <div><span className="block text-slate-400">GST</span>{Number(item.tax || 0)}%</div>
                        <div className="text-right"><span className="block text-slate-400">Amount</span>{formatCurrency(getItemTotal(item))}</div>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Rate: {formatCurrency(item.rate)}</p>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 text-left font-medium text-slate-500">Item</th>
                        <th className="py-2 text-center font-medium text-slate-500">Qty</th>
                        <th className="py-2 text-right font-medium text-slate-500">Rate</th>
                        <th className="py-2 text-center font-medium text-slate-500">GST</th>
                        <th className="py-2 text-right font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewInvoice.items || []).map((item, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="max-w-[260px] break-words py-3 text-slate-700">{item.description || `Item ${i + 1}`}</td>
                          <td className="py-3 text-center text-slate-600">{item.qty}</td>
                          <td className="py-3 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                          <td className="py-3 text-center text-slate-600">{Number(item.tax || 0)}%</td>
                          <td className="py-3 text-right font-semibold text-slate-800">{formatCurrency(getItemTotal(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(previewInvoice.items || []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No items added yet.
                  </div>
                )}
              </div>
            </div>

            <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex sm:justify-end sm:px-5">
              <Link to={`/invoices/${previewInvoice.id}/edit`} className="inline-flex w-full sm:w-auto">
                <Button variant="outline" icon={Pencil} fullWidth className="sm:w-auto">Edit</Button>
              </Link>
              <Button variant="outline" icon={Download} fullWidth className="sm:w-auto" onClick={() => handleDownloadPdf(previewInvoice)}>Download</Button>
              <Button variant="outline" icon={Copy} fullWidth className="sm:w-auto" loading={sharingInvoiceId === previewInvoice.id} onClick={() => handleShareInvoice(previewInvoice)}>Share</Button>
              <Button variant="danger" icon={Trash2} fullWidth className="sm:w-auto" loading={deletingInvoiceId === previewInvoice.id} onClick={() => handleDeleteInvoice(previewInvoice)}>Delete</Button>
              {(previewInvoice.status === 'unpaid' || previewInvoice.status === 'overdue') && (
                <button type="button" onClick={() => { handleMarkPaid(previewInvoice); setPreviewInvoice(null); }} className="col-span-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white sm:col-span-1">
                  Mark as Paid
                </button>
              )}
            </footer>
          </section>
        </div>
      ), document.body)}
    </div>
  );
}
