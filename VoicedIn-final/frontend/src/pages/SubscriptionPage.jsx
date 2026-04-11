import { useState, useEffect } from 'react';
import { Check, Crown, CreditCard, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api, assetUrl } from '../utils/api';
import { formatDate } from '../utils/dateHelpers';

function qrSrc(url) {
  if (!url) return '/premium-payment-qr.svg';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return assetUrl(url);
  return url;
}

export default function SubscriptionPage() {
  const { refreshUser } = useAuth();
  const { showToast } = useApp();
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);

  const loadSubscription = async () => {
    const [subRes, billRes] = await Promise.all([
      api.get('/subscription').catch(() => ({ subscription: null })),
      api.get('/subscription/billing-history').catch(() => ({ billingHistory: [] })),
    ]);
    const nextSubscription = subRes.subscription || subRes;
    setSubscription(nextSubscription);
    setBillingHistory(billRes.billingHistory || []);
    if (nextSubscription?.status === 'active') {
      refreshUser?.().catch(() => {});
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadSubscription();
      } catch (err) {
        console.error('Failed to load subscription', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadSubscription(), refreshUser?.()]);
      showToast('Subscription status refreshed');
    } catch (err) {
      showToast(err.message || 'Failed to refresh subscription status', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const notifyAdminPaid = async () => {
    setRequestingApproval(true);
    try {
      const data = await api.post('/subscription/payment-request', {});
      setSubscription(prev => ({ ...prev, paymentRequest: data.request || prev?.paymentRequest }));
      showToast(data.message || 'Payment request sent to admin');
    } catch (err) {
      showToast(err.message || 'Failed to alert admin', 'error');
    } finally {
      setRequestingApproval(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-slate-400">Loading subscription...</p></div>;
  }

  const isActive = subscription?.status === 'active';
  const payment = subscription?.payment || {};
  const price = Number(subscription?.price || payment.amount || 99);
  const pendingRequest = subscription?.paymentRequest?.status === 'pending' ? subscription.paymentRequest : null;

  const features = [
    { feature: 'Create invoices', free: 'Up to 3', premium: 'Unlimited' },
    { feature: 'Invoice templates', free: 'Preview only', premium: 'All templates' },
    { feature: 'PDF download', free: 'Watermarked', premium: 'Clean PDF' },
    { feature: 'Client memory', free: 'Basic', premium: 'Full history' },
    { feature: 'Payment tracking', free: 'Limited', premium: 'Full tracking' },
    { feature: 'Data export', free: 'Locked', premium: 'PDF, CSV, Excel' },
    { feature: 'Share links', free: 'Locked', premium: 'Enabled' },
    { feature: 'Custom branding', free: 'Locked', premium: 'Logo + bank details' },
  ];

  return (
    <div className="animate-fade-in max-w-4xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Subscription</h1>
      <p className="text-sm text-slate-500 mb-6">Freemium users can upgrade by scanning the static payment QR.</p>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-primary-50' : 'bg-slate-100'}`}>
              <Crown className={`w-6 h-6 ${isActive ? 'text-primary-500' : 'text-slate-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">{isActive ? 'Premium Plan' : 'Freemium Plan'}</h3>
                <Badge status={isActive ? 'active' : 'demo'}>{isActive ? 'Active' : 'Free'}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                {isActive ? 'Premium features are enabled for this account.' : 'Scan the QR below to upgrade after manual confirmation.'}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-2xl font-bold text-slate-800">Rs. {price}<span className="text-sm font-normal text-slate-400">/mo</span></p>
            {isActive && subscription?.renewalDate && <p className="text-xs text-slate-400">Renews {formatDate(subscription.renewalDate)}</p>}
          </div>
        </div>
      </Card>

      {isActive ? (
        <Card className="mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Premium is active</h3>
              <p className="text-sm text-slate-500 mt-1">Exports, share links, custom branding, and clean PDFs are available now.</p>
              <Button variant="outline" size="sm" icon={RefreshCw} loading={refreshing} onClick={refreshStatus} className="mt-4">
                Refresh Status
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <div className="grid md:grid-cols-[240px_1fr] gap-6 items-center">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <img src={qrSrc(payment.qrUrl)} alt="Premium payment QR" className="w-full aspect-square object-contain rounded-2xl bg-slate-50" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Static QR payment
              </div>
              <h3 className="text-xl font-bold text-slate-900">Upgrade to Premium</h3>
              <p className="text-sm text-slate-500 mt-2">Scan the QR and pay Rs. {payment.amount || 99}. After confirmation, your account status will switch to Premium.</p>

              <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 space-y-2">
                <p><span className="font-semibold text-slate-800">Payee:</span> {payment.payeeName || 'VoicedIn'}</p>
                {payment.upiId && <p><span className="font-semibold text-slate-800">UPI:</span> {payment.upiId}</p>}
                <p><span className="font-semibold text-slate-800">Amount:</span> Rs. {payment.amount || 99}</p>
                <p className="text-xs text-slate-500">{payment.note || 'Premium is activated after payment confirmation.'}</p>
              </div>

              {pendingRequest && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Admin approval pending since {formatDate(pendingRequest.requestedAt)}.
                </div>
              )}

              <Button
                variant={pendingRequest ? 'outline' : 'primary'}
                icon={RefreshCw}
                loading={requestingApproval}
                onClick={notifyAdminPaid}
                className="mt-4"
                disabled={Boolean(pendingRequest)}
              >
                {pendingRequest ? 'Approval Pending' : 'I Have Paid, Alert Admin'}
              </Button>
              <Button variant="ghost" icon={RefreshCw} loading={refreshing} onClick={refreshStatus} className="mt-4 ml-2">
                Refresh Status
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Freemium vs Premium</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 text-slate-400 font-medium">Feature</th>
                <th className="text-center py-3 text-slate-400 font-medium">Freemium</th>
                <th className="text-center py-3 text-primary-500 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.map((row) => (
                <tr key={row.feature} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 font-medium text-slate-700">{row.feature}</td>
                  <td className="py-3 text-center text-slate-400">{row.free}</td>
                  <td className="py-3 text-center text-primary-600 font-semibold">
                    <span className="inline-flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {row.premium}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isActive && billingHistory.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-slate-800 mb-4">Billing History</h3>
          <div className="space-y-2">
            {billingHistory.map((bill, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Premium Plan</p>
                    <p className="text-xs text-slate-400">{formatDate(bill.date)} | {bill.method || 'Static QR'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700">{bill.amount || `Rs. ${price}`}</p>
                  <Badge status="paid" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
