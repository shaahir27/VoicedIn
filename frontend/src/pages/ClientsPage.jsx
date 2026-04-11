import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Mail, Phone, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices } from '../context/InvoiceContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';

export default function ClientsPage() {
  const { clients, addClient } = useInvoices();
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', companyName: '', gstNumber: '', address: '' });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.companyName || c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async () => {
    try {
      await addClient(newClient);
      setShowAddModal(false);
      setNewClient({ name: '', email: '', phone: '', companyName: '', gstNumber: '', address: '' });
      showToast('Client added successfully!');
    } catch (err) {
      showToast('Failed to add client', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">{clients.length} clients</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={Plus}>Add Client</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." className="mb-6 max-w-md" />

      {filtered.length === 0 ? (
        <EmptyState
          title="No clients found"
          description={search ? 'Try a different search term' : 'Add your first client to get started'}
          actionLabel="Add Client"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Link key={client.id} to={`/clients/${client.id}`}>
              <Card hover className="h-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-lg shrink-0">
                    {client.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
                    <p className="text-xs text-slate-400 truncate">{client.companyName || client.company}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{client.email}</div>
                  <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{client.phone}</div>
                  <div className="flex items-center gap-1.5"><FileText className="w-3 h-3" />{client.gstNumber || client.gst}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400">Invoices</p>
                    <p className="text-sm font-semibold text-slate-800">{client.totalInvoices}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Revenue</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(client.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Due</p>
                    <p className={`text-sm font-semibold ${client.outstanding > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {formatCurrency(client.outstanding)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client" size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" required />
          <Input label="Company Name" value={newClient.companyName} onChange={e => setNewClient({ ...newClient, companyName: e.target.value })} placeholder="Company name" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@example.com" />
            <Input label="Phone" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <Input label="GST Number" value={newClient.gstNumber} onChange={e => setNewClient({ ...newClient, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" />
          <Input label="Address" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} placeholder="Full address" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!newClient.name}>Add Client</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
