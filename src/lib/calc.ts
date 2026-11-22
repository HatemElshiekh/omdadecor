// Quantity calculator (PLAN.md 13). Pure and deterministic: no AI math, ever.
// Shared by the calc screen and (Phase 6) the assistant's calculate_quantity tool.
// Port of data/calc.reference.js, with the plan's validation rules (13.1).

/**
 * wall: L x H minus doors/windows. section: an exact part of a wall (e.g. behind the TV),
 * W x H as measured, no openings. floor: L x W. linear: running metres.
 */
export type Surface = 'wall' | 'section' | 'floor' | 'linear';
export type CalcMode = 'panel' | 'sheet' | 'box' | 'tile' | 'linear';

/** Standard openings (PLAN.md 13.1); the rep can override per wall. */
export const DOOR_CM = { w: 90, h: 210 } as const; // 1.89 m²
export const WINDOW_CM = { w: 120, h: 120 } as const; // 1.44 m²
export const DOOR_M2 = (DOOR_CM.w / 100) * (DOOR_CM.h / 100);
export const WINDOW_M2 = (WINDOW_CM.w / 100) * (WINDOW_CM.h / 100);
const EPS = 1e-9;

export interface CalcUnit {
  calc_mode: CalcMode;
  unit_width_cm?: number | null;
  unit_length_cm?: number | null;
  box_area_m2?: number | null;
  pieces_per_box?: number | null;
  piece_length_m?: number | null;
}

export interface CalcInput {
  surface: Surface;
  /** Length in metres (or total linear metres for 'linear'). */
  a: number;
  /** Height (wall) or width (floor) in metres. */
  b?: number;
  doors?: number;
  windows?: number;
  /** Area of one door / window in m². Defaults to the standard sizes. */
  doorM2?: number;
  windowM2?: number;
  wastePct: number;
  unit: CalcUnit;
  price?: number | null;
  stock?: number | null;
}

export type CalcError = 'MISSING_INPUT' | 'OPENINGS_EXCEED_AREA' | 'MISSING_UNIT';

export interface CalcOk {
  ok: true;
  surface: Surface;
  net_area: number | null; // m², null for linear
  gross_area: number | null;
  net_length: number | null; // m, linear only
  gross_length: number | null;
  units: number; // panels / sheets / tiles / boxes (box mode) / pieces (linear)
  boxes: number | null; // when units are sold in boxes of pieces_per_box
  required: number; // what the customer buys: boxes ?? units
  total_price: number | null;
  stock_ok: boolean | null;
  shortfall: number;
}

export type CalcResult = CalcOk | { ok: false; error: CalcError };

const round2 = (x: number) => Math.round(x * 100) / 100;
const ceil = (x: number) => Math.ceil(x - EPS); // ceil(18.0000001) must stay 18
const pos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

/** Area of one sellable unit in m², or null if the product's size is unknown. */
export function unitArea(u: CalcUnit): number | null {
  if (u.calc_mode === 'box') return pos(u.box_area_m2) ? u.box_area_m2 : null;
  if (u.calc_mode === 'linear') return null;
  return pos(u.unit_width_cm) && pos(u.unit_length_cm)
    ? (u.unit_width_cm / 100) * (u.unit_length_cm / 100)
    : null;
}

export function calculate(i: CalcInput): CalcResult {
  const waste = Math.max(0, Number(i.wastePct) || 0) / 100;
  if (!pos(i.a)) return { ok: false, error: 'MISSING_INPUT' };

  let units: number;
  let net_area: number | null = null;
  let gross_area: number | null = null;
  let net_length: number | null = null;
  let gross_length: number | null = null;

  if (i.surface === 'linear') {
    if (!pos(i.unit.piece_length_m)) return { ok: false, error: 'MISSING_UNIT' };
    net_length = i.a;
    gross_length = i.a * (1 + waste);
    units = ceil(gross_length / i.unit.piece_length_m);
  } else {
    if (!pos(i.b)) return { ok: false, error: 'MISSING_INPUT' };
    const ua = unitArea(i.unit);
    if (ua == null) return { ok: false, error: 'MISSING_UNIT' };
    const doors = i.surface === 'wall' ? Math.max(0, i.doors ?? 0) : 0;
    const windows = i.surface === 'wall' ? Math.max(0, i.windows ?? 0) : 0;
    const doorM2 = i.doorM2 ?? DOOR_M2;
    const windowM2 = i.windowM2 ?? WINDOW_M2;
    // A counted opening needs a real size (an edited size left empty is missing input).
    if ((doors > 0 && !pos(doorM2)) || (windows > 0 && !pos(windowM2)))
      return { ok: false, error: 'MISSING_INPUT' };
    const openings = doors * doorM2 + windows * windowM2;
    net_area = i.a * i.b - openings;
    if (net_area <= 0) return { ok: false, error: 'OPENINGS_EXCEED_AREA' };
    gross_area = net_area * (1 + waste);
    units = ceil(gross_area / ua);
  }

  const perBox = i.unit.pieces_per_box ?? 0;
  const boxes = perBox > 1 ? ceil(units / perBox) : null;
  const required = boxes ?? units;
  const stock = i.stock == null ? null : Number(i.stock);

  return {
    ok: true,
    surface: i.surface,
    net_area: net_area == null ? null : round2(net_area),
    gross_area: gross_area == null ? null : round2(gross_area),
    net_length: net_length == null ? null : round2(net_length),
    gross_length: gross_length == null ? null : round2(gross_length),
    units,
    boxes,
    required,
    total_price: pos(i.price) ? round2(required * i.price) : null,
    stock_ok: stock == null ? null : required <= stock,
    shortfall: stock == null ? 0 : Math.max(0, required - stock),
  };
}

/** Default surface for a product's calc_mode (FR-4-1). */
export function defaultSurface(mode: CalcMode): Surface {
  if (mode === 'linear') return 'linear';
  if (mode === 'box' || mode === 'tile') return 'floor';
  return 'wall';
}
