import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Toast, type ToastKind } from './Toast';
import { ToastContext } from './toast-context';

export const TOAST_MS = 2000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ kind: ToastKind; message: string; key: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    clearTimeout(timer.current);
    setToast({ kind, message, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <Toast key={toast.key} kind={toast.kind} message={toast.message} />}
    </ToastContext.Provider>
  );
}
