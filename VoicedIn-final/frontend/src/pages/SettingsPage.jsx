import { useState, useEffect } from 'react';
import { Building, Upload, Receipt, FileText, Hash, Save, Landmark } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Tabs from '../components/ui/Tabs';
import { useApp } from '../context/AppContext';
import { api, assetUrl } from '../utils/api';

export default function SettingsPage() {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState({ name: '', email: '', phone: '', address: '', website: '' });
  const [logoUrl, setLogoUrl] = useState(null);
  const [tax, setTax] = useState({ gst: '', taxRate: '18', panNumber: '' });
  const [bank, setBank] = useState({
    bankAccountName: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankUpi: '',
    includeBankDetails: false,
  });
  const [currency, setCurrency] = useState('INR');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, settingsRes] = await Promise.all([
          api.get('/business-profile'),
          api.get('/settings'),
        ]);
        if (profileRes.profile) {
          const p = profileRes.profile;
          setBusiness({ name: p.businessName || '', email: p.email || p.contactEmail || '', phone: p.phone || p.contactPhone || '', address: p.address || p.businessAddress || '', website: p.website || '' });
          setLogoUrl(p.logoUrl || null);
          setBank({
            bankAccountName: p.bankAccountName || '',
            bankName: p.bankName || '',
            bankAccountNumber: p.bankAccountNumber || '',
            bankIfsc: p.bankIfsc || '',
            bankUpi: p.bankUpi || '',
            includeBankDetails: Boolean(p.includeBankDetails),
          });
        }
        if (settingsRes.settings) {
          const s = settingsRes.settings;
          setTax({ gst: s.gst || '', taxRate: String(s.taxRate || 18), panNumber: s.panNumber || '' });
          setCurrency(s.currency || 'INR');
          setInvoicePrefix(s.invoicePrefix || 'INV');
          setTerms(s.defaultTerms || '');
          setBank(prev => ({
            bankAccountName: s.bankAccountName ?? prev.bankAccountName,
            bankName: s.bankName ?? prev.bankName,
            bankAccountNumber: s.bankAccountNumber ?? prev.bankAccountNumber,
            bankIfsc: s.bankIfsc ?? prev.bankIfsc,
            bankUpi: s.bankUpi ?? prev.bankUpi,
            includeBankDetails: Boolean(s.includeBankDetails ?? prev.includeBankDetails),
          }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveBusinessProfile = async () => {
    setSaving(true);
    try {
      await api.put('/business-profile', {
        businessName: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        website: business.website,
      });
      showToast('Business profile saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveTaxSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings/tax', { gst: tax.gst, taxRate: Number(tax.taxRate), panNumber: tax.panNumber });
      showToast('Tax settings saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveInvoiceSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings/invoice', { currency, invoicePrefix, defaultTerms: terms });
      showToast('Invoice preferences saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveBankDetails = async () => {
    setSaving(true);
    try {
      await api.put('/business-profile', bank);
      showToast('Bank details saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save bank details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const data = await api.upload('/business-profile/logo', formData);
      setLogoUrl(data.logoUrl);
      showToast('Logo uploaded!');
    } catch (err) {
      showToast(err.message || 'Failed to upload logo', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">Loading settings...</p></div>;

  const tabs = [
    {
      id: 'business',
      label: 'Business Profile',
      content: (
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Building className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-slate-800">Business Profile</h3>
          </div>

          {/* Logo upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Business Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center border-2 border-dashed border-primary-200 overflow-hidden">
                {logoUrl ? <img src={assetUrl(logoUrl)} alt="Logo" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-primary-400" />}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Business Name" value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} />
            <Input label="Email" type="email" value={business.email} onChange={e => setBusiness({ ...business, email: e.target.value })} />
            <Input label="Phone" value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} />
            <Input label="Website" value={business.website} onChange={e => setBusiness({ ...business, website: e.target.value })} />
          </div>
          <Input label="Address" value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} className="mt-4" />
          <div className="flex justify-end mt-6">
            <Button onClick={saveBusinessProfile} loading={saving} icon={Save}>Save Changes</Button>
          </div>
        </Card>
      ),
    },
    {
      id: 'tax',
      label: 'Tax & GST',
      content: (
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Receipt className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-slate-800">Tax Settings</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="GST Number" value={tax.gst} onChange={e => setTax({ ...tax, gst: e.target.value })} />
            <Input label="Default Tax Rate (%)" type="number" value={tax.taxRate} onChange={e => setTax({ ...tax, taxRate: e.target.value })} />
            <Input label="PAN Number" value={tax.panNumber} onChange={e => setTax({ ...tax, panNumber: e.target.value })} />
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={saveTaxSettings} loading={saving} icon={Save}>Save Changes</Button>
          </div>
        </Card>
      ),
    },
    {
      id: 'bank',
      label: 'Bank Details',
      content: (
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Landmark className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-slate-800">Bank Account Details</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Account Holder Name" value={bank.bankAccountName} onChange={e => setBank({ ...bank, bankAccountName: e.target.value })} />
            <Input label="Bank Name" value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} />
            <Input label="Account Number" value={bank.bankAccountNumber} onChange={e => setBank({ ...bank, bankAccountNumber: e.target.value })} />
            <Input label="IFSC Code" value={bank.bankIfsc} onChange={e => setBank({ ...bank, bankIfsc: e.target.value.toUpperCase() })} />
            <Input label="UPI ID" value={bank.bankUpi} onChange={e => setBank({ ...bank, bankUpi: e.target.value })} />
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={bank.includeBankDetails}
              onChange={e => setBank({ ...bank, includeBankDetails: e.target.checked })}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-slate-800">Include bank details in invoice PDFs</span>
              <span className="block text-xs text-slate-500 mt-0.5">Turn this off if you want PDFs without payment account details.</span>
            </span>
          </label>
          <div className="flex justify-end mt-6">
            <Button onClick={saveBankDetails} loading={saving} icon={Save}>Save Bank Details</Button>
          </div>
        </Card>
      ),
    },
    {
      id: 'invoice',
      label: 'Invoice Preferences',
      content: (
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="text-base font-semibold text-slate-800">Invoice Preferences</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Currency"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              options={[
                { value: 'INR', label: '₹ Indian Rupee (INR)' },
                { value: 'USD', label: '$ US Dollar (USD)' },
                { value: 'EUR', label: '€ Euro (EUR)' },
                { value: 'GBP', label: '£ British Pound (GBP)' },
              ]}
            />
            <Input label="Invoice Prefix" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} helperText="Example: INV-2604-0001" icon={Hash} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Terms & Notes</label>
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            />
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={saveInvoiceSettings} loading={saving} icon={Save}>Save Changes</Button>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="animate-fade-in max-w-3xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your business profile and preferences</p>
      <Tabs tabs={tabs} defaultTab="business" />
    </div>
  );
}
