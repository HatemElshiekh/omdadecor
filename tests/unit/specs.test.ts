import { resolveSpecs, type SpecTemplate } from '@/lib/specs';

const tpl: SpecTemplate = {
  type: 'wallpanel',
  label_ar: 'بديل خشب للحوائط',
  calc_mode: 'panel',
  size_material_colors: ['t-size'],
  use_yes: ['t-yes'],
  use_no: ['t-no'],
  say_to_customer: ['t-say'],
  install_and_complements: ['t-install'],
};
const none = {
  size_material_colors: null,
  use_yes: null,
  use_no: null,
  say_to_customer: null,
  install_and_complements: null,
};

describe('resolveSpecs (FR-3-6)', () => {
  it('falls back to the template', () => {
    expect(resolveSpecs(none, tpl).use_yes).toEqual(['t-yes']);
  });
  it('product overrides win, per field', () => {
    const r = resolveSpecs({ ...none, use_yes: ['own'] }, tpl);
    expect(r.use_yes).toEqual(['own']);
    expect(r.use_no).toEqual(['t-no']);
  });
  it('an empty override does not hide the template', () => {
    expect(resolveSpecs({ ...none, use_no: [] }, tpl).use_no).toEqual(['t-no']);
  });
  it('no template and no override -> empty lists', () => {
    expect(resolveSpecs(none, null).say_to_customer).toEqual([]);
  });
});
