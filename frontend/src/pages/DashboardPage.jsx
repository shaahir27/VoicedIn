import { Link } from 'react-router-dom';
import { Plus, TrendingUp, FileText, Clock, AlertTriangle, ArrowRight, IndianRupee, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useInvoices } from '../context/InvoiceContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, daysUntil, getRelativeTime, isOverdue } from '../utils/dateHelpers';

export default function DashboardPage() {
  const { invoices, stats, chartData, recentInvoices: ctxRecent, alerts: ctxAlerts, loadingData, dataError } = useInvoices();

  const recentInvoices = ctxRecent.length > 0
    ? ctxRecent
    : [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const alerts = ctxAlerts.length > 0
    ? ctxAlerts
    : invoices.filter(inv => {
      if (inv.status === 'overdue') return true;
      if (inv.status === 'unpaid' && daysUntil(inv.dueDate) <= 3 && daysUntil(inv.dueDate) >= 0) return true;
      return false;
    });

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { label: 'Total Invoices', value: stats.totalInvoices, icon: FileText, color: 'text-primary-600', bg: 'bg-primary-50', iconColor: 'text-primary-500' },
    { label: 'Pending', value: formatCurrency(stats.pendingAmount), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', iconColor: 'text-amber-500', sub: `${stats.unpaidCount} invoices` },
    { label: 'Overdue', value: formatCurrency(stats.overdueAmount), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', iconColor: 'text-red-500', sub: `${stats.overdueCount} invoices` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here's how your business is doing</p>
        </div>
        <Link to="/invoices/new">
          <Button icon={Plus} size="lg">Create Invoice</Button>
        </Link>
      </div>

      {dataError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not fully refresh invoice data: {dataError}. If the invoice list is empty, check the backend/Supabase migration status.
        </div>
      )}

      {loadingData && invoices.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Loading your saved invoices...
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className={`animate-fade-in-up`} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 mb-1">{stat.label}</p>
                <p className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                {stat.sub && <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>}
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Revenue Trend</h3>
              <p className="text-xs text-slate-400">Last 7 months</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +24%
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Alerts Panel */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800">Alerts</h3>
            <Badge status="overdue">{alerts.length}</Badge>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">All clear! No alerts 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(inv => (
                <div key={inv.id} className={`p-3 rounded-xl border ${inv.status === 'overdue' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{inv.number}</p>
                      <p className="text-xs text-slate-500">{inv.clientName}</p>
                    </div>
                    <Badge status={inv.status} />
                  </div>
                  <p className={`text-xs mt-1.5 ${inv.status === 'overdue' ? 'text-red-500' : 'text-amber-600'}`}>
                    {inv.status === 'overdue' ? `Overdue by ${Math.abs(daysUntil(inv.dueDate))} days` : `Due ${getRelativeTime(inv.dueDate)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Recent Invoices</h3>
          <Link to="/invoices" className="text-sm text-primary-500 font-medium hover:text-primary-600 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-400 py-3 pr-4">Invoice</th>
                <th className="text-left text-xs font-medium text-slate-400 py-3 pr-4">Client</th>
                <th className="text-left text-xs font-medium text-slate-400 py-3 pr-4">Date</th>
                <th className="text-right text-xs font-medium text-slate-400 py-3 pr-4">Amount</th>
                <th className="text-right text-xs font-medium text-slate-400 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map(inv => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium text-slate-800">{inv.number}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-slate-600">{inv.clientName}</p>
                    <p className="text-xs text-slate-400 hidden sm:block">{inv.company}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-slate-500">{formatDate(inv.date)}</p>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(inv.total)}</p>
                  </td>
                  <td className="py-3 text-right">
                    <Badge status={inv.status} />
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
