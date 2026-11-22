import { expect, test } from '@playwright/test';
import { enterNumber, loginAsRep, mockBackend, openProduct } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test('product page shows both actions (FR-3-7)', async ({ page }) => {
  await loginAsRep(page);
  await openProduct(page, '20-80901');
  await expect(page.getByRole('button', { name: 'احسب كمية' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'سجّل عميل مهتم' })).toBeVisible();
});

test('golden case 1 in the UI: wall 4 x 2.8 + 1 door -> 18 panels', async ({ page }) => {
  await loginAsRep(page);
  await openProduct(page, '20-80901');
  await page.getByRole('button', { name: 'احسب كمية' }).click();
  await expect(page.getByRole('radio', { name: 'حيطة' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-unit-size]')).toHaveText('مقاس الوحدة: 20 × 290 سم');
  await expect(page.locator('[data-calc-error]')).toHaveText('اكتب المقاسات');

  await enterNumber(page, 'a', '4');
  await enterNumber(page, 'b', '2.8');
  await page.getByRole('button', { name: 'زوّد باب' }).click();

  const result = page.locator('[data-result]');
  await expect(page.locator('[data-required]')).toHaveText('18');
  await expect(result).toContainText('لوح');
  await expect(result).toContainText('المساحة الصافية: 9.31 م²');
  await expect(result).toContainText('بالهالك: 10.24 م²');
  expect(await page.locator('[data-required]').evaluate((e) => getComputedStyle(e).fontSize)).toBe(
    '48px',
  );
  await expect(page.getByRole('alert')).toHaveCount(0); // 528 in stock, no warning
});

test('low stock shows the amber shortfall warning (FR-4-6)', async ({ page }) => {
  await loginAsRep(page);
  await openProduct(page, '1453'); // "بديل خشب كود 1054 20 سم", 62 in stock
  await page.getByRole('button', { name: 'احسب كمية' }).click();
  await enterNumber(page, 'a', '20');
  await enterNumber(page, 'b', '3');
  await expect(page.locator('[data-required]')).toHaveText('114');
  await expect(page.getByRole('alert')).toHaveText('الرصيد مش كفاية، ناقص 52');
});

test('linear item defaults to linear and uses the piece length from the name', async ({ page }) => {
  await loginAsRep(page);
  await openProduct(page, 'KB23'); // "زاويه فيوتك KB23 طول 2.44 م"
  await page.getByRole('button', { name: 'احسب كمية' }).click();
  await expect(page.getByRole('radio', { name: 'طولي' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-unit-size]')).toContainText('2.44');
  await enterNumber(page, 'a', '18');
  await expect(page.locator('[data-required]')).toHaveText('9'); // 19.8 / 2.44
  await expect(page.locator('[data-result]')).toContainText('بالهالك: 19.8 متر');
});

test('unknown unit size asks for it; Edit lets the rep fix it', async ({ page }) => {
  await loginAsRep(page);
  await openProduct(page, 'بديل خشب بومبيه WP3'); // WPC without a width in its name
  await page.getByRole('button', { name: 'احسب كمية' }).click();
  await expect(page.locator('[data-unit-size]')).toHaveText('مقاس الوحدة مش متسجل');
  await enterNumber(page, 'a', '4');
  await enterNumber(page, 'b', '2.8');
  await expect(page.locator('[data-calc-error]')).toHaveText('اكتب مقاس الوحدة الأول');
  await enterNumber(page, 'uw', '20');
  await enterNumber(page, 'ul', '290');
  await expect(page.locator('[data-required]')).toHaveText('22'); // 11.2 * 1.1 / 0.58
});

test('calc -> lead: summary prefilled into the note; save calls create_lead once', async ({
  page,
}) => {
  const state = await mockBackend(page);
  await loginAsRep(page);
  await openProduct(page, '20-80901');
  await page.getByRole('button', { name: 'احسب كمية' }).click();
  await enterNumber(page, 'a', '4');
  await enterNumber(page, 'b', '2.8');
  await page.getByRole('button', { name: 'زوّد باب' }).click();
  await page.getByRole('button', { name: 'سجّل عميل مهتم بالكمية دي' }).click();

  await expect(page.locator('[data-screen="lead"]')).toBeVisible();
  await expect(page.locator('textarea[name="note"]')).toHaveValue(
    'حيطة 4 × 2.8 متر، باب 1: 18 لوح (الهالك ٪ 10)',
  );
  await page.locator('input[name="name"]').fill('أحمد');
  await enterNumber(page, 'phone', '01012345678');
  await page.getByRole('radio', { name: 'مهندس' }).click();
  await page.getByRole('button', { name: 'سجّل', exact: true }).click();

  await expect(page.getByRole('status')).toHaveText(/اتسجل ✓/);
  await expect(page.locator('[data-screen="product"]')).toBeVisible();
  expect(state.leads).toHaveLength(1);
  expect(state.leads[0]).toMatchObject({
    p_name: 'أحمد',
    p_phone: '01012345678',
    p_type: 'engineer',
  });
  expect(String(state.leads[0]!.p_note)).toContain('18 لوح');
});

test('lead validation: bad phone and empty name never reach the server', async ({ page }) => {
  const state = await mockBackend(page);
  await loginAsRep(page);
  await openProduct(page, 'رخام');
  await page.getByRole('button', { name: 'سجّل عميل مهتم' }).click();
  await enterNumber(page, 'phone', '0131234567');
  await page.getByRole('button', { name: 'سجّل', exact: true }).click();
  await expect(page.getByText('اكتب اسم العميل')).toBeVisible();
  await expect(page.getByText(/رقم الموبايل لازم 11 رقم/)).toBeVisible();
  expect(state.leads).toHaveLength(0);
});

test('existing customer (same phone) shows the "already registered" message', async ({ page }) => {
  const state = await mockBackend(page);
  state.leadMode = 'existing';
  await loginAsRep(page);
  await openProduct(page, 'رخام');
  await page.getByRole('button', { name: 'سجّل عميل مهتم' }).click();
  await page.locator('input[name="name"]').fill('أحمد');
  await enterNumber(page, 'phone', '01112345678');
  await page.getByRole('button', { name: 'سجّل', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'العميل ده متسجل قبل كده، ضفنا المنتج ده لاهتماماته',
  );
});

test('no internet: clear message, the rep stays on the form', async ({ page }) => {
  const state = await mockBackend(page);
  state.leadMode = 'offline';
  await loginAsRep(page);
  await openProduct(page, 'رخام');
  await page.getByRole('button', { name: 'سجّل عميل مهتم' }).click();
  await page.locator('input[name="name"]').fill('أحمد');
  await enterNumber(page, 'phone', '01512345678');
  await page.getByRole('button', { name: 'سجّل', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'مفيش نت' })).toBeVisible();
  await expect(page.locator('[data-screen="lead"]')).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue('أحمد');
});

test('calc and lead screens: targets >= 56px, no text < 16px, no h-scroll', async ({ page }) => {
  await loginAsRep(page);
  await openProduct(page, '20-80901');
  for (const btn of ['احسب كمية', 'سجّل عميل مهتم']) {
    await page.getByRole('button', { name: btn, exact: true }).click();
    await page.waitForURL(/\/(calc|lead)$/);
    const bad = await page.evaluate(() => {
      const small = [...document.querySelectorAll('button, input, textarea, a[href]')]
        .map((el) => ({
          t: el.getAttribute('name') ?? el.textContent,
          r: el.getBoundingClientRect(),
        }))
        .filter(({ r }) => r.width < 56 || r.height < 56)
        .map(({ t }) => t);
      const tiny = [...document.querySelectorAll('body *')].filter(
        (el) =>
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()) &&
          parseFloat(getComputedStyle(el).fontSize) < 16,
      ).length;
      return { small, tiny, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(bad, btn).toEqual({ small: [], tiny: 0, overflow: false });
    await page.getByRole('button', { name: 'رجوع' }).click();
    await page.locator('[data-screen="product"]').waitFor();
  }
});
