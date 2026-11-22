import type { Page, Route } from '@playwright/test';
import { buildRows } from '../../supabase/seed/seed';

// Catalog fixtures = exactly what the seed loads into Supabase.
const rows = buildRows();
export const PRODUCTS = rows.productRows.map(({ stock, ...p }) => ({
  ...p,
  edara_item_code: null,
  unit_label: null,
  size_material_colors: null,
  use_yes: null,
  use_no: null,
  say_to_customer: null,
  install_and_complements: null,
  complement_product_ids: [],
  is_active: true,
  stock_total: Object.values(stock).reduce((a, b) => a + b, 0),
}));
export const TEMPLATES = rows.specTemplates;

// Fictional staff for UI tests. Never put real staff ids or PINs in the repo.
export const STAFF = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    display_name: 'سامح',
    role: 'sales' as const,
    pin: '1357',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    display_name: 'حاتم',
    role: 'manager' as const,
    pin: '2468',
  },
];
export const REP_PIN = '1357';
export const MANAGER_PIN = '2468';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub: string) =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.sig`;

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export interface MockState {
  pinCalls: number;
  searchLogs: Array<Record<string, unknown>>;
  /** When set, products_for_staff returns this engineer price for every row. */
  engineerPrice?: number;
  /** Force the next pin-login response (server behaviour is tested in tests/db). */
  next?: 'locked';
  currentUser?: string;
}

export async function mockBackend(page: Page): Promise<MockState> {
  const state: MockState = { pinCalls: 0, searchLogs: [] };

  await page.route('**/functions/v1/staff-list', (r) =>
    json(
      r,
      200,
      STAFF.map(({ id, display_name }) => ({ id, display_name, avatar_url: null })),
    ),
  );

  await page.route('**/functions/v1/pin-login', async (r) => {
    state.pinCalls++;
    const { staff_id, pin } = r.request().postDataJSON() as { staff_id: string; pin: string };
    const s = STAFF.find((x) => x.id === staff_id);
    if (state.next === 'locked')
      return json(r, 423, {
        error: { code: 'LOCKED', retry_at: new Date(Date.now() + 600_000).toISOString() },
      });
    if (!s || s.pin !== pin) return json(r, 401, { error: { code: 'BAD_PIN', attempts_left: 4 } });
    state.currentUser = s.id;
    return json(r, 200, { access_token: jwt(s.id), refresh_token: 'rt-' + s.id, role: s.role });
  });

  await page.route('**/auth/v1/user', (r) => {
    const s = STAFF.find((x) => x.id === state.currentUser);
    return s
      ? json(r, 200, { id: s.id, aud: 'authenticated', role: 'authenticated' })
      : json(r, 401, {});
  });
  await page.route('**/auth/v1/logout**', (r) => {
    state.currentUser = undefined;
    return r.fulfill({ status: 204 });
  });

  await page.route('**/rest/v1/staff**', (r) => {
    const s = STAFF.find((x) => x.id === state.currentUser);
    if (!s) return json(r, 200, null);
    return json(r, 200, {
      id: s.id,
      display_name: s.display_name,
      role: s.role,
      can_see_engineer_price: false,
    });
  });

  await page.route('**/rest/v1/products_for_staff**', (r) =>
    json(
      r,
      200,
      PRODUCTS.map((p) => ({ ...p, engineer_price: state.engineerPrice ?? null })),
    ),
  );
  await page.route('**/rest/v1/spec_templates**', (r) => json(r, 200, TEMPLATES));
  await page.route('**/rest/v1/search_logs**', async (r) => {
    const req = r.request();
    if (req.method() === 'POST') {
      const row = { id: state.searchLogs.length + 1, ...(req.postDataJSON() as object) };
      state.searchLogs.push(row);
      return json(r, 201, { id: row.id });
    }
    if (req.method() === 'PATCH') {
      const id = Number(new URL(req.url()).searchParams.get('id')?.replace('eq.', ''));
      const row = state.searchLogs.find((l) => l.id === id);
      if (row) Object.assign(row, req.postDataJSON() as object);
      return r.fulfill({ status: 204 });
    }
    return json(r, 200, []);
  });

  return state;
}

export async function loginAsRep(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  await typePin(page, REP_PIN);
  await page.waitForURL(/\/(\?.*)?$/);
}

export async function typePin(page: Page, pin: string) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}
