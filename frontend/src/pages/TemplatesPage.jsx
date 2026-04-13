import { useEffect, useState } from 'react';
import { Check, Star, Eye } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { templates } from '../data/templates';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';
import { api } from '../utils/api';

export default function TemplatesPage() {
  const { showToast } = useApp();
  const [selected, setSelected] = useState('modern');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState('');

  useEffect(() => {
    let isMounted = true;
    api.get('/settings')
      .then(data => {
        if (!isMounted) return;
        if (data.settings?.defaultTemplate) setSelected(data.settings.defaultTemplate);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelect = async (id) => {
    setSavingTemplate(id);
    try {
      await api.put('/settings/invoice', { defaultTemplate: id });
      setSelected(id);
      showToast(`${templates.find(t => t.id === id)?.name} template selected`);
    } catch (err) {
      showToast(err.message || 'Failed to save template', 'error');
    } finally {
      setSavingTemplate('');
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Invoice Templates</h1>
      <p className="text-sm text-slate-500 mb-6">Choose a design for your invoices</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(tmpl => (
          <Card key={tmpl.id} hover className={`relative ${selected === tmpl.id ? 'ring-2 ring-primary-500 border-primary-200' : ''}`}>
            {tmpl.popular && (
              <div className="absolute -top-2 right-4">
                <Badge status="premium" className="flex items-center gap-1"><Star className="w-3 h-3" />Popular</Badge>
              </div>
            )}

            {/* Template preview */}
            <div className="aspect-[3/4] bg-slate-50 rounded-xl mb-4 overflow-hidden relative group">
              <div className="absolute inset-0 p-4" style={{ fontSize: '6px' }}>
                {/* Mini invoice preview */}
                <div className="h-full border border-slate-200 rounded-lg bg-white p-3 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-3 rounded" style={{ backgroundColor: tmpl.colors.primary }} />
                    <div className="space-y-1 text-right">
                      <div className="w-16 h-2 bg-slate-200 rounded ml-auto" />
                      <div className="w-10 h-1.5 bg-slate-100 rounded ml-auto" />
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: tmpl.colors.accent }}>
                    <div className="w-14 h-1.5 bg-slate-200 rounded mb-1" />
                    <div className="w-20 h-1.5 bg-slate-100 rounded" />
                  </div>
                  <div className="flex-1 mt-3 space-y-1.5">
                    <div className="flex justify-between">
                      <div className="w-20 h-1.5 bg-slate-200 rounded" />
                      <div className="w-8 h-1.5 bg-slate-200 rounded" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-16 h-1.5 bg-slate-100 rounded" />
                      <div className="w-8 h-1.5 bg-slate-100 rounded" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-24 h-1.5 bg-slate-100 rounded" />
                      <div className="w-8 h-1.5 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="mt-auto pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <div className="w-8 h-2 rounded" style={{ backgroundColor: tmpl.colors.primary, opacity: 0.3 }} />
                      <div className="w-12 h-2 rounded font-bold" style={{ backgroundColor: tmpl.colors.primary }} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                <Button variant="outline" size="sm" icon={Eye} className="opacity-0 group-hover:opacity-100 transition-opacity !bg-white"
                  onClick={(e) => { e.stopPropagation(); setPreviewTemplate(tmpl); }}>
                  Preview
                </Button>
              </div>
            </div>

            <h3 className="text-base font-semibold text-slate-800 mb-1">{tmpl.name}</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{tmpl.description}</p>

            <Button
              fullWidth
              variant={selected === tmpl.id ? 'primary' : 'outline'}
              icon={selected === tmpl.id ? Check : undefined}
              disabled={savingTemplate === tmpl.id}
              onClick={() => handleSelect(tmpl.id)}
            >
              {savingTemplate === tmpl.id ? 'Saving...' : selected === tmpl.id ? 'Selected' : 'Use Template'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={`${previewTemplate?.name} Template`} size="lg">
        {previewTemplate && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="w-24 h-6 rounded-lg mb-2" style={{ backgroundColor: previewTemplate.colors.primary }} />
                <p className="text-xs text-slate-400">INVOICE</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: previewTemplate.colors.primary }}>INV-2604-0001</p>
                <p className="text-xs text-slate-400">Date: 01 Mar 2026</p>
                <p className="text-xs text-slate-400">Due: 15 Mar 2026</p>
              </div>
            </div>
            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: previewTemplate.colors.accent }}>
              <p className="text-xs text-slate-400 mb-1">BILL TO</p>
              <p className="text-sm font-semibold text-slate-800">Priya Sharma</p>
              <p className="text-xs text-slate-500">Sharma Design Studio</p>
            </div>
            <table className="w-full text-sm mb-6">
              <thead><tr className="border-b-2" style={{ borderColor: previewTemplate.colors.primary + '30' }}><th className="text-left py-2 text-slate-500">Description</th><th className="text-center py-2 text-slate-500">Qty</th><th className="text-right py-2 text-slate-500">Rate</th><th className="text-right py-2 text-slate-500">Amount</th></tr></thead>
              <tbody>
                <tr className="border-b border-slate-100"><td className="py-2">Brand Identity Design</td><td className="text-center py-2">1</td><td className="text-right py-2">{formatCurrency(25000)}</td><td className="text-right py-2 font-medium">{formatCurrency(25000)}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2">Social Media Kit</td><td className="text-center py-2">1</td><td className="text-right py-2">{formatCurrency(10000)}</td><td className="text-right py-2 font-medium">{formatCurrency(10000)}</td></tr>
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-48">
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-400">Subtotal</span><span>{formatCurrency(35000)}</span></div>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-400">Tax (18%)</span><span>{formatCurrency(6300)}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2" style={{ borderColor: previewTemplate.colors.primary + '30' }}>
                  <span>Total</span><span style={{ color: previewTemplate.colors.primary }}>{formatCurrency(41300)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
