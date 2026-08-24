import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options, type: 'success' } : options;
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = {
      id,
      title: opts.title,
      message: opts.message,
      type: opts.type || 'success',
      duration: opts.duration || 3500
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl p-3.5 shadow-lg border flex items-start gap-3 transition-all transform animate-in slide-in-from-bottom-5 duration-200 ${
                isSuccess
                  ? 'bg-zinc-900 text-white border-zinc-700'
                  : isError
                  ? 'bg-red-950 text-white border-red-800'
                  : isWarning
                  ? 'bg-amber-950 text-white border-amber-800'
                  : 'bg-zinc-900 text-white border-zinc-700'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
                {isWarning && <AlertCircle className="w-4 h-4 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-xs font-bold leading-tight">{t.title}</div>}
                <div className="text-xs font-medium text-zinc-200 leading-snug">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-zinc-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (opts) => {
        const msg = typeof opts === 'string' ? opts : opts.message;
        console.log('[System Message]:', msg);
      }
    };
  }
  return context;
};
