import { calculate, defaultSurface, unitArea, type CalcInput } from '@/lib/calc';

const panel = { calc_mode: 'panel' as const, unit_width_cm: 20, unit_length_cm: 290 };

describe('calc golden cases (PLAN.md 13.2)', () => {
  it('1. WPC wall 4 x 2.8, 1 door, panel 20x290, 10% -> 18 panels', () => {
    const r = calculate({ surface: 'wall', a: 4, b: 2.8, doors: 1, wastePct: 10, unit: panel });
    expect(r).toMatchObject({
      ok: true,
      net_area: 9.31,
      gross_area: 10.24,
      units: 18,
      required: 18,
    });
  });

  it('2. tile floor 5 x 4, 60x60, 4/box, 5%, 250/box -> 59 tiles = 15 boxes, 3,750', () => {
    const r = calculate({
      surface: 'floor',
      a: 5,
      b: 4,
      wastePct: 5,
      price: 250,
      unit: { calc_mode: 'tile', unit_width_cm: 60, unit_length_cm: 60, pieces_per_box: 4 },
    });
    expect(r).toMatchObject({
      ok: true,
      gross_area: 21,
      units: 59,
      boxes: 15,
      required: 15,
      total_price: 3750,
    });
  });

  it('3. stainless strip 18 m, piece 2.4 m, 5% -> 18.9 m, 8 pieces', () => {
    const r = calculate({
      surface: 'linear',
      a: 18,
      wastePct: 5,
      unit: { calc_mode: 'linear', piece_length_m: 2.4 },
    });
    expect(r).toMatchObject({
      ok: true,
      net_length: 18,
      gross_length: 18.9,
      units: 8,
      net_area: null,
    });
  });

  it('4. missing input (L = 0) -> MISSING_INPUT', () => {
    expect(calculate({ surface: 'wall', a: 0, b: 2.8, wastePct: 10, unit: panel })).toEqual({
      ok: false,
      error: 'MISSING_INPUT',
    });
  });

  it('5. low stock: required 18, stock 10 -> stock_ok false, shortfall 8', () => {
    const r = calculate({
      surface: 'wall',
      a: 4,
      b: 2.8,
      doors: 1,
      wastePct: 10,
      unit: panel,
      stock: 10,
    });
    expect(r).toMatchObject({ ok: true, required: 18, stock_ok: false, shortfall: 8 });
  });
});

describe('calc edge cases', () => {
  const base: CalcInput = { surface: 'wall', a: 4, b: 3, wastePct: 10, unit: panel };

  it('missing second dimension', () => {
    expect(calculate({ ...base, b: undefined })).toEqual({ ok: false, error: 'MISSING_INPUT' });
    expect(calculate({ ...base, a: NaN })).toEqual({ ok: false, error: 'MISSING_INPUT' });
    expect(calculate({ ...base, b: -1 })).toEqual({ ok: false, error: 'MISSING_INPUT' });
  });

  it('openings exceeding the wall', () => {
    expect(calculate({ ...base, a: 1, b: 2, doors: 1, windows: 1 })).toEqual({
      ok: false,
      error: 'OPENINGS_EXCEED_AREA',
    });
  });

  it('windows deduct 1.44 m² each; negative counters are ignored', () => {
    const r = calculate({ ...base, windows: 2, doors: -3, wastePct: 0 });
    expect(r).toMatchObject({ net_area: 9.12 });
  });

  it('custom door / window sizes replace the standard ones', () => {
    // 4 x 3 = 12; door 1.0 x 2.2 = 2.2; window 2.0 x 1.5 = 3.0 -> 6.8
    const r = calculate({ ...base, wastePct: 0, doors: 1, windows: 1, doorM2: 2.2, windowM2: 3 });
    expect(r).toMatchObject({ net_area: 6.8 });
  });

  it('a counted opening with an empty custom size is missing input', () => {
    expect(calculate({ ...base, doors: 1, doorM2: NaN })).toEqual({
      ok: false,
      error: 'MISSING_INPUT',
    });
    expect(calculate({ ...base, windows: 2, windowM2: 0 })).toEqual({
      ok: false,
      error: 'MISSING_INPUT',
    });
    // ...but an uncounted one does not matter
    expect(calculate({ ...base, doors: 0, doorM2: NaN })).toMatchObject({ ok: true });
  });

  it('section: exact W x H, openings never deducted, waste still applies', () => {
    // 2 x 2.4 = 4.8 m², x1.1 = 5.28 / 0.58 = 9.1 -> 10 panels
    const r = calculate({ ...base, surface: 'section', a: 2, b: 2.4, doors: 2, windows: 1 });
    expect(r).toMatchObject({
      ok: true,
      surface: 'section',
      net_area: 4.8,
      gross_area: 5.28,
      units: 10,
    });
    expect(calculate({ ...base, surface: 'section', a: 2, b: 0 })).toEqual({
      ok: false,
      error: 'MISSING_INPUT',
    });
  });

  it('openings are ignored on floors', () => {
    const r = calculate({ ...base, surface: 'floor', doors: 3, windows: 3, wastePct: 0 });
    expect(r).toMatchObject({ net_area: 12 });
  });

  it('unknown unit size -> MISSING_UNIT', () => {
    expect(calculate({ ...base, unit: { calc_mode: 'panel' } })).toEqual({
      ok: false,
      error: 'MISSING_UNIT',
    });
    expect(
      calculate({ surface: 'linear', a: 5, wastePct: 0, unit: { calc_mode: 'linear' } }),
    ).toEqual({
      ok: false,
      error: 'MISSING_UNIT',
    });
  });

  it('box mode sells whole boxes by box area', () => {
    const r = calculate({
      surface: 'floor',
      a: 5,
      b: 4,
      wastePct: 10,
      unit: { calc_mode: 'box', box_area_m2: 2.2 },
    });
    expect(r).toMatchObject({ units: 10, boxes: null, required: 10 }); // 22 / 2.2 = 10 exactly (epsilon)
  });

  it('floating point: exact multiples are not rounded up', () => {
    const r = calculate({
      surface: 'floor',
      a: 0.6 * 3,
      b: 0.6 * 6,
      wastePct: 0,
      unit: { calc_mode: 'tile', unit_width_cm: 60, unit_length_cm: 60 },
    });
    expect(r).toMatchObject({ units: 18 });
  });

  it('negative or missing waste counts as 0; null price and stock', () => {
    const r = calculate({ ...base, wastePct: -5, price: null, stock: null });
    expect(r).toMatchObject({ gross_area: 12, total_price: null, stock_ok: null, shortfall: 0 });
    expect(calculate({ ...base, wastePct: NaN })).toMatchObject({ gross_area: 12 });
  });

  it('enough stock', () => {
    expect(calculate({ ...base, stock: 100 })).toMatchObject({ stock_ok: true, shortfall: 0 });
  });

  it('unitArea and defaultSurface', () => {
    expect(unitArea({ calc_mode: 'sheet', unit_width_cm: 122, unit_length_cm: 280 })).toBeCloseTo(
      3.416,
    );
    expect(unitArea({ calc_mode: 'box' })).toBeNull();
    expect(unitArea({ calc_mode: 'linear', piece_length_m: 2.4 })).toBeNull();
    expect(defaultSurface('linear')).toBe('linear');
    expect(defaultSurface('box')).toBe('floor');
    expect(defaultSurface('tile')).toBe('floor');
    expect(defaultSurface('panel')).toBe('wall');
    expect(defaultSurface('sheet')).toBe('wall');
  });
});
