import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/_kit');
  await expect(page.locator('[data-kit="DetailTabs"]')).toBeVisible();
});

test('renders RTL Arabic', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('loads IBM Plex Sans Arabic', async ({ page }) => {
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    document.fonts.check('20px "IBM Plex Sans Arabic"', 'عربي'),
  );
  expect(loaded).toBe(true);
  const family = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain('IBM Plex Sans Arabic');
});

test('every interactive element is at least 56x56', async ({ page }) => {
  const small = await page.$$eval('button, input, a[href], [role="button"]', (els) =>
    els
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim(),
          w: r.width,
          h: r.height,
        };
      })
      .filter((b) => b.h < 56 || b.w < 56),
  );
  expect(small).toEqual([]);
});

test('BigButtons are 64px high', async ({ page }) => {
  const heights = await page
    .locator('[data-kit="BigButton"] button')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBe(64);
});

test('no text below 16px', async ({ page }) => {
  const tooSmall = await page.$$eval('body *', (els) =>
    els
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()))
      .map((el) => ({
        text: el.textContent?.trim().slice(0, 30),
        fs: parseFloat(getComputedStyle(el).fontSize),
      }))
      .filter((x) => x.fs < 16),
  );
  expect(tooSmall).toEqual([]);
});

test('BackButton sits top-right of the content column', async ({ page }) => {
  const box = (await page.getByRole('button', { name: 'رجوع' }).boundingBox())!;
  const main = (await page.locator('main').boundingBox())!;
  // Right edge of the button aligns with the right edge of main (minus 24px padding).
  expect(Math.abs(main.x + main.width - 24 - (box.x + box.width))).toBeLessThan(2);
  expect(box.y).toBeLessThan(150);
});

test('DetailTabs: 160px tiles, single open', async ({ page }) => {
  const kit = page.locator('[data-kit="DetailTabs"]');
  const tile = kit.getByRole('button', { name: 'قول للعميل' });
  expect((await tile.boundingBox())!.height).toBe(160);
  await tile.click();
  await expect(kit.locator('[aria-expanded="true"]')).toHaveCount(1);
  await expect(kit.getByRole('region')).toContainText('بيتمسح بفوطة');
});

test('PIN auto-submits on the 4th digit and shakes', async ({ page }) => {
  const pad = page.locator('[data-kit="NumPad (PIN)"]');
  for (const d of ['1', '2', '3', '4'])
    await pad.getByRole('button', { name: d, exact: true }).click();
  await expect(pad.getByText('الرقم غلط، جرّب تاني')).toBeVisible();
});

test('toast shows then auto-dismisses after ~2s', async ({ page }) => {
  await page.locator('[data-kit="Toast"]').getByRole('button').first().click();
  const toast = page.getByRole('status');
  await expect(toast).toHaveText(/اتسجل/);
  await expect(toast).toBeHidden({ timeout: 3000 });
});

test('no horizontal scroll', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('item codes keep LTR order inside Arabic names', async ({ page }) => {
  const bdi = page.locator('[data-kit="Typography"] bdi[dir="ltr"]');
  await expect(bdi).toHaveText('20-80901');
});
