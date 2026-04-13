import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import Logo from '../components/brand/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      showToast(err.message || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = useCallback(async (idToken) => {
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      showToast(err.message || 'Google signup failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate, redirectTo, showToast]);

  const handleGoogleError = useCallback((message) => {
    showToast(message || 'Google signup failed', 'warning');
  }, [showToast]);

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 to-primary-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuMTA1IDAgMi0uODk1IDItMnMtLjg5NS0yLTItMi0yIC44OTUtMiAyIC44OTUgMiAyIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <span className="text-4xl font-extrabold tracking-tight mb-6">
            <span className="text-white">voiced</span>
            <span className="text-primary-200">In</span>
          </span>
          <h2 className="text-2xl font-bold text-white mb-4">Start free, upgrade later</h2>
          <p className="text-primary-100 text-lg leading-relaxed max-w-md">
            Join thousands of freelancers who create invoices in seconds. Premium starts at just ₹49/month.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm mb-8">Start creating professional invoices in minutes</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Full name" type="text" placeholder="Alex Kumar" icon={User} value={name} onChange={e => setName(e.target.value)} required />
            <Input label="Email" type="email" placeholder="you@example.com" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Min 8 characters" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 mt-0.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500" required />
              <span className="text-sm text-slate-500">
                I agree to the <a href="#" className="text-primary-500 font-medium">Terms of Service</a> and <a href="#" className="text-primary-500 font-medium">Privacy Policy</a>
              </span>
            </label>

            <Button type="submit" fullWidth size="lg" loading={loading} iconRight={ArrowRight}>
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or continue with</span></div>
          </div>

          <GoogleSignInButton text="signup_with" onCredential={handleGoogleSignup} onError={handleGoogleError} />

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 font-semibold hover:text-primary-600">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
