import { ar } from '@/i18n/ar';

function leaves(o: unknown): string[] {
  if (typeof o === 'string') return [o];
  return Object.values(o as Record<string, unknown>).flatMap(leaves);
}

describe('ar strings', () => {
  it('contain no em dashes', () => {
    for (const s of leaves(ar)) expect(s).not.toMatch(/—/);
  });

  it('match Appendix 22 for a sample of keys', () => {
    expect(ar.common.back).toBe('رجوع');
    expect(ar.product.draft).toBe('مواصفات عامة للنوع، تحت مراجعة المعرض');
    expect(ar.tabs).toEqual({
      size: 'المقاس والخامة',
      where: 'ينفع فين',
      pitch: 'قول للعميل',
      install: 'التركيب والمكملات',
    });
  });
});
