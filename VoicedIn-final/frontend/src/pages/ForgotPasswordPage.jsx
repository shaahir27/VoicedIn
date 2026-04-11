import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Logo from '../components/brand/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      showToast(err.message || 'Failed to send reset link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        {sent ? (
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-500 text-sm mb-8">
              We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.
            </p>
            <Link to="/login">
              <Button variant="outline" icon={ArrowLeft}>Back to login</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">Reset your password</h1>
            <p className="text-slate-500 text-sm mb-8 text-center">Enter your email and we'll send you a reset link</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                icon={Mail}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Send Reset Link
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-8">
              <Link to="/login" className="text-primary-500 font-semibold hover:text-primary-600 inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
