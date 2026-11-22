// Client-side product search over the cached catalog (PLAN.md 14.3).
// Same interface will later front a Postgres search_products(q) for the full catalog.
import { normalize } from './normalize';

export interface Searchable {
  id: string;
  name: string;
  search_text: string;
  edara_row_no: number | null;
  edara_item_code: string | null;
  specs_status: string;
  stock_total: number;
}

export const MAX_RESULTS = 8;
const TRIGRAM_MIN = 0.25;

/** Light Arabic stemming for token comparison: drop "ال" prefix and trailing "ه". */
function stem(t: string): string {
  let s = t;
  if (s.length > 3 && s.startsWith('ال')) s = s.slice(2);
  if (s.length > 2 && s.endsWith('ه')) s = s.slice(0, -1);
  return s;
}

function trigrams(word: string): Set<string> {
  const padded = `  ${word} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** pg_trgm-style similarity between two words. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = trigrams(a);
  const B = trigrams(b);
  let shared = 0;
  A.forEach((g) => B.has(g) && shared++);
  return shared / (A.size + B.size - shared);
}

const tokenize = (s: string) => s.split(' ').filter(Boolean);

/** 0 = no match. Higher is better. Tiers follow PLAN 14.3. */
export function score(item: Searchable, rawQuery: string): number {
  const q = normalize(rawQuery);
  if (!q) return 0;
  const name = normalize(item.name);
  const text = item.search_text;

  // Exact Edara row number or item code lookup (FR-2-6).
  if (/^\d+$/.test(q) && item.edara_row_no === Number(q)) return 1000;
  if (item.edara_item_code && normalize(item.edara_item_code) === q) return 1000;

  if (name.startsWith(q)) return 400; // 1. prefix on full name

  const qTokens = tokenize(q);
  const tTokens = tokenize(text);
  const tStems = new Set(tTokens.map(stem));
  const tSet = new Set(tTokens);
  if (qTokens.every((t) => tSet.has(t) || tStems.has(stem(t)))) return 300; // 2. whole tokens

  if (text.includes(q)) return 200; // 3. substring
  if (qTokens.every((t) => text.includes(t))) return 150;

  // 4. trigram tail, token by token (every query token must find a close text token).
  // Tokens with digits (sizes, codes) never match fuzzily: 20 is not 2.
  let worst = 1;
  for (const qt of qTokens) {
    let best = 0;
    if (/\d/.test(qt)) best = tTokens.includes(qt) ? 1 : 0;
    else for (const tt of tTokens) best = Math.max(best, similarity(stem(qt), stem(tt)));
    worst = Math.min(worst, best);
  }
  return worst >= TRIGRAM_MIN ? Math.round(100 * worst) : 0;
}

export function search<T extends Searchable>(items: T[], query: string, limit = MAX_RESULTS): T[] {
  return items
    .map((item) => ({ item, s: score(item, query) }))
    .filter((r) => r.s > 0)
    .sort(
      (a, b) =>
        b.s - a.s ||
        // Tie-breakers: approved specs first, then in stock, then name.
        Number(b.item.specs_status === 'approved') - Number(a.item.specs_status === 'approved') ||
        Number(b.item.stock_total > 0) - Number(a.item.stock_total > 0) ||
        a.item.name.localeCompare(b.item.name, 'ar'),
    )
    .slice(0, limit)
    .map((r) => r.item);
}
