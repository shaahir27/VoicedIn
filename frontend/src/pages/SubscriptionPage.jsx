import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, CreditCard, Calendar, ArrowRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { formatDate } from '../utils/dateHelpers';

export default function SubscriptionPage() {
  const { user, isDemo } = useAuth();
  const { showToast } = useApp();
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, billRes] = await Promise.all([
          api.get('/subscription').catch(() => ({ subscription: null })),
          api.get('/subscription/billing-history').catch(() => ({ billingHistory: [] })),
        ]);
        setSubscription(subRes.subscription || subRes);
        setBillingHistory(billRes.billingHistory || []);
      } catch (err) {
        console.error('Failed to load subscription', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const data = await api.post('/subscription/checkout');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        showToast('Checkout session created. Redirect coming...', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to start checkout', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">Loading subscription...</p></div>;

  const isActive = subscription?.status === 'active';

  return (
    <div className="animate-fade-in max-w-3xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Subscription</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your plan and billing</p>

      {/* Current Plan */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDemo ? 'bg-slate-100' : 'bg-primary-50'}`}>
              <Crown className={`w-6 h-6 ${isDemo ? 'text-slate-400' : 'text-primary-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">{isActive ? 'Premium' : 'Demo'} Plan</h3>
                <Badge status={isActive ? 'active' : 'demo'}>{isActive ? 'Active' : 'Free'}</Badge>
              </div>
              <p className="text-sm text-slate-500">{isActive ? 'Full access to all features' : 'Limited access — upgrade to unlock everything'}</p>
            </div>
          </div>
          {isActive && (
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-slate-800">₹99<span className="text-sm font-normal text-slate-400">/mo</span></p>
              {subscription?.currentPeriodEnd && <p className="text-xs text-slate-400">Renews {formatDate(subscription.currentPeriodEnd)}</p>}
            </div>
          )}
        </div>

        {!isActive && (
          <div className="bg-gradient-to-r from-primary-500 to-violet-500 rounded-xl p-5 text-white mt-4">
            <h4 className="text-base font-bold mb-2">Upgrade to Premium</h4>
            <p className="text-sm text-primary-100 mb-4">Get unlimited invoices, client memory, payment tracking, and more for just ₹99/month.</p>
            <Button className="!bg-white !text-primary-600 hover:!bg-primary-50" size="lg" iconRight={ArrowRight} onClick={handleUpgrade} loading={upgrading}>
              Upgrade Now — ₹99/mo
            </Button>
          </div>
        )}
      </Card>

      {/* Plan Comparison */}
      <Card className="mb-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Plan Features</h3>
        <div className="space-y-3">
          {[
            { feature: 'Create invoices', demo: 'Up to 3', premium: 'Unlimited' },
            { feature: 'Invoice templates', demo: 'Preview only', premium: 'All templates' },
            { feature: 'PDF download', demo: 'Watermarked', premium: 'Clean PDF' },
            { feature: 'Client memory', demo: '—', premium: '✓' },
            { feature: 'Payment tracking', demo: '—', premium: '✓' },
            { feature: 'Data export', demo: '—', premium: 'CSV + Excel' },
            { feature: 'Share links', demo: '—', premium: '✓' },
            { feature: 'Custom branding', demo: '—', premium: '✓' },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 py-2 border-b border-slate-50 last:border-0 text-sm">
              <span className="text-slate-700 font-medium">{row.feature}</span>
              <span className="text-slate-400 text-center">{row.demo}</span>
              <span className="text-primary-600 font-medium text-center">{row.premium}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Billing History */}
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
                    <p className="text-xs text-slate-400">{formatDate(bill.date)} · {bill.method || 'Dodo'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700">₹{bill.amount || 99}</p>
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
