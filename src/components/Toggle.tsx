import { cn } from '@/lib/cn';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

/** Large segmented choice (64px), one selected. Used for surface and customer type. */
export function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
  columns,
}: {
  /** Defaults to one row with every option. */
  columns?: number;
  options: ToggleOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-tap rounded border-2 px-3 text-body font-semibold transition-colors',
            o.value === value
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-line bg-surface text-ink hover:bg-surface-soft',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
