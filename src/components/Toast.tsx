import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastKind = 'success' | 'error';

export interface ToastProps {
  kind: ToastKind;
  message: string;
}

/** Bottom-center notice. Auto-dismiss (2s) is handled by ToastProvider. */
export function Toast({ kind, message }: ToastProps) {
  const Icon = kind === 'success' ? CheckCircle2 : XCircle;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'animate-toast-in fixed bottom-8 left-1/2 z-50 flex min-h-tap-min -translate-x-1/2 items-center gap-3 rounded-lg px-6 text-body font-medium shadow-card',
        kind === 'success' ? 'bg-success text-primary-ink' : 'bg-danger text-primary-ink',
      )}
    >
      <Icon size={24} strokeWidth={1.75} aria-hidden />
      {message}
    </div>
  );
}
