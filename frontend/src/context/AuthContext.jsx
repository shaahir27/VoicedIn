import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const resolveIsDemo = (account) => {
    const status = account?.plan || account?.subscriptionStatus || account?.subscription_status || '';
    return status === 'demo' || status.includes('demo');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/users/me')
        .then(data => {
          setUser(data.user);
          setIsDemo(resolveIsDemo(data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    const data = await api.get('/users/me');
    setUser(data.user);
    setIsDemo(resolveIsDemo(data.user));
    return data.user;
  };

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsDemo(resolveIsDemo(data.user));
  };

  const loginDemo = async () => {
    try {
      const data = await api.post('/auth/login', { email: 'alex@freelance.io', password: 'demo123' });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsDemo(true);
    } catch (err) {
      console.error('Demo login failed', err);
      throw err;
    }
  };

  const signup = async (name, email, password) => {
    const data = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsDemo(resolveIsDemo(data.user));
  };

  const loginWithGoogle = async (idToken) => {
    const data = await api.post('/auth/google', { idToken });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsDemo(resolveIsDemo(data.user));
  };

  const forgotPassword = async (email) => {
    await api.post('/auth/forgot-password', { email });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsDemo(false);
  };

  return (
    <AuthContext.Provider value={{ user, isDemo, isLoading, login, loginDemo, loginWithGoogle, forgotPassword, signup, logout, refreshUser, isAuthenticated: !!user }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
