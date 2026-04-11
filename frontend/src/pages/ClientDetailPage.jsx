import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, FileText, Plus, CreditCard, Building } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices } from '../context/InvoiceContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateHelpers';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, getClientInvoices, getClientPayments } = useInvoices();

  const client = clients.find(c => c.id === id);
  if (!client) return <EmptyState title="Client not found" description="This client doesn't exist" actionLabel="Back to Clients" onAction={() => navigate('/clients')} />;

  const clientInvoices = getClientInvoices(id);
  const clientPayments = getClientPayments(id);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clients')} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Client Details</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl font-bold text-primary-600 mb-3">
              {client.name[0]}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{client.name}</h2>
            <p className="text-sm text-slate-500">{client.company}</p>
          </div>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{client.email}</div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{client.phone}</div>
            <div className="flex items-center gap-2"><Building className="w-4 h-4 text-slate-400" />{client.gst}</div>
            <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5" />{client.address}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="text-xs text-slate-400">Revenue</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(client.totalRevenue)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="text-xs text-slate-400">Outstanding</p>
              <p className={`text-sm font-bold ${client.outstanding > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{formatCurrency(client.outstanding)}</p>
            </div>
          </div>

          <Link to="/invoices/new" className="block mt-4">
            <Button fullWidth icon={Plus} size="lg">Create Invoice</Button>
          </Link>
        </Card>

        {/* Invoices & Payments */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">Invoice History</h3>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-medium">{clientInvoices.length}</span>
            </div>
            {clientInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {clientInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{inv.number}</p>
                        <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-slate-700">{formatCurrency(inv.total)}</p>
                      <Badge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">Payment History</h3>
              <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-medium">{clientPayments.length}</span>
            </div>
            {clientPayments.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {clientPayments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{pay.invoiceNumber}</p>
                        <p className="text-xs text-slate-400">{formatDate(pay.date)} · {pay.method}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">+{formatCurrency(pay.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
