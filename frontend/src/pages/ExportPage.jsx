import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Link2, Copy, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

export default function ExportPage() {
  const { showToast } = useApp();
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [shareLink, setShareLink] = useState('');
  const [exporting, setExporting] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const endpoint = format === 'CSV' ? '/exports/csv' : format === 'PDF' ? '/exports/pdf' : '/exports/excel';
      const data = await api.post(endpoint, { dateFrom, dateTo });
      if (data.url) {
        window.open(`http://localhost:5000${data.url}`, '_blank');
        showToast(`${format} export downloaded!`);
      } else if (data.fileName) {
        window.open(`http://localhost:5000/api/exports/download/${data.fileName}`, '_blank');
        showToast(`${format} export downloaded!`);
      } else {
        showToast(`${format} export created!`);
      }
    } catch (err) {
      showToast(err.message || `Failed to export ${format}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const generateShareLink = async () => {
    setGeneratingLink(true);
    try {
      const data = await api.post('/share-links', { dateFrom, dateTo });
      const link = data.shareUrl || data.url || `${window.location.origin}/share/${data.token}`;
      setShareLink(link);
      showToast('Shareable link generated!');
    } catch (err) {
      showToast(err.message || 'Failed to generate link', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).catch(() => { });
    showToast('Link copied to clipboard!');
  };

  const exportOptions = [
    { icon: FileText, label: 'Download PDF', desc: 'Export all filtered invoices as PDF', format: 'PDF', color: 'text-red-500', bg: 'bg-red-50' },
    { icon: FileSpreadsheet, label: 'Export CSV', desc: 'Comma-separated values for spreadsheets', format: 'CSV', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: FileSpreadsheet, label: 'Export Excel', desc: 'Microsoft Excel workbook format', format: 'XLSX', color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Export & Share</h1>
      <p className="text-sm text-slate-500 mb-6">Download or share your invoice data</p>

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

      {/* Share Link */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Shareable Invoice Link</h3>
            <p className="text-xs text-slate-500">Generate a link to share invoices from the selected date range</p>
          </div>
        </div>

        {shareLink ? (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-600 truncate border border-slate-200">
              {shareLink}
            </div>
            <Button variant="outline" icon={Copy} onClick={copyLink}>Copy</Button>
          </div>
        ) : (
          <Button onClick={generateShareLink} loading={generatingLink} icon={Link2} className="mt-2">Generate Link</Button>
        )}
      </Card>
    </div>
  );
}
