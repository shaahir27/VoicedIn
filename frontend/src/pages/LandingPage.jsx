import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Zap, Users, CreditCard, Shield, Palette, ChevronDown, ChevronUp,
  ArrowRight, Star, Check, X, Clock, Download, BarChart3, Sparkles
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const features = [
  { icon: Zap, title: 'Instant Invoices', desc: 'Create professional invoices in under 60 seconds. Auto-fill client details, reuse templates.' },
  { icon: Users, title: 'Client Memory', desc: 'voicedIn remembers your clients — GST, address, past invoices. Never re-enter data.' },
  { icon: CreditCard, title: 'Payment Tracking', desc: 'Track paid, unpaid, and overdue invoices. Get friendly due date reminders.' },
  { icon: Palette, title: 'Beautiful Templates', desc: 'Choose from 5 premium invoice designs. Your brand, your style, always professional.' },
  { icon: Download, title: 'Export Everything', desc: 'Download PDF, export CSV/Excel, generate shareable links for your records.' },
  { icon: Shield, title: 'Simple & Secure', desc: 'No complicated setup. No learning curve. Start invoicing in minutes.' },
];

const comparisons = [
  { feature: 'Invoice creation time', voicedin: 'Under 60 seconds', others: '5–10 minutes' },
  { feature: 'Client auto-fill', voicedin: '✓ Built-in', others: '✗ Manual entry' },
  { feature: 'Mobile experience', voicedin: 'Native-quality', others: 'Basic / broken' },
  { feature: 'Pricing', voicedin: '₹99/month', others: '₹500–2000/month' },
  { feature: 'Learning curve', voicedin: 'Zero', others: 'Hours of tutorials' },
  { feature: 'Duplicate invoices', voicedin: 'One click', others: 'Not available' },
];

const testimonials = [
  { name: 'Neha Kapoor', role: 'Freelance Designer', text: 'voicedIn saved me hours every week. I used to dread invoicing — now it takes me 30 seconds.', rating: 5 },
  { name: 'Amit Patel', role: 'IT Consultant', text: 'The client memory feature is genius. It remembers everything so I don\'t have to.', rating: 5 },
  { name: 'Sanya Rao', role: 'Content Writer', text: 'Clean, fast, affordable. Exactly what freelancers need. Nothing more, nothing less.', rating: 5 },
];

