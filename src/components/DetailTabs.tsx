import { useId, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DetailTab {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
}

export interface DetailTabsProps {
  tabs: DetailTab[];
  /** Defaults to the first tab. Pass null to start collapsed. */
  defaultOpenId?: string | null;
}

/** 2x2 grid of 160px tiles, single-open accordion. Active tile uses --primary-soft. */
export function DetailTabs({ tabs, defaultOpenId }: DetailTabsProps) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(
    defaultOpenId === undefined ? (tabs[0]?.id ?? null) : defaultOpenId,
  );
  const open = tabs.find((t) => t.id === openId);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = id === openId;
          return (
            <button
              key={id}
              type="button"
              id={`${baseId}-tile-${id}`}
              aria-expanded={active}
              aria-controls={`${baseId}-panel`}
              onClick={() => setOpenId(active ? null : id)}
              className={cn(
                'flex h-tile flex-col items-center justify-center gap-3 rounded-lg border-2 text-body font-semibold shadow-card transition-colors',
                active
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-transparent bg-surface text-ink hover:bg-surface-soft',
              )}
            >
              <Icon size={28} strokeWidth={1.75} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {open && (
        <section
          id={`${baseId}-panel`}
          role="region"
          aria-labelledby={`${baseId}-tile-${open.id}`}
          className="rounded-lg bg-surface p-6 text-body shadow-card"
        >
          {open.content}
        </section>
      )}
    </div>
  );
}
