import { useState } from 'react';
import { FileSpreadsheet, FileText, Link2, Copy, Download } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useApp } from '../context/AppContext';
import { useInvoices } from '../context/InvoiceContext';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';
import { copyTextToClipboard } from '../utils/clipboard';

function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob], { type: blob.type || 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function expectedTypesFor(format) {
  if (format === 'PDF') return ['application/pdf'];
  if (format === 'CSV') return ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream'];
  return ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
}

async function assertValidExportBlob(blob, format) {
  if (format === 'PDF') {
    const header = await blob.slice(0, 5).text();
    if (header !== '%PDF-') throw new Error('Downloaded PDF export is invalid');
  }
  if (format === 'XLSX') {
    const header = await blob.slice(0, 2).text();
    if (header !== 'PK') throw new Error('Downloaded Excel export is invalid');
  }
  if (format === 'CSV') {
    const firstLine = (await blob.slice(0, 200).text()).replace(/^\uFEFF/, '').split(/\r?\n/)[0];
    if (!firstLine.startsWith('"Invoice Number"')) throw new Error('Downloaded CSV export is invalid');
  }
}

export default function ExportPage() {
  const { showToast } = useApp();
  const { invoices } = useInvoices();
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(null);
  const [sharingInvoiceId, setSharingInvoiceId] = useState(null);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const endpoint =
        format === 'PDF' ? '/exports/pdf' :
        format === 'CSV' ? '/exports/csv' :
        '/exports/excel';
      const data = await api.post(endpoint, { dateFrom, dateTo });
      const filename = data.filename || data.fileName || `invoices-export.${format.toLowerCase()}`;
      const blob = await api.download(`/exports/download/${encodeURIComponent(filename)}`, expectedTypesFor(format));
      await assertValidExportBlob(blob, format);
      triggerDownload(blob, filename);
      showToast(`${format} export downloaded!`);
    } catch (err) {
      showToast(err.message || `Failed to export ${format}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const copyInvoiceLink = async (invoice) => {
    setSharingInvoiceId(invoice.id);
    try {
      const data = await api.post('/share-links', { invoiceId: invoice.id });
      const path = data.url || `/share/${data.token}`;
      const link = path.startsWith('http') ? path : `${window.location.origin}${path}`;
      await copyTextToClipboard(link);
      showToast(`Copied link for ${invoice.number}`);
    } catch (err) {
      showToast(err.message || 'Failed to create invoice link', 'error');
    } finally {
      setSharingInvoiceId(null);
    }
  };

  const exportOptions = [
    { icon: FileText, label: 'Download PDF', desc: 'Export all filtered invoices as PDF', format: 'PDF', color: 'text-red-500', bg: 'bg-red-50' },
    { icon: FileSpreadsheet, label: 'Export CSV', desc: 'Comma-separated values for spreadsheets', format: 'CSV', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: FileSpreadsheet, label: 'Export Excel', desc: 'Microsoft Excel workbook format', format: 'XLSX', color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Export Invoices</h1>
      <p className="text-sm text-slate-500 mb-6">Download invoice data and copy invoice-specific share links</p>

      {/* Date Range */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Date Range</h3>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </Card>

      {/* Export Options */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {exportOptions.map((opt, i) => (
          <Card key={i} hover className="text-center cursor-pointer" onClick={() => handleExport(opt.format)}>
            <div className={`w-12 h-12 rounded-2xl ${opt.bg} flex items-center justify-center mx-auto mb-3`}>
              {exporting === opt.format ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
              ) : (
                <opt.icon className={`w-6 h-6 ${opt.color}`} />
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">{opt.label}</h3>
            <p className="text-xs text-slate-500">{opt.desc}</p>
            <div className="mt-3">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">.{opt.format.toLowerCase()}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card padding={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Invoice Links</h3>
            <p className="text-xs text-slate-500">Copy a unique public link for a specific invoice.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Download className="w-4 h-4" />
            {invoices.length} invoices
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Invoice</th>
                <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Client</th>
                <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Date</th>
                <th className="text-right text-xs font-medium text-slate-400 py-3 px-4">Amount</th>
                <th className="text-right text-xs font-medium text-slate-400 py-3 px-4">Share</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 px-4 text-center text-sm text-slate-400">No invoices available to share.</td>
                </tr>
              ) : invoices.map(invoice => (
                <tr key={invoice.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <p className="text-sm font-semibold text-slate-800">{invoice.number}</p>
                    <p className="text-xs text-slate-400">{invoice.status}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-slate-700">{invoice.clientName}</p>
                    <p className="text-xs text-slate-400">{invoice.clientCompanyName || invoice.company || ''}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500">{formatDate(invoice.date)}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-slate-800">{formatCurrency(invoice.total)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={sharingInvoiceId === invoice.id ? undefined : Link2}
                      loading={sharingInvoiceId === invoice.id}
                      onClick={() => copyInvoiceLink(invoice)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </Card>
    </div>
  );
}
