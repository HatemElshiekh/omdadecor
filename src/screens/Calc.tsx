// /p/:id/calc Quantity calculator (PLAN.md 9.4, FR-4-1..FR-4-8). All math in lib/calc.ts.
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Minus, Pencil, Plus } from 'lucide-react';
import { BackButton, BidiText, BigButton, NumberField, NumPad, Toggle } from '@/components';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { ar } from '@/i18n/ar';
import {
  calculate,
  defaultSurface,
  DOOR_CM,
  WINDOW_CM,
  type CalcMode,
  type Surface,
} from '@/lib/calc';
import { cn } from '@/lib/cn';
import { fmt, formatNumber } from '@/lib/format';
import { applyNumPadKey, type NumPadKey } from '@/lib/numpad';
import { productsQuery, type Product } from '@/lib/products';

type FieldKey = 'a' | 'b' | 'waste' | 'uw' | 'ul' | 'box' | 'piece' | 'dw' | 'dh' | 'ww' | 'wh';

const str = (n: number | null | undefined) => (n == null ? '' : String(n));
const num = (s: string) => (s === '' || s === '.' ? NaN : Number(s));

const UNIT_LABEL: Record<CalcMode, string> = {
  panel: ar.calc.unit_panel,
  sheet: ar.calc.unit_sheet,
  tile: ar.calc.unit_tile,
  box: ar.calc.unit_box,
  linear: ar.calc.unit_linear,
};

function Counter({
  label,
  value,
  onChange,
  size,
  editing,
  onToggleEdit,
  children,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  /** Opening size shown as small muted text; tapping it edits the size. */
  size: string;
  editing: boolean;
  onToggleEdit: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded bg-surface-soft px-4 py-2" data-counter={label}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium">{label}</span>
          <button
            type="button"
            onClick={onToggleEdit}
            aria-expanded={editing}
            aria-label={`${ar.calc.edit} ${label}: ${size}`}
            className={cn(
              'flex min-h-tap-min min-w-tap-min items-center gap-1 rounded px-2 text-small',
              editing ? 'text-primary' : 'text-muted',
            )}
            data-opening-size
          >
            <span>{size}</span>
            <Pencil size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`${ar.calc.remove} ${label}`}
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex size-tap-min items-center justify-center rounded bg-surface shadow-card disabled:opacity-40"
            disabled={value === 0}
          >
            <Minus size={24} strokeWidth={1.75} aria-hidden />
          </button>
          <span className="min-w-8 text-center text-title font-semibold" data-count={label}>
            {value}
          </span>
          <button
            type="button"
            aria-label={`${ar.calc.add} ${label}`}
            onClick={() => onChange(Math.min(20, value + 1))}
            className="flex size-tap-min items-center justify-center rounded bg-surface shadow-card"
          >
            <Plus size={24} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
      {editing && children}
    </div>
  );
}

