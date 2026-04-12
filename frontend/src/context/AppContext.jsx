import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <AppContext.Provider value={{
      sidebarOpen, toggleSidebar, closeSidebar,
      toast, showToast,
      brandLogoUrl, setBrandLogoUrl,
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-center text-white text-sm font-medium animate-slide-in-up sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md sm:px-5
          ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}>
          {toast.message}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
