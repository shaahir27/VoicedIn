import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Keyboard, LogOut, Menu, Search, Settings, X, LayoutDashboard, FileText, Users, CreditCard, Palette, Download, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Logo from '../brand/Logo';
import ShortcutHint from '../ui/ShortcutHint';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

function isEditableElement(element) {
  if (!element) return false;
  const tagName = element.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable;
}

function findVisibleElement(selector) {
  const elements = Array.from(document.querySelectorAll(selector));
  return elements.find(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && !element.disabled && element.offsetParent !== null;
  });
}

export default function AppLayout() {
  const { toggleSidebar, closeSidebar, brandLogoUrl, setBrandLogoUrl } = useApp();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const commandItems = [
    { label: 'Dashboard', hint: 'Go home', to: '/dashboard', icon: LayoutDashboard },
    { label: 'New Invoice', hint: 'Ctrl + N', to: '/invoices/new', icon: FileText },
    { label: 'Invoices', hint: 'Open invoices', to: '/invoices', icon: FileText },
    { label: 'Clients', hint: 'Open clients', to: '/clients', icon: Users },
    { label: 'Payments', hint: 'Open payments', to: '/payments', icon: CreditCard },
    { label: 'Templates', hint: 'Open templates', to: '/templates', icon: Palette },
    { label: 'Export', hint: 'Open export', to: '/export', icon: Download },
    { label: 'Subscription', hint: 'Open plan', to: '/subscription', icon: Crown },
    { label: 'Settings', hint: 'Open profile', to: '/settings', icon: Settings },
  ];

  const filteredCommands = commandItems.filter(command =>
    command.label.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );

  const runCommand = (command) => {
    if (!command) return;
    setCommandPaletteOpen(false);
    setCommandQuery('');
    navigate(command.to);
  };

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

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let isMounted = true;
    api.get('/business-profile')
      .then(data => {
        if (isMounted) setBrandLogoUrl(data.profile?.logoUrl || null);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, setBrandLogoUrl]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isShortcutKey = event.ctrlKey || event.metaKey;

      if (event.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          setCommandQuery('');
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        setProfileOpen(false);
        closeSidebar();
      }

      if (isShortcutKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(open => !open);
        return;
      }

      if (!isShortcutKey && !event.altKey && event.key === '?' && !isEditableElement(activeElement)) {
        event.preventDefault();
        setShortcutsOpen(open => !open);
        return;
      }

      if ((isShortcutKey && event.key.toLowerCase() === 'n') || (!isShortcutKey && !event.altKey && event.key.toLowerCase() === 'n')) {
        if (isEditableElement(activeElement)) return;
        event.preventDefault();
        navigate('/invoices/new');
        return;
      }

      if (isShortcutKey && event.key.toLowerCase() === 's') {
        const saveButton = findVisibleElement('[data-shortcut-save="invoice"]');
        if (saveButton) {
          event.preventDefault();
          saveButton.click();
        }
        return;
      }

    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [closeSidebar, commandPaletteOpen, navigate, shortcutsOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar logoUrl={brandLogoUrl} />

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen pb-20 lg:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 cursor-pointer">
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div className="lg:hidden"><Logo size="sm" imageSrc={brandLogoUrl} /></div>
              <h1 className="hidden lg:block text-lg font-semibold text-slate-800">{getPageTitle()}</h1>
            </div>
            <div className="relative flex items-center gap-3">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 cursor-pointer"
                onClick={() => setProfileOpen(open => !open)}
                title="Profile menu"
              >
                {user?.name?.[0] || 'U'}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-11 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4" />
                    Profile settings
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {commandPaletteOpen && (
          <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/30 px-4 pt-24 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)}>
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={event => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="command-palette-title"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={commandQuery}
                  onChange={event => setCommandQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') runCommand(filteredCommands[0]);
                  }}
                  placeholder="Search pages..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400">Esc</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-400">No matching shortcut</p>
                ) : filteredCommands.map(command => (
                  <button
                    key={command.to}
                    type="button"
                    onClick={() => runCommand(command)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-3 font-medium text-slate-700">
                      <command.icon className="h-4 w-4 text-slate-400" />
                      {command.label}
                    </span>
                    <span className="text-xs text-slate-400">{command.hint}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
                <span><kbd className="rounded border border-slate-200 px-1.5 py-0.5">Ctrl K</kbd> commands</span>
                <span><kbd className="rounded border border-slate-200 px-1.5 py-0.5">Ctrl N</kbd> new invoice</span>
                <span><kbd className="rounded border border-slate-200 px-1.5 py-0.5">?</kbd> shortcuts</span>
                <span><kbd className="rounded border border-slate-200 px-1.5 py-0.5">Ctrl S</kbd> save</span>
              </div>
            </div>
          </div>
        )}

        {shortcutsOpen && (
          <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/30 px-4 pt-24 backdrop-blur-sm" onClick={() => setShortcutsOpen(false)}>
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={event => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="keyboard-shortcuts-title"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Keyboard className="h-4 w-4 text-primary-500" />
                  <h2 id="keyboard-shortcuts-title" className="text-sm font-semibold text-slate-800">Keyboard Shortcuts</h2>
                </div>
                <button type="button" onClick={() => setShortcutsOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="font-medium text-slate-700">New Invoice</span>
                  <ShortcutHint keys={['Ctrl', 'N']} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="font-medium text-slate-700">Save Invoice</span>
                  <ShortcutHint keys={['Ctrl', 'S']} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="font-medium text-slate-700">Open Shortcuts</span>
                  <ShortcutHint keys={['?']} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
