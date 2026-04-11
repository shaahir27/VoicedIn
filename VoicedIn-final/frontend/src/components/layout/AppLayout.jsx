import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Logo from '../brand/Logo';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { toggleSidebar } = useApp();
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/invoices/new') return 'Create Invoice';
    if (path === '/invoices') return 'Invoices';
    if (path.startsWith('/clients/')) return 'Client Details';
    if (path === '/clients') return 'Clients';
    if (path === '/payments') return 'Payments';
    if (path === '/templates') return 'Templates';
    if (path === '/export') return 'Export & Share';
    if (path === '/subscription') return 'Subscription';
    if (path === '/settings') return 'Settings';
    return 'voicedIn';
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen pb-20 lg:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div className="lg:hidden"><Logo size="sm" /></div>
              <h1 className="hidden lg:block text-lg font-semibold text-slate-800">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 cursor-pointer" onClick={logout} title="Sign out">
                {user?.name?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
