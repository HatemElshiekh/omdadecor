const nf = new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn', maximumFractionDigits: 2 });

/** Western digits, Arabic grouping (PLAN.md 16 Localization). */
export const formatNumber = (n: number) => nf.format(n);

/** Fills {placeholders} in an ar.ts string. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
