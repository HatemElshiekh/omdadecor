import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  error?: string;
}

/** Edara pattern: small muted label above, large value below, 1px underline. */
export function Field({ label, inputMode = 'text', error, className, id, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const numeric = inputMode === 'numeric' || inputMode === 'decimal' || inputMode === 'tel';
  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={inputId} className="text-small text-muted">
        {label}
      </label>
      <input
        id={inputId}
        inputMode={inputMode}
        dir={numeric ? 'ltr' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-tap-min w-full border-0 border-b bg-transparent px-0 text-input text-ink outline-none',
          'placeholder:text-muted focus:border-b-2 focus-visible:outline-none',
          numeric && 'text-end',
          error ? 'border-danger focus:border-danger' : 'border-line focus:border-primary',
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
