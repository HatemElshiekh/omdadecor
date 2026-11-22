import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface BigButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

/** 64px high, full width. Primary: solid blue. Secondary: white, grey border, blue text. */
export function BigButton({
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: BigButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex h-tap w-full items-center justify-center gap-3 rounded px-6 text-body font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary'
          ? 'bg-primary text-primary-ink hover:brightness-95'
          : 'border border-line bg-surface text-primary hover:bg-surface-soft',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={24} strokeWidth={1.75} className="animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
