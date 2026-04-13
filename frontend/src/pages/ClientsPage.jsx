import { useState } from 'react';
import { Plus, Mail, Phone, FileText, Eye, Pencil, Trash2, Building, MapPin } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { useInvoices } from '../context/InvoiceContext';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatCurrency';

const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyClientForm = { name: '', email: '', phone: '', companyName: '', gstNumber: '', address: '' };

function normalizeClientForm(client) {
  return {
    name: (client.name || '').trim(),
    email: (client.email || '').trim(),
    phone: (client.phone || '').trim(),
    companyName: (client.companyName || '').trim(),
    gstNumber: (client.gstNumber || '').trim().toUpperCase(),
    address: (client.address || '').trim(),
  };
}

function validateClientForm(client) {
  if (!client.name) throw new Error('Client name is required');
  if (!client.companyName) throw new Error('Company name is required');
  if (client.email && !emailPattern.test(client.email)) throw new Error('Enter a valid email address');
  if (!client.gstNumber) throw new Error('GST number is required');
  if (!gstPattern.test(client.gstNumber)) throw new Error('Enter a valid GST number');
  if (!client.address) throw new Error('Address is required');
}

function getClientCompany(client) {
  return client.companyName || client.company || '';
}

function getClientGst(client) {
  return client.gstNumber || client.gst || '';
}

function getClientInitial(client) {
  return (client.name || getClientCompany(client) || '?').charAt(0).toUpperCase();
}

