import { buildRows } from '../../supabase/seed/seed';
import { normalize } from '@/lib/normalize';
import { MAX_RESULTS, search, similarity, type Searchable } from '@/lib/search';

const { productRows } = buildRows();
const catalog: (Searchable & { spec_type: string; facts: Record<string, string> })[] = [
  ...productRows.map((p) => ({
    ...p,
    edara_item_code: null,
    stock_total: Object.values(p.stock).reduce((a, b) => a + b, 0),
  })),
  // Row 1211 exists in the full Edara file (not in the demo 100); used for the "8005" case.
  {
    id: 'extra-1211',
    edara_row_no: 1211,
    edara_item_code: null,
    name: 'بديل رخام ريزن ذهبي فاتح كود 8005',
    search_text: normalize('بديل رخام ريزن ذهبي فاتح كود 8005 بديل الرخام'),
    spec_type: 'marble',
    specs_status: 'draft_general_by_type',
    stock_total: 8,
    facts: { 'كود الموديل': '8005' },
  },
];

const types = (q: string) => search(catalog, q).map((p) => p.spec_type);

describe('search (PLAN.md 14.4)', () => {
  it('استلس -> stainless items (by type or by Edara name)', () => {
    const r = search(catalog, 'استلس');
    expect(r).toHaveLength(MAX_RESULTS);
    for (const p of r) expect(p.spec_type === 'steelstrip' || p.name.includes('استلس')).toBe(true);
  });

  it('numbers never match fuzzily', () => {
    for (const p of search(catalog, '20 سم')) expect(normalize(p.name)).toMatch(/(^|\s)20 سم/);
  });

  it('رخامه -> marble-alternative items', () => {
    const r = types('رخامه');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((t) => t === 'marble')).toBe(true);
  });

  it('بديل الخشب -> WPC wall panels', () => {
    const r = types('بديل الخشب');
    expect(r).toHaveLength(MAX_RESULTS);
    expect(r.every((t) => t === 'wallpanel')).toBe(true);
  });

  it('8005 -> the SKU whose code contains 8005', () => {
    expect(search(catalog, '8005')[0]?.name).toContain('8005');
  });

  it('٢٠ سم -> items whose facts include 20 cm', () => {
    const r = search(catalog, '٢٠ سم');
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(Object.values(p.facts)).toContain('20 سم');
  });

  it('Edara row number lookup goes first', () => {
    expect(search(catalog, '1621')[0]?.edara_row_no).toBe(1621);
  });

  it('typo tolerance: بدیل رخم still finds marble', () => {
    expect(types('بديل رخم')[0]).toBe('marble');
  });

  it('returns at most 8 rows and nothing for an empty query', () => {
    expect(search(catalog, 'بديل').length).toBeLessThanOrEqual(MAX_RESULTS);
    expect(search(catalog, '   ')).toEqual([]);
  });

  it('nonsense returns nothing', () => {
    expect(search(catalog, 'zzqxw')).toEqual([]);
  });

  it('runs under 100ms on the catalog', () => {
    const t = performance.now();
    for (const q of ['استلس', 'رخامه', 'بديل الخشب', '8005', '20 سم']) search(catalog, q);
    expect(performance.now() - t).toBeLessThan(100);
  });

  it('similarity is symmetric and 1 for equal words', () => {
    expect(similarity('رخام', 'رخام')).toBe(1);
    expect(similarity('رخام', 'خشب')).toBe(similarity('خشب', 'رخام'));
  });
});
