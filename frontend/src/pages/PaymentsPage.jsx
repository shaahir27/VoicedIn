import { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useInvoices } from '../context/InvoiceContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, daysUntil, getRelativeTime } from '../utils/dateHelpers';

export default function PaymentsPage() {
  const { invoices, payments, markAsPaid, stats } = useInvoices();
  const { showToast } = useApp();
  const [showPayModal, setShowPayModal] = useState(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('UPI');

  const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue');

  const handlePay = async () => {
    if (showPayModal) {
      try {
        await markAsPaid(showPayModal.id, payDate, payMethod);
        showToast(`Payment recorded for ${showPayModal.number}`);
        setShowPayModal(null);
      } catch (err) {
        showToast('Failed to record payment', 'error');
      }
    }
  };

  const summaryCards = [
    { label: 'Total Received', value: formatCurrency(stats.totalRevenue), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Outstanding', value: formatCurrency(stats.pendingAmount), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Overdue', value: formatCurrency(stats.overdueAmount), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Payments</h1>
      <p className="text-sm text-slate-500 mb-6">Track and manage all your payments</p>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((s, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.color} break-words`}>{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unpaid Invoices */}
        <Card>
          <h3 className="text-base font-semibold text-slate-800 mb-4">Awaiting Payment ({unpaidInvoices.length})</h3>
          {unpaidInvoices.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">All caught up! 🎉</p>
          ) : (
            <div className="space-y-3">
              {unpaidInvoices.map(inv => (
                <div key={inv.id} className={`p-3 rounded-xl border ${inv.status === 'overdue' ? 'bg-red-50/30 border-red-100' : 'bg-amber-50/30 border-amber-100'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{inv.number}</p>
                      <p className="text-xs text-slate-500">{inv.clientName}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800 sm:text-right">{formatCurrency(inv.total)}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className={`text-xs ${inv.status === 'overdue' ? 'text-red-500' : 'text-amber-600'}`}>
                      {inv.status === 'overdue'
                        ? `Overdue by ${Math.abs(daysUntil(inv.dueDate))} days`
                        : `Due ${getRelativeTime(inv.dueDate)}`}
                    </p>
                    <Button size="sm" variant="success" onClick={() => setShowPayModal(inv)}>Mark Paid</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment History */}
        <Card>
          <h3 className="text-base font-semibold text-slate-800 mb-4">Payment History</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {[...payments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(pay => (
                <div key={pay.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{pay.clientName}</p>
                      <p className="text-xs text-slate-400">{pay.invoiceNumber} · {formatDate(pay.date)} · {pay.method}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">+{formatCurrency(pay.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Mark Paid Modal */}
      <Modal isOpen={!!showPayModal} onClose={() => setShowPayModal(null)} title="Record Payment" size="sm">
        {showPayModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-sm font-medium text-slate-800">{showPayModal.number}</p>
              <p className="text-xs text-slate-500">{showPayModal.clientName}</p>
              <p className="text-lg font-bold text-primary-600 mt-1">{formatCurrency(showPayModal.total)}</p>
            </div>
            <Input label="Payment Date" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            <Select
              label="Payment Method"
              value={payMethod}
              onChange={e => setPayMethod(e.target.value)}
              options={[
                { value: 'UPI', label: 'UPI' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Card', label: 'Card' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPayModal(null)}>Cancel</Button>
              <Button variant="success" onClick={handlePay}>Confirm Payment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
