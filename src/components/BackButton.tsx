import { ArrowRight } from 'lucide-react';
import { ar } from '@/i18n/ar';

export interface BackButtonProps {
  onClick: () => void;
}

/** Min 56x56, arrow + "رجوع". Placed top-right (start side in RTL) on every non-root screen. */
export function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-tap-min min-w-tap-min items-center gap-2 rounded bg-surface pe-5 ps-4 text-body font-medium text-ink shadow-card hover:bg-surface-soft"
    >
      {/* In RTL "back" points to the right (towards the start). */}
      <ArrowRight size={24} strokeWidth={1.75} aria-hidden />
      {ar.common.back}
    </button>
  );
}
