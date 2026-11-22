import { Delete, X } from 'lucide-react';
import { ar } from '@/i18n/ar';
import { cn } from '@/lib/cn';

export type NumPadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'back'
  | 'clear';

export interface NumPadProps {
  /** 'pin': bottom-left key clears. 'decimal': bottom-left key types a decimal point. */
  mode?: 'pin' | 'decimal';
  onKey: (key: NumPadKey) => void;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** 3x4 grid of 72x72 keys. Laid out LTR like a phone keypad (1 2 3 on top). */
export function NumPad({ mode = 'pin', onKey, disabled = false }: NumPadProps) {
  const key =
    'flex h-key w-key items-center justify-center rounded bg-surface text-title font-medium text-ink shadow-card active:bg-primary-soft disabled:opacity-50';
  return (
    <div dir="ltr" className="grid w-max grid-cols-3 gap-3" role="group">
      {DIGITS.map((d) => (
        <button key={d} type="button" className={key} disabled={disabled} onClick={() => onKey(d)}>
          {d}
        </button>
      ))}
      {mode === 'pin' ? (
        <button
          type="button"
          className={cn(key, 'text-muted')}
          disabled={disabled}
          aria-label={ar.a11y.clear}
          onClick={() => onKey('clear')}
        >
          <X size={28} strokeWidth={1.75} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className={key}
          disabled={disabled}
          aria-label={ar.a11y.decimal}
          onClick={() => onKey('.')}
        >
          .
        </button>
      )}
      <button type="button" className={key} disabled={disabled} onClick={() => onKey('0')}>
        0
      </button>
      <button
        type="button"
        className={cn(key, 'text-muted')}
        disabled={disabled}
        aria-label={ar.a11y.backspace}
        onClick={() => onKey('back')}
      >
        <Delete size={28} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
