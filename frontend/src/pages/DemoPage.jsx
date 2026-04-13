import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles, Eye, Crown, FileText, Plus } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { formatCurrency } from '../utils/formatCurrency';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';

const demoItems = [
  { description: 'Website Design & Development', qty: 1, rate: 45000, tax: 18 },
  { description: 'SEO Optimization Package', qty: 1, rate: 12000, tax: 18 },
];

export default function DemoPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(demoItems);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [clientName, setClientName] = useState('Acme Corp');
  const [step, setStep] = useState(1);
  const [isDownloadingDemoPdf, setIsDownloadingDemoPdf] = useState(false);
  const showPreview = step === 3;

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const taxTotal = items.reduce((s, i) => s + (i.qty * i.rate * i.tax) / 100, 0);
  const total = subtotal + taxTotal;

  const handleTryDashboard = () => {
    navigate('/login', { state: { redirectTo: '/subscription' } });
  };

  const handleBlockedAction = () => setShowUpgrade(true);

  const handleDownloadDemoPdf = async () => {
    try {
      setIsDownloadingDemoPdf(true);
      await downloadInvoicePdf(
        buildDemoInvoice(clientName, items, subtotal, taxTotal, total),
        'INV-DEMO-0001',
        {
          businessProfile: buildDemoBusinessProfile(),
          showDemoWatermark: true,
        },
      );
    } finally {
      setIsDownloadingDemoPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Interactive Demo
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Experience voicedIn</h1>
          <p className="text-slate-500 max-w-lg mx-auto">Try invoice creation live. No signup required. Feel how simple it is.</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <button key={s} onClick={() => setStep(s)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer
              ${step === s ? 'bg-primary-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
              {s}. {s === 1 ? 'Client' : s === 2 ? 'Items' : 'Preview'}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-5">
            {step === 1 && (
              <Card className="animate-fade-in">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Step 1: Client Details</h3>
                <Input label="Client / Company Name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Enter client name" />
                <div className="mt-4 p-3 bg-primary-50/50 rounded-xl border border-primary-100">
                  <div className="flex items-center gap-2 text-xs text-primary-600 font-medium">
                    <Lock className="w-3 h-3" />
                    Client memory auto-fills GST, address & more (Premium)
                  </div>
                </div>
                <Button onClick={() => setStep(2)} className="mt-4" iconRight={ArrowRight}>Next: Add Items</Button>
              </Card>
            )}

            {step === 2 && (
              <Card className="animate-fade-in">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Step 2: Line Items</h3>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <input type="text" value={item.description} onChange={e => {
                        const u = [...items]; u[i] = { ...u[i], description: e.target.value }; setItems(u);
                      }} className="w-full bg-white rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Qty</label>
                          <input type="number" value={item.qty} onChange={e => {
                            const u = [...items]; u[i] = { ...u[i], qty: Number(e.target.value) }; setItems(u);
                          }} className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Rate (₹)</label>
                          <input type="number" value={item.rate} onChange={e => {
                            const u = [...items]; u[i] = { ...u[i], rate: Number(e.target.value) }; setItems(u);
                          }} className="w-full bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">Amount</label>
                          <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700">
                            {formatCurrency(item.qty * item.rate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" size="sm" icon={Plus} onClick={() => setItems([...items, { description: '', qty: 1, rate: 0, tax: 18 }])}>Add Item</Button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)} iconRight={ArrowRight}>Preview Invoice</Button>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card className="animate-fade-in">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Step 3: Actions</h3>
                <div className="space-y-3">
                  <Button fullWidth onClick={handleBlockedAction} icon={FileText}>Generate PDF</Button>
                  <Button fullWidth variant="outline" onClick={handleDownloadDemoPdf} icon={Lock} disabled={isDownloadingDemoPdf}>
                    {isDownloadingDemoPdf ? 'Downloading…' : 'Download Invoice'}
                  </Button>
                  <Button fullWidth variant="outline" onClick={handleBlockedAction} icon={Lock}>Save & Share</Button>
                  <Button fullWidth variant="ghost" onClick={handleTryDashboard} icon={Eye}>Explore Full Dashboard</Button>
                </div>
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">
                  Demo sample downloads include a small watermark. <Link to="/login" state={{ redirectTo: '/subscription' }} className="font-semibold text-primary-600 underline">Upgrade to Premium</Link> for unlimited exports.
                </div>
              </Card>
            )}
          </div>

          {/* Preview */}
          <Card className="!p-0 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Invoice Preview</p>
              <Badge status="demo">Demo</Badge>
            </div>

            {showPreview ? (
              <div className="p-6 sm:p-8 bg-white relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] rotate-[-30deg]">
                  <p className="text-7xl font-extrabold text-slate-900 select-none">DEMO</p>
                </div>

                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-extrabold tracking-tight">
                        <span className="text-slate-800">voiced</span>
                        <span className="text-primary-500">In</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Invoice</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-800">INV-DEMO-0001</p>
                      <p className="text-xs text-slate-400">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4 min-h-28">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase mb-2">Client</p>
                      <p className="text-sm font-semibold text-slate-800">{clientName || 'Client Name'}</p>
                      <p className="text-xs text-slate-500 mt-2">Name and billing details appear here once entered.</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 min-h-28">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase mb-2">Item Summary</p>
                      <p className="text-xs text-slate-500">Line items, rates, tax, and totals update as you type.</p>
                    </div>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-2 text-slate-500">Description</th>
                        <th className="text-center py-2 text-slate-500">Qty</th>
                        <th className="text-right py-2 text-slate-500">Rate</th>
                        <th className="text-right py-2 text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-700">{item.description || 'Item'}</td>
                          <td className="py-2 text-center text-slate-600">{item.qty}</td>
                          <td className="py-2 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                          <td className="py-2 text-right font-medium text-slate-800">{formatCurrency(item.qty * item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="grid sm:grid-cols-[1fr_220px] gap-4 items-start">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 min-h-24">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase mb-2">Preview Locked</p>
                      <p className="text-xs text-slate-500">Add client details and items to reveal the full invoice sheet.</p>
                    </div>
                    <div className="space-y-1 rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Tax (18%)</span><span>{formatCurrency(taxTotal)}</span></div>
                      <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                        <span>Total</span><span className="text-primary-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 bg-white">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-800">Your invoice preview will appear here</p>
                  <p className="mt-2 text-xs text-slate-500">Complete the client and item steps to unlock the preview.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Upgrade Modal */}
      <Modal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} title="Upgrade to Premium" size="sm">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Unlock Full Access</h3>
          <p className="text-sm text-slate-500 mb-6">Get clean PDF downloads, client memory, payment tracking, and more for just ₹49/month.</p>
          <div className="space-y-2">
            <Link to="/login" state={{ redirectTo: '/subscription' }}>
              <Button fullWidth size="lg">Get Premium — ₹49/mo</Button>
            </Link>
            <Button fullWidth variant="ghost" onClick={() => setShowUpgrade(false)}>Continue Demo</Button>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}

function buildDemoInvoice(clientName, items, subtotal, taxTotal, total) {
  return {
    id: 'demo-invoice',
    number: 'INV-DEMO-0001',
    date: new Date().toLocaleDateString('en-GB'),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
    status: 'draft',
    currency: 'INR',
    clientName: clientName || 'Acme Corp',
    clientCompanyName: clientName || 'Acme Corp',
    clientGstNumber: '22AAAAA0000A1Z5',
    clientAddress: 'Demo client address',
    notes: 'Sample invoice exported from the demo flow.',
    terms: 'Payment due within 7 days.',
    items: items.map(item => ({
      description: item.description || 'Item',
      qty: item.qty,
      rate: item.rate,
      tax: item.tax ?? 18,
    })),
    subtotal,
    taxTotal,
    total,
    isDemo: true,
    includeBankDetails: false,
  };
}

function buildDemoBusinessProfile() {
  return {
    businessName: 'voicedIn',
    name: 'voicedIn',
    address: 'Demo business address',
    email: 'hello@voicedin.lat',
    phone: '7904515049',
    gst: '',
    panNumber: '',
    currency: 'INR',
    includeBankDetails: false,
    isDemo: true,
  };
}
