# Omda Sales Assistant (`omda-sales`)

Internal Arabic-first (RTL) PWA for the Al Omda showroom sales team. See `PLAN.md` (source of truth) and `CLAUDE.md`.

## Status: Phase 1 (Foundation & Design System)

- Vite + React 18 + TypeScript (strict), Tailwind 3 mapped to `src/styles/tokens.css`
- React Router 6 (data router), TanStack Query 5, `vite-plugin-pwa`
- Components in `src/components/`; all copy in `src/i18n/ar.ts`
- Component gallery at `/_kit` (dev, and deploy previews via `VITE_ENABLE_KIT=true`)

## Database (Phase 2)

- Schema, RLS and helpers: `supabase/migrations/` (forward-only).
- Seed: `npm run seed:sql` regenerates `supabase/seed/seed.sql` from `data/` (idempotent upserts).
- RLS tests: `tests/db/rls.test.sql`. `npm run test:db` runs migrations + seed + RLS tests against a
  disposable Postgres (`DATABASE_URL`), using `tests/db/supabase_shim.sql` in place of the platform.
- Demo project: Supabase `Omdadecordatabase` (ap-northeast-1). Staff/auth users are seeded in Phase 3.

## Auth (Phase 3)

- Edge Functions: `supabase/functions/staff-list`, `supabase/functions/pin-login` (both `verify_jwt = false`).
- PIN check, lockout (5 tries / 10 min) and per-IP limit (20/min) run atomically in
  `public.pin_login_check()` (service_role only). The PIN pepper is generated inside Supabase Vault.
- New staff: `select private.create_staff('<name>', 'sales' | 'manager', '<4-digit PIN>');` as the
  database owner (SQL editor). Never commit real PINs.
- Local dev: copy `.env.example` to `.env.local` and fill the public URL + anon key.
- Idle logout: 30 min in production, 1 min in `npm run dev` (`VITE_IDLE_TIMEOUT_MS` overrides).

## Commands

```bash
npm install
npm run dev          # http://localhost:5173/_kit
npm run typecheck
npm run lint
npm run test         # Vitest unit + component tests
npm run e2e          # Playwright @ 1366x768 and 1024x768 against /_kit
npm run build
```
