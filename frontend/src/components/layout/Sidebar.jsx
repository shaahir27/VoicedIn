import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, CreditCard, Palette, Download, Settings, Crown, X, ChevronLeft
} from 'lucide-react';
import Logo from '../brand/Logo';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../ui/Badge';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', to: '/invoices', icon: FileText },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Payments', to: '/payments', icon: CreditCard },
  { label: 'Templates', to: '/templates', icon: Palette },
  { label: 'Export', to: '/export', icon: Download },
];

const bottomItems = [
  { label: 'Subscription', to: '/subscription', icon: Crown },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { sidebarOpen, closeSidebar } = useApp();
  const { user, isDemo } = useAuth();

  return (
    <>
      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-100 z-50
        flex flex-col transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-50">
          <Logo size="md" />
          <button onClick={closeSidebar} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-slate-50 space-y-1">
          {bottomItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}

          {/* User info */}
          <div className="mt-3 p-3 rounded-xl bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1.5">
                  <Badge status={isDemo ? 'demo' : 'premium'}>{isDemo ? 'Demo' : 'Premium'}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
