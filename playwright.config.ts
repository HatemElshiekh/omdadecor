import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`, locale: 'ar-EG' },
  projects: [
    { name: 'counter-pc', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'ipad', use: { viewport: { width: 1024, height: 768 }, hasTouch: true } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
        port: PORT,
        reuseExistingServer: !process.env.CI,
        env: { VITE_ENABLE_KIT: 'true' },
        timeout: 120_000,
      },
});
