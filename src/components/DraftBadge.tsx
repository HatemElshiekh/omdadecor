import { AlertTriangle } from 'lucide-react';
import { ar } from '@/i18n/ar';

/** Amber pill shown when specs_status = 'draft_general_by_type'. */
export function DraftBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-4 py-1 text-small font-medium text-warning">
      <AlertTriangle size={20} strokeWidth={1.75} aria-hidden />
      {ar.product.draft}
    </span>
  );
}
