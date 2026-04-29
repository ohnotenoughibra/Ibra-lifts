'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback — component outside provider (shouldn't happen, but safe)
    return { showToast: (() => {}) as ToastContextValue['showToast'] };
  }
  return ctx;
}

const ICON_MAP: Record<ToastType, React.ElementType> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const STYLE_MAP: Record<ToastType, string> = {
  success: 'bg-green-500/20 text-green-300 border-green-500/30',
  error: 'bg-red-500/20 text-red-300 border-red-500/30',
  warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = 'success', action?: ToastAction) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev.slice(-2), { id, message, type, action }]); // Keep max 3

    const duration = action ? 5000 : 3000; // Longer timeout for undo toasts
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, duration);
    timersRef.current.set(id, timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast rendering */}
      <div
        className="fixed bottom-above-nav left-1/2 -translate-x-1/2 z-toast flex flex-col gap-2 items-center pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        <AnimatePresence>
          {toasts.map(toast => {
            const Icon = ICON_MAP[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="pointer-events-auto"
              >
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium border backdrop-blur-sm',
                    STYLE_MAP[toast.type]
                  )}
                  onClick={() => {
                    if (!toast.action) {
                      setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {toast.message}
                  {toast.action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.action!.onClick();
                        setToasts(prev => prev.filter(t => t.id !== toast.id));
                        // Clear the auto-dismiss timer
                        const timer = timersRef.current.get(toast.id);
                        if (timer) {
                          clearTimeout(timer);
                          timersRef.current.delete(toast.id);
                        }
                      }}
                      data-tight
                      className="ml-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold uppercase tracking-wide transition-colors"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
