# CLAUDE.md: Omda Sales Assistant

Read `PLAN.md` in full before any work. It is the single source of truth for scope, UX and architecture. `PLAN.ar.md` is the Arabic reference of the same plan.

## Working agreement
- Implement **only** the phase the PO (Hatem) requests. Never start the next phase without sign-off.
- Do not add screens, features or buttons that are not in PLAN.md. If something looks missing, ask.
- Any design decision not covered by PLAN.md: stop and ask the PO, offering at most 2 options.
- UI is Egyptian Arabic, RTL. Body text 20px; every interactive element ≥ 56px.
- One screen = one job (max two). Users have very low digital literacy.
- Specs are the hero on the product page. Price and stock are small, muted metadata.
- Every price, stock figure or quantity must come from the DB or `calc.ts`. Never from LLM output.
- No secrets in code, client bundles or committed files. Secrets live in Supabase secrets only.
- Do not invent specs or technical figures. Generic specs come from `data/spec_templates_by_type.json`.
- No em dashes in any UI string or copy.
- All UI strings come from `src/i18n/ar.ts` (see PLAN.md Appendix 22).

## Commands
- `npm run dev` · `npm run typecheck` · `npm run lint` · `npm run test` · `npm run e2e` · `npm run eval` · `npm run build`
- `supabase start` · `supabase db push` · `npx tsx supabase/seed/seed.ts`

## Definition of Done (every phase)
1. Typecheck and lint clean; all tests green.
2. Netlify deploy preview live.
3. Short changelog to the PO: what was built, what was tested, open questions.
