// Extra search terms appended to search_text per spec_type (PLAN.md 14.2).
// Only terms listed in the plan; extend as search_logs show zero-result queries.
export const TYPE_TERMS: Record<string, string[]> = {
  wallpanel: ['wpc', 'بديل خشب'],
  marble: ['spc', 'pvc', 'بديل رخام', 'مرمر'],
  steelstrip: ['استانلس', 'ستانلس', 'استلس'],
};

export function typeTerms(specType: string | null | undefined): string {
  return specType ? (TYPE_TERMS[specType] ?? []).join(' ') : '';
}
