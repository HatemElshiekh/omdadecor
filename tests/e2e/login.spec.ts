import { expect, test } from '@playwright/test';
import { MANAGER_PIN, REP_PIN, mockBackend, typePin } from './mocks';

test('unauthenticated visit to / redirects to /login', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'مين بيستخدم الجهاز؟' })).toBeVisible();
});

test('staff cards are 140x140', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/login');
  const box = (await page.getByRole('button', { name: /سامح/ }).boundingBox())!;
  expect(box.width).toBe(140);
  expect(box.height).toBe(140);
  await expect(page.getByRole('button', { name: /حاتم/ })).toBeVisible();
});

test('rep: PIN auto-submits on the 4th digit and lands on /', async ({ page }) => {
  const state = await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  await expect(page.getByText('اكتب رقمك السري')).toBeVisible();
  await typePin(page, REP_PIN.slice(0, 3));
  expect(state.pinCalls).toBe(0);
  await typePin(page, REP_PIN.slice(3));
  await expect(page).toHaveURL(/\/$/);
  expect(state.pinCalls).toBe(1);
  await expect(page.locator('header')).toContainText('سامح');
  await expect(page.locator('[data-screen="home"]')).toBeAttached();
});

test('manager lands on /manager; logout; rep is kept out of /manager', async ({ page }) => {
  const state = await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /حاتم/ }).click();
  await typePin(page, MANAGER_PIN);
  await expect(page).toHaveURL(/\/manager$/);

  await page.getByRole('button', { name: 'خروج' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.currentUser).toBeUndefined();

  await page.getByRole('button', { name: /سامح/ }).click();
  await typePin(page, REP_PIN);
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/manager');
  await expect(page).toHaveURL(/\/$/);
});

test('wrong PIN: error message, dots cleared, can retry', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  await typePin(page, '0000');
  await expect(page.getByText('الرقم غلط، جرّب تاني')).toBeVisible();
  await expect(page.locator('[data-filled]')).toHaveAttribute('data-filled', '0');
  await typePin(page, REP_PIN);
  await expect(page).toHaveURL(/\/$/);
});

test('locked account: locked message and the keypad is disabled', async ({ page }) => {
  const state = await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  state.next = 'locked';
  await typePin(page, '0000');
  await expect(page.getByText('استنى 10 دقايق أو كلّم المدير')).toBeVisible();
  await expect(page.getByRole('button', { name: '5', exact: true })).toBeDisabled();
});

test('back button returns to the staff picker', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  await page.getByRole('button', { name: 'رجوع' }).click();
  await expect(page.getByRole('heading', { name: 'مين بيستخدم الجهاز؟' })).toBeVisible();
});

test('idle for 1 minute logs out (dev timeout)', async ({ page }) => {
  await page.clock.install();
  await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  await typePin(page, REP_PIN);
  await expect(page).toHaveURL(/\/$/);

  await page.clock.fastForward(45_000);
  await page.mouse.move(10, 10); // activity resets the timer
  await page.clock.fastForward(45_000);
  await expect(page).toHaveURL(/\/$/);

  await page.clock.fastForward(20_000);
  await expect(page).toHaveURL(/\/login$/);
});

test('login screen: every interactive element is at least 56x56', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/login');
  await page.getByRole('button', { name: /سامح/ }).click();
  const small = await page.$$eval('button, input, a[href]', (els) =>
    els
      .map((el) => ({ t: el.textContent, ...el.getBoundingClientRect().toJSON() }))
      .filter((b) => b.width < 56 || b.height < 56),
  );
  expect(small).toEqual([]);
});
