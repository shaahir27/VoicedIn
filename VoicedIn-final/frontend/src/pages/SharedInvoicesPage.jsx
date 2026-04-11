import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';

export default function SharedInvoicesPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get(`/share-links/${token}`);
        setData(response);
      } catch (err) {
        setError(err.message || 'This invoice link is unavailable');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Loading shared invoice...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <Card className="max-w-md text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900">Link unavailable</h1>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <Link to="/" className="inline-block text-sm font-semibold text-primary-600 mt-4">Go home</Link>
        </Card>
      </div>
    );
  }

  const invoices = data?.invoices || [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-500 font-semibold">Shared Invoice</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Invoice from {data?.sharedBy || 'VoicedIn'}</h1>
          <p className="text-sm text-slate-500 mt-1">{data?.count || 0} invoice{data?.count === 1 ? '' : 's'} shared</p>
        </div>

        <div className="space-y-4">
          {invoices.map(invoice => (
            <Card key={invoice.id}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <p className="text-sm text-slate-400">Invoice</p>
                  <h2 className="text-xl font-bold text-slate-900">{invoice.number}</h2>
                  <p className="text-sm text-slate-500 mt-1">Date: {formatDate(invoice.date)}{invoice.dueDate ? ` | Due: ${formatDate(invoice.dueDate)}` : ''}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-primary-600">{formatCurrency(invoice.total)}</p>
                  <Badge status={invoice.status} className="mt-1" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Billed To</p>
                  <p className="text-sm font-semibold text-slate-800">{invoice.clientName}</p>
                  {invoice.clientCompanyName && <p className="text-sm text-slate-600">{invoice.clientCompanyName}</p>}
                  {invoice.clientGstNumber && <p className="text-xs text-slate-500">GST: {invoice.clientGstNumber}</p>}
                  {invoice.clientAddress && <p className="text-xs text-slate-500 mt-1">{invoice.clientAddress}</p>}
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Summary</p>
                  <p className="text-sm text-slate-600">Subtotal: {formatCurrency(invoice.subtotal)}</p>
                  <p className="text-sm text-slate-600">Tax: {formatCurrency(invoice.taxTotal)}</p>
                  <p className="text-sm font-semibold text-slate-800">Total: {formatCurrency(invoice.total)}</p>
                </div>
              </div>

              {invoice.items?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="text-left py-2">Item</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-slate-50">
                          <td className="py-2 text-slate-700">{item.description}</td>
                          <td className="py-2 text-center text-slate-500">{item.qty}</td>
                          <td className="py-2 text-right text-slate-500">{formatCurrency(item.rate)}</td>
                          <td className="py-2 text-right font-medium text-slate-800">{formatCurrency(item.lineTotal || item.qty * item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
