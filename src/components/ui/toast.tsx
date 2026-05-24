import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => {
          const styles = {
            success: 'border-emerald-500/30 bg-slate-900/90 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
            error: 'border-red-500/30 bg-slate-900/90 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
            info: 'border-purple-500/30 bg-slate-900/90 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]',
          };

          const icons = {
            success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
            info: <Info className="w-5 h-5 text-purple-400 flex-shrink-0" />,
          };

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${styles[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 text-sm font-medium text-slate-200">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
