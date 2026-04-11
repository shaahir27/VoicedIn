import { useEffect, useState } from 'react';
import { Check, KeyRound, RefreshCw, Shield, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { api } from '../utils/api';
import { formatDate } from '../utils/dateHelpers';

export default function GodmodePage() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('godmodeKey') || '');
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    if (!adminKey) {
      setMessage('Enter the godmode key to load payment requests.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      sessionStorage.setItem('godmodeKey', adminKey);
      const data = await api.request(`/godmode/payment-requests?status=${status}`, {
        method: 'GET',
        headers: { 'X-Godmode-Key': adminKey },
      });
      setRequests(data.requests || []);
    } catch (err) {
      setMessage(err.message || 'Failed to load godmode requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) loadRequests();
  }, [status]);

  const updateRequest = async (request, action) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.request(`/godmode/payment-requests/${request.id}/${action}`, {
        method: 'POST',
        headers: { 'X-Godmode-Key': adminKey },
        body: JSON.stringify({ approvedBy: 'godmode-admin' }),
      });
      setRequests(prev => prev.map(item => item.id === request.id ? data.request : item));
      setMessage(action === 'approve' ? `${request.userEmail} is now Premium.` : `${request.userEmail} request rejected.`);
      await loadRequests();
    } catch (err) {
      setMessage(err.message || `Failed to ${action} request`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-300/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Godmode</h1>
            <p className="text-sm text-slate-400">Approve static QR premium payment requests.</p>
          </div>
        </div>

        <Card className="mb-6 !bg-white/95">
          <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <Input
              label="Godmode Key"
              type="password"
              icon={KeyRound}
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Enter GODMODE_ADMIN_KEY"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>
            <Button icon={RefreshCw} loading={loading} onClick={loadRequests}>Load</Button>
          </div>
          {message && <p className="text-sm text-slate-600 mt-4">{message}</p>}
        </Card>

        <Card padding={false} className="!bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">User</th>
                  <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Amount</th>
                  <th className="text-left text-xs font-medium text-slate-400 py-3 px-4">Requested</th>
                  <th className="text-center text-xs font-medium text-slate-400 py-3 px-4">Status</th>
                  <th className="text-right text-xs font-medium text-slate-400 py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-sm text-slate-400">No payment requests found.</td>
                  </tr>
                ) : requests.map(request => (
                  <tr key={request.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4">
                      <p className="text-sm font-semibold text-slate-800">{request.userName || 'User'}</p>
                      <p className="text-xs text-slate-400">{request.userEmail}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">Rs. {request.amount}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{formatDate(request.requestedAt)}</td>
                    <td className="py-3 px-4 text-center"><Badge status={request.status}>{request.status}</Badge></td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          icon={Check}
                          disabled={request.status !== 'pending' || loading}
                          onClick={() => updateRequest(request, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={X}
                          disabled={request.status !== 'pending' || loading}
                          onClick={() => updateRequest(request, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