const faqs = [
  { q: 'Is voicedIn free to try?', a: 'Yes! You can try the demo with limited features — create up to 3 invoices and preview all templates. No credit card required.' },
  { q: 'What does the Premium plan include?', a: 'Unlimited invoices, all templates, client memory, payment tracking, PDF/CSV/Excel exports, shareable links, and priority support — all for just ₹99/month.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. No lock-in contracts. Cancel your subscription anytime from the billing settings.' },
  { q: 'Does it work on mobile?', a: 'Yes! voicedIn is designed mobile-first. Create and manage invoices beautifully on any device.' },
  { q: 'Is my data secure?', a: 'Your data is encrypted and stored securely. We follow industry-standard security practices to protect your information.' },
  { q: 'Can I add my business logo?', a: 'Yes, Premium users can upload their business logo, customize invoice templates, and set default terms and notes.' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-white to-white" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Built for freelancers who hate invoicing
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6 animate-fade-in-up">
            Create invoices in <br className="hidden sm:block" />
            <span className="gradient-text">seconds, not minutes</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animate-delay-100">
            The simplest invoice generator for freelancers and small businesses.
            Track payments, remember clients, get paid faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-200">
            <Link to="/demo">
              <Button size="xl" variant="outline" icon={Zap}>Try Demo Free</Button>
            </Link>
            <Link to="/signup">
              <Button size="xl" iconRight={ArrowRight}>Start for ₹99/mo</Button>
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-400 animate-fade-in-up animate-delay-300">No credit card required · Cancel anytime</p>

          {/* App preview */}
          <div className="mt-16 animate-fade-in-up animate-delay-400">
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                {/* Fake browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white rounded-lg px-4 py-1 text-xs text-slate-400 border border-slate-200">app.voicedin.io/dashboard</div>
                  </div>
                </div>
                {/* Dashboard mockup */}
                <div className="p-6 bg-gradient-to-b from-slate-50 to-white">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Total Revenue', value: '₹9,52,500', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Invoices', value: '10', color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Pending', value: '₹2,30,100', color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Overdue', value: '₹2,18,300', color: 'text-red-600', bg: 'bg-red-50' },
                    ].map(stat => (
                      <div key={stat.label} className={`${stat.bg} rounded-xl p-3`}>
                        <p className="text-[10px] sm:text-xs text-slate-500 mb-1">{stat.label}</p>
                        <p className={`text-sm sm:text-lg font-bold ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-700">Recent Invoices</p>
                      <p className="text-xs text-primary-500 font-medium">View all</p>
                    </div>
                    {['INV-2604-0001 · Priya Sharma · ₹41,300', 'INV-2604-0002 · Rahul Mehta · ₹1,12,100', 'INV-2604-0003 · Ananya Reddy · ₹38,940'].map((inv, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-t border-slate-50 text-xs sm:text-sm">
                        <span className="text-slate-600">{inv}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${i === 1 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {i === 1 ? 'Unpaid' : 'Paid'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 inset-4 bg-primary-100/50 rounded-2xl blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-500 mb-3">FEATURES</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything you need. Nothing you don't.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">voicedIn is built for people who want to get invoicing done and move on to real work.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card key={i} hover className={`animate-fade-in-up animate-delay-${(i + 1) * 100}`}>
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why voicedIn */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-500 mb-3">COMPARISON</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Why voicedIn is different</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-sm font-semibold">
              <div className="text-slate-600">Feature</div>
              <div className="text-primary-600 text-center">voicedIn</div>
              <div className="text-slate-400 text-center">Others</div>
            </div>
            {comparisons.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 border-b border-slate-50 text-sm">
                <div className="text-slate-700 font-medium">{c.feature}</div>
                <div className="text-emerald-600 text-center font-medium">{c.voicedin}</div>
                <div className="text-slate-400 text-center">{c.others}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-500 mb-3">PRICING</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simple, honest pricing</h2>
            <p className="text-slate-500">No hidden fees. No surprises. Just great invoicing.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Demo */}
            <Card className="relative">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Demo</h3>
              <p className="text-sm text-slate-500 mb-6">Try before you buy</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-800">Free</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Create up to 3 invoices', 'Preview all templates', 'Basic dashboard', 'Watermarked exports'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/demo">
                <Button variant="outline" fullWidth size="lg">Try Demo</Button>
              </Link>
            </Card>

            {/* Premium */}
            <Card className="relative border-primary-200 shadow-primary-100/50 shadow-lg ring-1 ring-primary-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Premium</h3>
              <p className="text-sm text-slate-500 mb-6">Everything you need</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-800">₹99</span>
                <span className="text-slate-500 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited invoices', 'All premium templates', 'Client memory system', 'Payment tracking', 'PDF, CSV, Excel export', 'Shareable links', 'Custom branding', 'Priority support'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <Button fullWidth size="lg">Get Started</Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-500 mb-3">TESTIMONIALS</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Loved by freelancers</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="text-center">
                <div className="flex justify-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">"{t.text}"</p>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 mx-auto mb-2">
                  {t.name[0]}
                </div>
                <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500">{t.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-500 mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Got questions?</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800 pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-primary-500 to-violet-500">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to simplify your invoicing?</h2>
          <p className="text-primary-100 text-lg mb-8">Join thousands of freelancers who invoice smarter with voicedIn.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/demo">
              <Button size="xl" variant="outline" className="!border-white/30 !text-white hover:!bg-white/10">Try Demo</Button>
            </Link>
            <Link to="/signup">
              <Button size="xl" className="!bg-white !text-primary-600 hover:!bg-primary-50">Get Started — ₹99/mo</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
