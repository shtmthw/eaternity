import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast} data-tone={toast.tone} role="status">
            {toast.tone === 'error' ? (
              <CircleAlert size={18} className={styles.icon} aria-hidden="true" />
            ) : (
              <CircleCheck size={18} className={styles.icon} aria-hidden="true" />
            )}
            <p className={styles.message}>{toast.message}</p>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
