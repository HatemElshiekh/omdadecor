import { normalize } from '@/lib/normalize';

describe('normalize (PLAN.md 14.1)', () => {
  it('maps Arabic-Indic digits to ASCII', () => {
    expect(normalize('٢٠ سم')).toBe('20 سم');
  });
  it('folds alef variants, taa marbuta and alef maqsura', () => {
    expect(normalize('أإآ رخامة مستوى')).toBe('ااا رخامه مستوي');
  });
  it('strips tashkeel and tatweel', () => {
    expect(normalize('رُخَــام')).toBe('رخام');
  });
  it('lowercases latin and cleans Edara + noise', () => {
    expect(normalize('WPC++  بديل   خشب')).toBe('wpc بديل خشب');
  });
  it('keeps codes intact', () => {
    expect(normalize('كود 20-80901')).toBe('كود 20-80901');
  });
});