function CalcScreen({ p }: { p: Product }) {
  const navigate = useNavigate();
  const touch = useCoarsePointer();
  const mode = p.calc_mode as CalcMode;

  const [surface, setSurface] = useState<Surface>(defaultSurface(mode));
  const [v, setV] = useState<Record<FieldKey, string>>({
    a: '',
    b: '',
    waste: str(p.waste_pct),
    uw: str(p.unit_width_cm),
    ul: str(p.unit_length_cm),
    box: str(p.box_area_m2),
    piece: str(p.piece_length_m),
    dw: String(DOOR_CM.w),
    dh: String(DOOR_CM.h),
    ww: String(WINDOW_CM.w),
    wh: String(WINDOW_CM.h),
  });
  const [editOpening, setEditOpening] = useState<'door' | 'window' | null>(null);
  const toggleOpening = (o: 'door' | 'window') => setEditOpening((e) => (e === o ? null : o));
  const [doors, setDoors] = useState(0);
  const [windows, setWindows] = useState(0);
  const [editUnit, setEditUnit] = useState(false);
  const [active, setActive] = useState<FieldKey>('a');
  const set = (k: FieldKey) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  const unit = {
    calc_mode: (surface === 'linear' ? 'linear' : mode === 'linear' ? 'panel' : mode) as CalcMode,
    unit_width_cm: num(v.uw),
    unit_length_cm: num(v.ul),
    box_area_m2: num(v.box),
    piece_length_m: num(v.piece),
    pieces_per_box: p.pieces_per_box,
  };
  const r = useMemo(
    () =>
      calculate({
        surface,
        a: num(v.a),
        b: num(v.b),
        doors: surface === 'wall' ? doors : 0,
        windows: surface === 'wall' ? windows : 0,
        doorM2: (num(v.dw) / 100) * (num(v.dh) / 100),
        windowM2: (num(v.ww) / 100) * (num(v.wh) / 100),
        wastePct: num(v.waste),
        unit,
        price: p.price,
        stock: p.stock_total,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [surface, v, doors, windows, p.price, p.stock_total],
  );

  const unitLabel = UNIT_LABEL[unit.calc_mode];
  const unitSize =
    unit.calc_mode === 'linear'
      ? v.piece && `${unitLabel} ${v.piece} ${ar.calc.m}`
      : unit.calc_mode === 'box'
        ? v.box && `${unitLabel} ${v.box} ${ar.calc.m2}`
        : v.uw && v.ul && `${v.uw} × ${v.ul} ${ar.calc.cm}`;

  const onKey = (k: NumPadKey) =>
    setV((s) => ({ ...s, [active]: applyNumPadKey(s[active], k, 6) }));
  const field = (k: FieldKey, label: string) => (
    <NumberField
      key={k}
      name={k}
      label={label}
      value={v[k]}
      onChange={set(k)}
      touch={touch}
      active={touch && active === k}
      onActivate={() => setActive(k)}
    />
  );

  const errorText =
    !r.ok &&
    (r.error === 'MISSING_UNIT'
      ? ar.calc.missing_unit
      : r.error === 'OPENINGS_EXCEED_AREA'
        ? ar.calc.openings
        : ar.calc.missing);

  const doorSize = fmt(ar.calc.opening_size, { w: v.dw || '?', h: v.dh || '?' });
  const windowSize = fmt(ar.calc.opening_size, { w: v.ww || '?', h: v.wh || '?' });
  const isStd = (w: string, h: string, std: { w: number; h: number }) =>
    Number(w) === std.w && Number(h) === std.h;

  const goLead = () => {
    if (!r.ok) return;
    // Non-standard opening sizes go into the note so the follow-up has the full picture.
    const opening = (label: string, n: number, size: string, std: boolean) =>
      n ? `، ${label} ${n}${std ? '' : ` (${size})`}` : '';
    const dims =
      surface === 'linear'
        ? `${v.a} ${ar.calc.m}`
        : `${v.a} × ${v.b} ${ar.calc.m}` +
          opening(ar.calc.doors, doors, doorSize, isStd(v.dw, v.dh, DOOR_CM)) +
          opening(ar.calc.windows, windows, windowSize, isStd(v.ww, v.wh, WINDOW_CM));
    const qty = r.boxes ? `${r.boxes} ${ar.calc.unit_boxes}` : `${r.units} ${unitLabel}`;
    const surfaceLabel = {
      wall: ar.calc.surface_wall,
      floor: ar.calc.surface_floor,
      linear: ar.calc.surface_linear,
    }[surface];
    navigate(`/p/${p.id}/lead`, {
      state: { note: `${surfaceLabel} ${dims}: ${qty} (${ar.calc.waste} ${v.waste})` },
    });
  };

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-6 p-6" data-screen="calc">
      <div className="flex">
        <BackButton onClick={() => navigate(`/p/${p.id}`, { replace: true })} />
      </div>
      <h1 className="text-title font-semibold">
        <BidiText text={p.name} />
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-5 rounded-lg bg-surface p-6 shadow-card">
          <Toggle
            label={ar.cta.calc}
            value={surface}
            onChange={(s) => {
              setSurface(s);
              setActive('a');
            }}
            options={[
              { value: 'wall', label: ar.calc.surface_wall },
              { value: 'floor', label: ar.calc.surface_floor },
              { value: 'linear', label: ar.calc.surface_linear },
            ]}
          />

          {surface === 'linear' ? (
            field('a', ar.calc.linear)
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {field('a', ar.calc.length)}
              {field('b', surface === 'wall' ? ar.calc.height : ar.calc.width)}
            </div>
          )}

          {surface === 'wall' && (
            <div className="grid gap-3">
              <Counter
                label={ar.calc.doors}
                value={doors}
                onChange={setDoors}
                size={doorSize}
                editing={editOpening === 'door'}
                onToggleEdit={() => toggleOpening('door')}
              >
                <div className="grid grid-cols-2 gap-5">
                  {field('dw', ar.calc.door_width)}
                  {field('dh', ar.calc.door_height)}
                </div>
              </Counter>
              <Counter
                label={ar.calc.windows}
                value={windows}
                onChange={setWindows}
                size={windowSize}
                editing={editOpening === 'window'}
                onToggleEdit={() => toggleOpening('window')}
              >
                <div className="grid grid-cols-2 gap-5">
                  {field('ww', ar.calc.window_width)}
                  {field('wh', ar.calc.window_height)}
                </div>
              </Counter>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-small text-muted" data-unit-size>
              {unitSize ? fmt(ar.calc.unit_size, { size: unitSize }) : ar.calc.unit_unknown}
            </span>
            <button
              type="button"
              onClick={() => setEditUnit((e) => !e)}
              className="h-tap-min rounded border border-line px-5 text-body font-medium text-primary"
              aria-expanded={editUnit}
            >
              {editUnit ? ar.calc.done : ar.calc.edit}
            </button>
          </div>
          {(editUnit || !unitSize) &&
            (unit.calc_mode === 'linear' ? (
              field('piece', ar.calc.piece_length)
            ) : unit.calc_mode === 'box' ? (
              field('box', ar.calc.box_area)
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {field('uw', ar.calc.unit_width)}
                {field('ul', ar.calc.unit_length)}
              </div>
            ))}

          <div className="max-w-[200px]">{field('waste', ar.calc.waste)}</div>
        </section>

        <section className="flex flex-col gap-5">
          <div className="rounded-lg bg-surface p-6 shadow-card" aria-live="polite" data-result>
            {r.ok ? (
              <div className="flex flex-col gap-2">
                <p className="flex items-baseline gap-3">
                  <span
                    className="text-[48px] font-semibold leading-none text-primary"
                    data-required
                  >
                    {formatNumber(r.required)}
                  </span>
                  <span className="text-title font-semibold">
                    {r.boxes ? ar.calc.unit_boxes : unitLabel}
                  </span>
                </p>
                {r.boxes != null && (
                  <p className="text-body text-muted">
                    {fmt(ar.calc.units_in_boxes, {
                      units: r.units,
                      unit: unitLabel,
                      boxes: r.boxes,
                    })}
                  </p>
                )}
                {r.net_area != null && (
                  <p className="text-body text-muted">
                    {fmt(ar.calc.net_area, { v: formatNumber(r.net_area) })} ·{' '}
                    {fmt(ar.calc.gross_area, { v: formatNumber(r.gross_area ?? 0) })}
                  </p>
                )}
                {r.net_length != null && (
                  <p className="text-body text-muted">
                    {fmt(ar.calc.net_length, { v: formatNumber(r.net_length) })} ·{' '}
                    {fmt(ar.calc.gross_length, { v: formatNumber(r.gross_length ?? 0) })}
                  </p>
                )}
                {r.total_price != null && (
                  <p className="text-body font-medium">
                    {fmt(ar.calc.total, { v: formatNumber(r.total_price) })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-body text-muted" data-calc-error>
                {errorText}
              </p>
            )}
          </div>

          {r.ok && r.stock_ok === false && (
            <p
              role="alert"
              className="flex items-center gap-3 rounded-lg bg-warning-soft p-4 text-body font-medium text-warning"
            >
              <AlertTriangle size={24} strokeWidth={1.75} aria-hidden />
              {fmt(ar.calc.short, { n: formatNumber(r.shortfall) })}
            </p>
          )}

          {touch && (
            <div className="flex justify-center">
              <NumPad mode="decimal" onKey={onKey} />
            </div>
          )}

          {r.ok && (
            <BigButton variant="primary" onClick={goLead}>
              {ar.calc.lead_cta}
            </BigButton>
          )}
        </section>
      </div>
    </main>
  );
}

export function Calc() {
  const { id } = useParams();
  const products = useQuery(productsQuery);
  if (products.isPending) return <main className="mx-auto max-w-[960px] p-6" aria-busy />;
  const p = products.data?.find((x) => x.id === id);
  if (!p) return <Navigate to="/" replace />;
  if (!p.calc_mode) return <Navigate to={`/p/${p.id}`} replace />;
  return <CalcScreen p={p} />;
}
