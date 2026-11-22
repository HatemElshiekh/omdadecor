import { Field } from './Field';
import { cn } from '@/lib/cn';

export interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Touch devices: the field is driven by the on-screen NumPad, tapping selects it. */
  touch: boolean;
  active?: boolean;
  onActivate?: () => void;
  error?: string;
  decimal?: boolean;
  maxLength?: number;
  name?: string;
}

/** Numeric Field: keyboard on desktop, on-screen NumPad on touch (PLAN.md 9.4 FR-4-2). */
export function NumberField({
  label,
  value,
  onChange,
  touch,
  active,
  onActivate,
  error,
  decimal = true,
  maxLength = 8,
  name,
}: NumberFieldProps) {
  const clean = (raw: string) => {
    const western = raw
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace('٫', '.');
    let v = western.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
    const dot = v.indexOf('.');
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    return v.slice(0, maxLength);
  };
  return (
    <Field
      label={label}
      name={name}
      value={value}
      inputMode={touch ? 'none' : decimal ? 'decimal' : 'numeric'}
      readOnly={touch}
      onFocus={touch ? onActivate : undefined}
      onClick={touch ? onActivate : undefined}
      onChange={(e) => onChange(clean(e.target.value))}
      error={error}
      autoComplete="off"
      className={cn(
        touch && 'cursor-pointer',
        active && '[&_input]:border-b-2 [&_input]:border-primary',
      )}
      data-active={active || undefined}
    />
  );
}
