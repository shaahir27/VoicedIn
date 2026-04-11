import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, Users, CreditCard } from 'lucide-react';

const items = [
  { label: 'Home', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', to: '/invoices', icon: FileText },
  { label: 'New', to: '/invoices/new', icon: Plus, special: true },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Payments', to: '/payments', icon: CreditCard },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              item.special
                ? 'flex flex-col items-center -mt-5'
                : `flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors
                  ${isActive ? 'text-primary-600' : 'text-slate-400'}`
            }
          >
            {item.special ? (
              <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-200">
                <item.icon className="w-5 h-5 text-white" />
              </div>
            ) : (
              <>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
