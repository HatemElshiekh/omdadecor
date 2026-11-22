import { lengthFromName, unitDefaults } from '@/lib/unitDefaults';

describe('unit defaults (PLAN.md 20, Q3)', () => {
  it('WPC: width from name x 290', () => {
    expect(unitDefaults('wallpanel', 'بديل خشب 20 سم', { العرض: '20 سم' })).toMatchObject({
      unit_width_cm: 20,
      unit_length_cm: 290,
    });
    expect(unitDefaults('wallpanel', 'بديل خشب 12.5 سم', { العرض: '12.5 سم' }).unit_width_cm).toBe(
      12.5,
    );
  });
  it('WPC without a width stays unknown', () => {
    expect(unitDefaults('wallpanel', 'بديل خشب بومبيه', {}).unit_width_cm).toBeNull();
  });
  it('marble 122x280, board/chipboard 122x244, floor box 2.2', () => {
    expect(unitDefaults('marble', 'x', {})).toMatchObject({
      unit_width_cm: 122,
      unit_length_cm: 280,
    });
    expect(unitDefaults('board', 'x', {})).toMatchObject({
      unit_width_cm: 122,
      unit_length_cm: 244,
    });
    expect(unitDefaults('chipboard', 'x', {})).toMatchObject({ unit_length_cm: 244 });
    expect(unitDefaults('floor', 'x', {}).box_area_m2).toBe(2.2);
  });
  it('strips/cornice: length from name, else 2.4', () => {
    expect(
      unitDefaults('steelstrip', 'بانوة فيوتك 2 سم نص 2.40 متر', { الطول: '2.40 متر' })
        .piece_length_m,
    ).toBe(2.4);
    expect(unitDefaults('steelstrip', 'زاويه فيوتك KB23 طول 2.44 م', {}).piece_length_m).toBe(2.44);
    expect(unitDefaults('cornice', 'كورنيشه K1 طول 2.40 م', {}).piece_length_m).toBe(2.4);
    expect(unitDefaults('steelstrip', 'زاويه كرسي', {}).piece_length_m).toBe(2.4);
    expect(lengthFromName('شادو جاب 3 سم 3 متر', { الطول: '3 متر' })).toBe(3);
    expect(lengthFromName('عود 12 متر', {})).toBeNull();
  });
  it('types without defaults stay null', () => {
    for (const t of ['stone', 'insulation', 'light', null])
      expect(Object.values(unitDefaults(t, 'x', {})).every((v) => v === null)).toBe(true);
  });
});
