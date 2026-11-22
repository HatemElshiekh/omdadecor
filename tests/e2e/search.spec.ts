import { expect, test } from '@playwright/test';
import { loginAsRep, mockBackend } from './mocks';

test('empty state shows 6 category tiles; tapping one fills the search', async ({ page }) => {
  await mockBackend(page);
  await loginAsRep(page);
  const input = page.getByPlaceholder('اكتب اسم المنتج… مثلاً بديل رخام');
  await expect(input).toBeFocused(); // FR-2-1 autofocus
  const tiles = page.getByRole('button', { name: /بديل|الباركيه|الألواح|الاستانلس/ });
  await expect(tiles).toHaveCount(6);
  await page.getByRole('button', { name: 'بديل الرخام' }).click();
  await expect(input).toHaveValue('بديل الرخام');
  await expect(page.locator('[data-results] li')).toHaveCount(8);
});

test('search-as-you-type, max 8 rows of 72px, logs the query', async ({ page }) => {
  const state = await mockBackend(page);
  await loginAsRep(page);
  await page.getByPlaceholder(/اكتب اسم المنتج/).fill('استلس');
  const rows = page.locator('[data-results] a');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeLessThanOrEqual(8);
  expect((await rows.first().boundingBox())!.height).toBe(72);
  await expect.poll(() => state.searchLogs.length).toBe(1);
  expect(state.searchLogs[0]).toMatchObject({ query: 'استلس' });
});

test('opening a result while the log insert is in flight does not log twice', async ({ page }) => {
  const state = await mockBackend(page);
  // Slow down the log insert so the click lands while it is pending.
  await page.route('**/rest/v1/search_logs**', async (r) => {
    if (r.request().method() === 'POST') await new Promise((res) => setTimeout(res, 800));
    await r.fallback();
  });
  await loginAsRep(page);
  await page.getByPlaceholder(/اكتب اسم المنتج/).fill('رخام');
  await page.waitForTimeout(1200); // query settled, insert in flight
  await page.locator('[data-results] a').first().click();
  await expect
    .poll(() => state.searchLogs.at(-1)?.opened_product_id, { timeout: 5000 })
    .toBeTruthy();
  expect(state.searchLogs.filter((l) => l.query === 'رخام')).toHaveLength(1);
});

test('zero results shows the empty message', async ({ page }) => {
  await mockBackend(page);
  await loginAsRep(page);
  await page.getByPlaceholder(/اكتب اسم المنتج/).fill('zzqxw');
  await expect(
    page.getByText('مفيش منتج بالاسم ده. جرّب كلمة أقصر، أو اسأل المساعد'),
  ).toBeVisible();
});

test('product page: specs are the hero, metadata, draft badge, 4 tabs', async ({ page }) => {
  const state = await mockBackend(page);
  await loginAsRep(page);
  await page.getByPlaceholder(/اكتب اسم المنتج/).fill('20-80901');
  await page.locator('[data-results] a').first().click();
  await expect(page).toHaveURL(/\/p\//);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('بديل خشب 20 سم كود');
  await expect(page.locator('h1 bdi')).toHaveText('20-80901');
  await expect(page.locator('[data-meta]')).toHaveText('السعر: يتأكد من الكاشير · الرصيد: 528');
  const metaSize = await page.locator('[data-meta]').evaluate((e) => getComputedStyle(e).fontSize);
  expect(metaSize).toBe('16px');
  await expect(page.getByText('مواصفات عامة للنوع، تحت مراجعة المعرض')).toBeVisible();

  // Tab 1 open by default: facts + size bullets.
  await expect(page.getByRole('button', { name: 'المقاس والخامة' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('region')).toContainText('كود الموديل');
  await expect(page.getByRole('region')).toContainText('الطول المعتاد 2.9 إلى 3 متر للوح');

  // Pitch: 3 cards at 22px.
  await page.getByRole('button', { name: 'قول للعميل' }).click();
  const pitch = page.getByRole('region').locator('p');
  await expect(pitch).toHaveCount(3);
  expect(await pitch.first().evaluate((e) => getComputedStyle(e).fontSize)).toBe('22px');

  // Where it fits: green ticks and red crosses.
  await page.getByRole('button', { name: 'ينفع فين' }).click();
  await expect(page.getByRole('region')).toContainText('حوائط الريسبشن والصالة');
  await expect(page.getByRole('region')).toContainText('الأرضيات');

  await page.getByRole('button', { name: 'التركيب والمكملات' }).click();
  await expect(page.getByRole('region')).toContainText('يتركب بالغراء');

  // Opening the product was logged against the search: exactly one row for the query.
  await expect.poll(() => state.searchLogs.at(-1)?.opened_product_id).toBeTruthy();
  expect(state.searchLogs.filter((l) => l.query === '20-80901')).toHaveLength(1);

  // Back returns to the same search.
  await page.getByRole('button', { name: 'رجوع' }).click();
  await expect(page.getByPlaceholder(/اكتب اسم المنتج/)).toHaveValue('20-80901');
});

test('engineer price appears only when the DB returns it', async ({ page }) => {
  const state = await mockBackend(page);
  state.engineerPrice = 400;
  await loginAsRep(page);
  await page.getByPlaceholder(/اكتب اسم المنتج/).fill('20-80901');
  await page.locator('[data-results] a').first().click();
  await expect(page.locator('[data-meta]')).toContainText('سعر المهندس: 400 ج.م');
});

test('product and search screens: targets >= 56px, no text < 16px, no h-scroll', async ({
  page,
}) => {
  await mockBackend(page);
  await loginAsRep(page);
  for (const step of ['search', 'product'] as const) {
    if (step === 'product') {
      await page.getByPlaceholder(/اكتب اسم المنتج/).fill('رخام');
      await page.locator('[data-results] a').first().click();
      await expect(page.locator('[data-screen="product"]')).toBeVisible();
    }
    const bad = await page.evaluate(() => {
      const small = [...document.querySelectorAll('button, input, a[href]')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width < 56 || r.height < 56).length;
      const tiny = [...document.querySelectorAll('body *')].filter(
        (el) =>
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()) &&
          parseFloat(getComputedStyle(el).fontSize) < 16,
      ).length;
      return { small, tiny, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(bad, step).toEqual({ small: 0, tiny: 0, overflow: false });
  }
});
