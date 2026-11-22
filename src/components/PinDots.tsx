import { ar } from '@/i18n/ar';
import { cn } from '@/lib/cn';

export interface PinDotsProps {
  length: number;
  filled: number;
  /** Change this value to replay the shake animation (wrong PIN). */
  shakeKey?: number;
}

export function PinDots({ length, filled, shakeKey = 0 }: PinDotsProps) {
  return (
    <div
      key={shakeKey}
      dir="ltr"
      role="img"
      aria-label={`${ar.a11y.pin_dots}: ${filled}`}
      data-filled={filled}
      className={cn('flex gap-4', shakeKey > 0 && 'animate-shake')}
    >
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={cn(
            'size-5 rounded-full',
            i < filled ? 'bg-primary' : 'border-2 border-line bg-surface',
          )}
        />
      ))}
    </div>
  );
}