function ClientDetailRow({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Not added'}</p>
    </div>
  );
}

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useInvoices();
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ ...emptyClientForm });
  const [viewClient, setViewClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editClient, setEditClient] = useState({ ...emptyClientForm });
  const [deletingClientId, setDeletingClientId] = useState('');
  const [clientPendingDelete, setClientPendingDelete] = useState(null);
  const [savingClient, setSavingClient] = useState(false);

  const filtered = clients.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    getClientCompany(c).toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async () => {
    try {
      const clientToCreate = normalizeClientForm(newClient);
      validateClientForm(clientToCreate);

      await addClient(clientToCreate);
      setShowAddModal(false);
      setNewClient({ ...emptyClientForm });
      showToast('Client added successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to add client', 'error');
    }
  };

  const openEditClient = (client) => {
    setEditingClient(client);
    setEditClient({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      companyName: getClientCompany(client),
      gstNumber: getClientGst(client),
      address: client.address || '',
    });
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    setSavingClient(true);
    try {
      const clientToUpdate = normalizeClientForm(editClient);
      validateClientForm(clientToUpdate);

      const updatedClient = await updateClient(editingClient.id, clientToUpdate);
      if (viewClient?.id === editingClient.id) setViewClient(updatedClient);
      setEditingClient(null);
      setEditClient({ ...emptyClientForm });
      showToast('Client updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to update client', 'error');
    } finally {
      setSavingClient(false);
    }
  };

  const requestDeleteClient = (client) => {
    setClientPendingDelete(client);
  };

  const handleDeleteClient = async () => {
    const client = clientPendingDelete;
    if (!client) return;

    setDeletingClientId(client.id);
    try {
      await deleteClient(client.id);
      if (viewClient?.id === client.id) setViewClient(null);
      if (editingClient?.id === client.id) setEditingClient(null);
      setClientPendingDelete(null);
      showToast('Client deleted successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to delete client', 'error');
    } finally {
      setDeletingClientId('');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filtered.map(client => (
            <Card key={client.id} hover className="h-full flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-lg shrink-0">
                    {getClientInitial(client)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
                    <p className="text-xs text-slate-400 truncate">{getClientCompany(client)}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500 mb-4 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{client.email || 'No email'}</span></div>
                  <div className="flex items-center gap-1.5 min-w-0"><Phone className="w-3 h-3 shrink-0" /><span className="truncate">{client.phone || 'No phone'}</span></div>
                  <div className="flex items-center gap-1.5 min-w-0"><FileText className="w-3 h-3 shrink-0" /><span className="truncate">{getClientGst(client)}</span></div>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" icon={Eye} onClick={() => setViewClient(client)} className="flex-1 sm:flex-none">
                    View
                  </Button>
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEditClient(client)} className="flex-1 sm:flex-none">
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    loading={deletingClientId === client.id}
                    onClick={() => requestDeleteClient(client)}
                    className="flex-1 sm:flex-none"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client" size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" required />
          <Input label="Company Name" value={newClient.companyName} onChange={e => setNewClient({ ...newClient, companyName: e.target.value })} placeholder="Company name" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@example.com" />
            <Input label="Phone" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <Input label="GST Number" value={newClient.gstNumber} onChange={e => setNewClient({ ...newClient, gstNumber: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" required />
          <Input label="Address" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} placeholder="Full address" required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!newClient.name || !newClient.companyName || !newClient.gstNumber || !newClient.address}>Add Client</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(viewClient)} onClose={() => setViewClient(null)} title="Client Details" size="lg">
        {viewClient && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-primary-50 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-primary-600 font-bold text-lg shadow-sm shrink-0">
                  {getClientInitial(viewClient)}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 truncate">{viewClient.name}</p>
                  <p className="text-sm text-slate-500 truncate">{getClientCompany(viewClient)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" icon={Pencil} onClick={() => openEditClient(viewClient)}>Edit</Button>
                <Button variant="danger" size="sm" icon={Trash2} loading={deletingClientId === viewClient.id} onClick={() => requestDeleteClient(viewClient)}>Delete</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ClientDetailRow icon={Mail} label="Email" value={viewClient.email} />
              <ClientDetailRow icon={Phone} label="Phone" value={viewClient.phone} />
              <ClientDetailRow icon={FileText} label="GST Number" value={getClientGst(viewClient)} />
              <ClientDetailRow icon={Building} label="Company" value={getClientCompany(viewClient)} />
              <div className="sm:col-span-2">
                <ClientDetailRow icon={MapPin} label="Address" value={viewClient.address} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Invoices</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{viewClient.totalInvoices || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Revenue</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(viewClient.totalRevenue || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Due</p>
                <p className={`mt-1 text-lg font-bold ${(viewClient.outstanding || 0) > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {formatCurrency(viewClient.outstanding || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(editingClient)} onClose={() => setEditingClient(null)} title="Update Client" size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={editClient.name} onChange={e => setEditClient({ ...editClient, name: e.target.value })} placeholder="Client name" required />
          <Input label="Company Name" value={editClient.companyName} onChange={e => setEditClient({ ...editClient, companyName: e.target.value })} placeholder="Company name" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" value={editClient.email} onChange={e => setEditClient({ ...editClient, email: e.target.value })} placeholder="email@example.com" />
            <Input label="Phone" value={editClient.phone} onChange={e => setEditClient({ ...editClient, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <Input label="GST Number" value={editClient.gstNumber} onChange={e => setEditClient({ ...editClient, gstNumber: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" required />
          <Input label="Address" value={editClient.address} onChange={e => setEditClient({ ...editClient, address: e.target.value })} placeholder="Full address" required />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingClient(null)}>Cancel</Button>
            <Button onClick={handleUpdateClient} loading={savingClient} disabled={!editClient.name || !editClient.companyName || !editClient.gstNumber || !editClient.address}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(clientPendingDelete)} onClose={() => setClientPendingDelete(null)} title="Delete Client" size="sm">
        {clientPendingDelete && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Delete {clientPendingDelete.name}?
              </p>
              <p className="mt-1 text-sm text-red-600">
                This removes the client card from your clients list. Existing invoices will keep their saved invoice details.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setClientPendingDelete(null)}>Cancel</Button>
              <Button variant="danger" icon={Trash2} loading={deletingClientId === clientPendingDelete.id} onClick={handleDeleteClient}>
                Delete Client
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
