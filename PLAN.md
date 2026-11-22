# Omda Sales Assistant: Technical Project Plan

| Field | Value |
|---|---|
| Project | Omda Sales Assistant (`omda-sales`) |
| Client | Al Omda Decor Supplies Showroom (معرض العمدة لمستلزمات الديكور), Asyut, Egypt |
| Product Owner | Hatem El Shiekh |
| Document type | Technical project plan / implementation spec (PRD + TDD) |
| Version | 1.0 (2026-11-22) |
| Status | Approved for Phase 1 |
| Audience | Engineering team (Claude Code as primary implementer) |
| Reference | `PLAN.ar.md` (Arabic source of this plan, same scope) |

> **How to use this document.** This is the single source of truth for scope, UX and architecture. Work is delivered phase by phase (Section 15). Each phase has an explicit Definition of Done (DoD). Do not start the next phase until the PO signs off the current one. Anything not specified here is **out of scope** until the PO approves it.

---

## Table of Contents
1. Executive Summary
2. Business Context
3. Goals, Non-Goals and Success Metrics
4. Users and Personas
5. Product Principles (UX Guardrails)
6. Scope (MVP vs Backlog)
7. Information Architecture and Routes
8. Design System
9. Functional Requirements (per screen)
10. System Architecture
11. Data Model and Security (Supabase)
12. Backend Services (Edge Functions and API contracts)
13. Domain Logic: Quantity Calculator
14. Domain Logic: Search
15. Delivery Plan (Phases, DoD)
16. Non-Functional Requirements
17. Testing Strategy
18. Environments, CI/CD and Release
19. Risk Register
20. Open Questions and Dependencies
21. Glossary
22. Appendix: UI copy (Arabic strings)

---

## 1. Executive Summary

An internal, Arabic-first (RTL) **Progressive Web App** used by showroom sales reps on a **counter PC** and **iPad**. Its core job is to let a rep type a product name and instantly see that product's **specs, use cases, customer-facing benefits and installation/complements** in a very simple, low-cognitive-load UI. Price and stock are secondary metadata.

Two secondary workflows hang off the product page:
- **Quantity Calculator** (area/linear take-off with waste factor).
- **Lead Capture** (lightweight CRM with an auto-generated follow-up cadence).

An **AI assistant** (Claude via a server-side Edge Function, tool-grounded, no hallucinated numbers) handles free-text questions.

MVP dataset: **100 curated SKUs** (`data/demo_products_100.json`). The full catalog (1,811 SKUs from Edara ERP) is staged for later. **Edara ERP API integration is Phase 9** (post-launch); the MVP ingests Edara data through a manual **Excel import**.

---

## 2. Business Context

| Item | Detail |
|---|---|
| Sales team | 15 new hires + 1 sales manager |
| Customer segments | Interior/decor engineers (~25% of revenue, special pricing + bonus) and walk-in direct customers |
| Source system | **Edara ERP** (cloud, `my.edara.io`), REST API with Bearer token: https://docs-dev.edara.io |
| Warehouses | `nemis_main` (Nemis main warehouse), `nemis_shop` (Nemis shop), `asyut_new` (New Asyut), `moalemin` (Moalemin), `car_direct` (direct-sales van) |
| Catalog snapshot | 1,811 SKUs, total stock value 2,161,801 (Edara stock report, 2026-11-20) |
| Product categories | WPC wall panels, marble alternative (PVC/SPC sheets), stone alternative, flooring, boards, chipboard, stainless/decor strips, cornices, insulation, lighting, and more |
| Users' digital literacy | **Very low.** This is the #1 design constraint. |
| Locale | Egyptian Arabic, RTL, Western digits (0-9) to match Edara codes |

**Problem statement:** New reps cannot answer product questions (what is it, where does it work, how is it installed, how much does the customer need) quickly or consistently. This leads to lost deals, wrong quantities and no follow-up on walk-ins.

---

## 3. Goals, Non-Goals and Success Metrics

### 3.1 Goals
- G1: A rep can reach a product's specs in **≤ 20 seconds** from a cold start, with no training.
- G2: Quantity estimates are **deterministic and correct** (no AI math).
- G3: Every interested walk-in is captured with a phone number and a follow-up plan.
- G4: The manager can refresh price/stock from Edara without engineering help.

### 3.2 Non-Goals (MVP)
- Invoicing, quotations/PDF quotes, orders, delivery, payments.
- Product image management UI.
- Reports, tables and analytics dashboards for the manager (beyond 3 KPI cards).
- Push notifications, multi-language, dark mode.
- Writing back to Edara (the system is **read-only** against Edara, forever).

### 3.3 Success Metrics (KPIs)
| Metric | Target | Source |
|---|---|---|
| Time-to-spec (search → spec visible) | p50 ≤ 10s, p90 ≤ 20s | Playwright + usability test |
| Search zero-result rate | < 10% | `search_logs` |
| Leads captured / week | Baseline in week 1, +20% by week 4 | `customers`, `interests` |
| Assistant helpfulness (👍 rate) | ≥ 80% | `assistant_logs.helpful` |
| Assistant eval pass rate | ≥ 90%, 0 hallucinated prices/stock | `tests/assistant_eval.json` |
| Unaided task completion (UAT) | 3/3 reps | Phase 8 UAT |

---

## 4. Users and Personas

| Persona | Device | Needs | Constraints |
|---|---|---|---|
| **Sales Rep** (x15) | Shared counter PC (1366×768), iPad (1024×768) | Find product, read specs to customer, calculate quantity, register lead | Weak mouse/keyboard skills, standing with a customer, shared device |
| **Sales Manager** (x1) | PC | See 3 KPIs, upload Edara Excel, manage staff and PINs, approve specs | Not technical |
| **Product Owner** (Hatem) | Remote (outside Egypt) | Approve design, review AI evals, own roadmap | Cannot do on-site observation |

---

## 5. Product Principles (UX Guardrails)

These are **hard constraints**. A PR that violates them is rejected.

1. **One screen = one job** (max two). No dashboards, no data tables, no sidebars for reps.
2. **Tap targets ≥ 56px** for anything interactive; **64px** for primary actions; **≥ 12px** spacing between targets.
3. **Typography:** body 20px, titles ≥ 28px, nothing below 16px.
4. **Microcopy:** Egyptian Arabic, buttons = verb phrase of max 2 words.
5. **Specs are the hero.** Price and stock render as 16px muted metadata.
6. **No AI-generated numbers.** Prices and stock come from the DB, quantities from `calc.ts`. The LLM is tool-calling only.
7. **Max depth of 2 taps** from Search to any screen; every non-root screen has a large Back button (top-right in RTL).
8. **Visible system status:** every write shows a 2-second success toast.
9. **No unilateral design decisions.** Anything not specified here must go to the PO with at most 2 options.

---

## 6. Scope

### 6.1 MVP (In scope)
| ID | Epic | Feature |
|---|---|---|
| E1 | Auth | Staff picker + 4-digit PIN, lockout, idle logout |
| E2 | Discovery | Single search box with fuzzy Arabic matching + category shortcuts |
| E3 | Product | Product detail page with 4 progressive-disclosure tabs |
| E4 | Calculator | Wall / floor / linear quantity take-off |
| E5 | CRM-lite | Lead capture + auto follow-up schedule + phone dedupe |
| E6 | AI Assistant | Grounded Q&A with product cards |
| E7 | Manager | 3 KPI cards, Edara Excel import, staff admin, spec review |
| E8 | Platform | PWA, offline catalog cache, Netlify deploy on `sales.omdadecor.com` |

### 6.2 Backlog (Out of MVP scope)
- "My follow-ups" screen for reps (data model ships in MVP; UI pending PO design approval).
- Product images upload UI.
- Per-warehouse stock view (default: total only, see Open Questions).
- Edara API sync (Phase 9).
- Full 1,811 SKU catalog with server-side search.

---

## 7. Information Architecture and Routes

```
/login                      Staff picker + PIN pad            (public)
/                           Search (home)                     (rep, manager)
/p/:id                      Product detail                    (rep, manager)
/p/:id/calc                 Quantity calculator               (rep, manager)
/p/:id/lead                 Lead capture                      (rep, manager)
/ask                        AI assistant                      (rep, manager)
/manager                    KPI cards + actions               (manager)
/manager/import             Edara Excel import                (manager)
/manager/staff              Staff admin                       (manager)
/manager/specs              Spec review queue                 (manager)
/_kit                       Component gallery                 (dev only, not linked)
```

Navigation model: **hub-and-spoke** around Search. No global nav bar beyond the TopBar. Route guards: unauthenticated → `/login`; non-manager on `/manager/*` → `/`.

---

## 8. Design System

### 8.1 Visual direction
- **Edara-inspired** (familiar to the team), but simplified:
  - Thin dark charcoal top bar.
  - Soft light-grey canvas with white cards (rounded corners, very subtle shadow).
  - Edara blue as the primary color.
  - Form fields use Edara's pattern: small muted label above, large value below, 1px underline.
- Primary button: solid blue, white text. Secondary: white with grey border, blue text.
- Generous whitespace, outline icons, light theme only.

### 8.2 Design tokens (`src/styles/tokens.css`)
```css
:root {
  /* Color */
  --bg: #F2F4F7;
  --surface: #FFFFFF;
  --surface-soft: #F7F8FA;
  --topbar: #2B2D31;
  --ink: #1F2937;
  --muted: #6B7280;
  --line: #E5E7EB;
  --primary: #1E7FD8;
  --primary-ink: #FFFFFF;
  --primary-soft: #E8F2FC;
  --success: #1A9E6A; --success-soft: #E6F6EF;
  --warning: #B7791F; --warning-soft: #FDF3E1;
  --danger:  #C53030; --danger-soft:  #FDECEC;
  /* Type */
  --font: "IBM Plex Sans Arabic", "Tajawal", system-ui, sans-serif;
  --fs-body: 20px; --fs-small: 16px; --fs-title: 28px; --fs-hero: 36px;
  /* Shape */
  --radius: 14px; --radius-lg: 20px;
  --shadow: 0 1px 2px rgba(16,24,40,.06), 0 4px 12px rgba(16,24,40,.06);
  --tap: 64px;
  --tap-min: 56px;
}
```
- Font: IBM Plex Sans Arabic (400/500/600) via Google Fonts, fallback Tajawal. Self-host in Phase 8 for offline PWA.
- Icons: `lucide-react`, stroke 1.75, 28px on detail tabs, 24px elsewhere.
- Tokens are mapped into `tailwind.config.ts` (`theme.extend.colors`, `fontSize`, `spacing`, `borderRadius`). No hard-coded hex values in components.
- `dir="rtl"` and `lang="ar"` on `<html>`. Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`).

### 8.3 Component library (`src/components/`)
| Component | Spec |
|---|---|
| `TopBar` | 56px, `--topbar` bg. Start (right): app name. End (left): rep name + Logout. |
| `BackButton` | 56×56, arrow + label "رجوع", top-right on every non-root screen. |
| `BigButton` | 64px height, full width, `variant: 'primary' \| 'secondary'`, `loading` state. |
| `Field` | Muted 16px label + 24px input + underline. Props: `label`, `inputMode`, `error`. |
| `NumPad` | 3×4 grid, 72×72 keys (0-9, backspace, clear/decimal). Used for PIN and dimensions on touch devices. |
| `Toast` | Bottom-center, 2s auto-dismiss, `success \| error`. |
| `DraftBadge` | Amber pill: "مواصفات عامة تحت المراجعة" when `specs_status = 'draft_general_by_type'`. |
| `DetailTabs` | 2×2 grid of 160px tiles, single-open accordion behaviour. |

**Phase 1 gate:** all components rendered on `/_kit` and approved by the PO **before** any screen is built.

---

## 9. Functional Requirements

Notation: `FR-<epic>-<n>`. Each FR has acceptance criteria (AC) written as testable statements.

### 9.1 E1: Authentication (`/login`)
| ID | Requirement |
|---|---|
| FR-1-1 | Show a grid of active staff cards (140×140): avatar initial (or photo when available) + display name. Source: `staff-list` Edge Function (id + name only). |
| FR-1-2 | Tapping a card reveals 4 PIN dots + `NumPad`. Submission is **auto-triggered** on the 4th digit (no confirm button). |
| FR-1-3 | Wrong PIN: shake animation + error copy. After **5 consecutive failures**, lock the account for **10 minutes**. |
| FR-1-4 | Role-based redirect: `manager` → `/manager`, `sales` → `/`. |
| FR-1-5 | **Idle timeout:** 30 minutes without pointer/keyboard/touch events → `signOut()` → `/login` (shared-device hygiene). |

**AC:** correct PIN logs in; wrong PIN shows error; 6th attempt within the lock window is rejected server-side; idle logout verified with a 1-minute timeout in dev.

### 9.2 E2: Search (`/`)
| ID | Requirement |
|---|---|
| FR-2-1 | Single search input, 72px height, max-width 720px, autofocus, placeholder "اكتب اسم المنتج… مثلاً بديل رخام". |
| FR-2-2 | **Search-as-you-type**, 150ms debounce, max 8 result rows (72px each). |
| FR-2-3 | Empty state (no query): 6 category tiles (WPC, marble alt, stone alt, flooring, boards, stainless). Tap = prefill query. |
| FR-2-4 | Helper link under the input: "مش لاقي اللي بتدوّر عليه؟ اسأل المساعد" → `/ask`. |
| FR-2-5 | Zero-result state with the same assistant link. |
| FR-2-6 | Typo-tolerant Arabic matching per Section 14. Supports item code / Edara row lookup. |
| FR-2-7 | Every query is logged to `search_logs` (query, result count, opened product). |

**AC:** search tests in Section 14.4 pass; results render < 100ms on 100 SKUs.

### 9.3 E3: Product detail (`/p/:id`)
| ID | Requirement |
|---|---|
| FR-3-1 | Header: product name (28px/600). Metadata line (16px, muted): `السعر: 450 ج.م · الرصيد: 24`. Null price → "السعر: يتأكد من الكاشير". |
| FR-3-2 | Engineer price shown **only** if `staff.can_see_engineer_price = true` (enforced by DB view, not by the client). |
| FR-3-3 | `DraftBadge` when specs are draft. |
| FR-3-4 | `DetailTabs` with 4 tiles: **Size & material** (ruler icon), **Where it fits** (home icon), **Pitch to customer** (message/star icon), **Install & complements** (wrench icon). First tab open by default; single-open behaviour; active tile uses `--primary-soft`. |
| FR-3-5 | Tab content: |
| | a) *Size & material:* key/value rows from `facts` (parsed from the product name: width, length, color, code) followed by spec bullets. |
| | b) *Where it fits:* "Works in" list (green ✓) and "Does not work in" list (red ✗). |
| | c) *Pitch to customer:* 3 benefit statements, 22px, one card each, so the rep can read them aloud. |
| | d) *Install & complements:* install steps + "Needs:" complement list; complements that exist as products are deep links. |
| FR-3-6 | Spec resolution: product-level override fields win; otherwise fall back to `spec_templates[spec_type]`. |
| FR-3-7 | Footer: two secondary buttons side by side: "احسب كمية" (hidden if `calc_mode IS NULL`) and "سجّل عميل مهتم". |

### 9.4 E4: Quantity calculator (`/p/:id/calc`)
| ID | Requirement |
|---|---|
| FR-4-1 | Surface selector (3 large toggles): Wall / Floor-or-ceiling / Linear. Default from `calc_mode`. |
| FR-4-2 | Inputs (meters, `NumPad` on touch): Wall = length + height + "+ door" / "+ window" counters (deduct 1.89 m² and 1.44 m²). Floor = length + width. Linear = linear meters. |
| FR-4-3 | Unit dimensions auto-filled from the product (`unit_width_cm`, `unit_length_cm`, `box_area_m2`, `piece_length_m`, `pieces_per_box`); summary line with an "Edit" toggle. |
| FR-4-4 | Waste % defaults to `products.waste_pct` (10), editable inline. |
| FR-4-5 | **Live result card:** 48px quantity + unit label; net area, gross area and estimated total (if price exists) below it. |
| FR-4-6 | Stock check: if `required > stock_total`, show an amber warning with the shortfall. |
| FR-4-7 | CTA "سجّل عميل مهتم بالكمية دي" → lead screen with the calc summary prefilled into `note`. |
| FR-4-8 | All math in a **pure function** `src/lib/calc.ts`, ported 1:1 from `data/calc.reference.js`. 100% unit-test coverage. |

### 9.5 E5: Lead capture (`/p/:id/lead`)
| ID | Requirement |
|---|---|
| FR-5-1 | Three fields: name (text), mobile (`NumPad`, validation regex `^01[0125][0-9]{8}$`), type (2 toggles: direct / engineer). Optional collapsed `note`. |
| FR-5-2 | Save → toast "اتسجل ✓" → navigate back to the product. |
| FR-5-3 | **Dedupe by phone** (`customers.phone UNIQUE`). If it exists, attach a new `interest` to the existing customer and show the "already registered" message. |
| FR-5-4 | On save, create 4 `follow_ups` rows for the current rep: D+0, D+3, D+7, D+30, using the templates in Appendix 22. Generated server-side (RPC `create_lead`) in **one transaction**. |

### 9.6 E6: AI assistant (`/ask`)
| ID | Requirement |
|---|---|
| FR-6-1 | Textarea + primary "اسأل" button; 3 suggested-question chips. |
| FR-6-2 | Answer card: ≤ 6 short lines in Egyptian Arabic + **product cards rendered from returned `product_ids` via DB lookup** (never from LLM text). |
| FR-6-3 | Feedback 👍/👎 persisted to `assistant_logs.helpful`. |
| FR-6-4 | Single-turn session (no history). "New question" clears state. |
| FR-6-5 | Rate limit: 30 requests / rep / hour (HTTP 429 + friendly copy). |

### 9.7 E7: Manager
| ID | Requirement |
|---|---|
| FR-7-1 | `/manager`: 3 KPI cards: *Leads this week*, *Overdue follow-ups*, *Most searched product (7d)*. One primary CTA: "Update prices & stock from Edara". Two secondary: Staff, Spec review. |
| FR-7-2 | `/manager/import`: file picker (.xlsx/.csv) → **dry run** summary ("96 matched, 4 unmatched") → "Confirm" applies the change. Logged in `imports`. |
| FR-7-3 | `/manager/staff`: list with "Reset PIN" and "Deactivate"; "Add rep" form (name, 4-digit PIN, engineer-price permission). |
| FR-7-4 | `/manager/specs`: queue of draft products; edit the 4 sections (one bullet per line) + calc fields; "Approve" sets `specs_status = 'approved'`. |

---

## 10. System Architecture

### 10.1 High-level diagram
```
 ┌───────────────────────────┐        HTTPS         ┌──────────────────────────────────────┐
 │  PWA (React SPA)          │ ───────────────────► │  Supabase                            │
 │  Netlify CDN              │   supabase-js (JWT)  │  ├─ Postgres 15 (+pg_trgm, RLS)      │
 │  sales.omdadecor.com      │                      │  ├─ Auth (email/password, internal)  │
 │  Service Worker (Workbox) │ ◄─────────────────── │  ├─ Edge Functions (Deno)            │
 │  IndexedDB/Query cache    │                      │  │   ├─ staff-list   (public)         │
 └───────────────────────────┘                      │  │   ├─ pin-login    (public)         │
                                                    │  │   ├─ ask          (auth)  ──► Claude API
                                                    │  │   └─ import-edara (manager)        │
                                                    │  └─ Secrets: ANTHROPIC_API_KEY,       │
                                                    │      CLAUDE_MODEL, PIN_PEPPER         │
                                                    └──────────────────────────────────────┘
                                                                  ▲  Phase 9 (read-only, cron 15 min)
                                                                  │
                                                          Edara ERP REST API
```

### 10.2 Tech stack
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Vite + React 18 + TypeScript (strict)** | Lightweight SPA, fast builds, static hosting |
| Styling | **Tailwind CSS 3** + CSS custom properties | Token-driven, consistent spacing/sizing |
| Routing | React Router 6 (data routers) | Route guards via loaders |
| Server state | TanStack Query 5 + `supabase-js` v2 | Caching, retries, offline persistence |
| PWA | `vite-plugin-pwa` (Workbox) | Installable on iPad, offline catalog |
| Icons | `lucide-react` | Outline style matches Edara |
| Excel parsing | `xlsx` (SheetJS) | Client-side parse for dry run |
| Backend | **Supabase** (Postgres, Auth, Edge Functions, Storage) | Managed BaaS, RLS, low ops |
| LLM | **Anthropic Claude API** (Haiku-class model, configurable) | Tool use, low cost, server-side only |
| Hosting | **Netlify** (deploy previews per PR) | Simple CI/CD, custom domain + TLS |
| Testing | Vitest + Testing Library, Playwright | Unit + E2E |
| Lint/format | ESLint (typescript-eslint), Prettier | |

### 10.3 Repository structure
```
omda-sales/
├─ PLAN.md  PLAN.ar.md  CLAUDE.md  README.md
├─ data/                          # seed data (provided)
│  ├─ demo_products_100.json
│  ├─ spec_templates_by_type.json
│  ├─ edara_stock_2026-11-20.csv
│  └─ calc.reference.js
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/0001_init.sql
│  ├─ seed/seed.ts
│  └─ functions/
│     ├─ _shared/ (cors.ts, auth.ts, normalize.ts, calc.ts)
│     ├─ staff-list/index.ts
│     ├─ pin-login/index.ts
│     ├─ ask/index.ts
│     └─ import-edara/index.ts
├─ src/
│  ├─ main.tsx  App.tsx  routes.tsx
│  ├─ styles/ tokens.css index.css
│  ├─ lib/ supabase.ts calc.ts search.ts normalize.ts followups.ts
│  ├─ components/ TopBar BackButton BigButton Field NumPad Toast DraftBadge DetailTabs
│  ├─ screens/ Login Search Product Calc Lead Ask manager/{Home,Import,Staff,Specs}
│  └─ hooks/ useSession useIdleLogout useProducts
└─ tests/ unit/*.test.ts  e2e/*.spec.ts  assistant_eval.json
```
`calc.ts` and `normalize.ts` are **shared** between the client and Edge Functions (single implementation, symlinked or copied by a build script; covered by the same tests).

### 10.4 Configuration and secrets
| Variable | Scope | Store |
|---|---|---|
| `VITE_SUPABASE_URL` | Public | Netlify env |
| `VITE_SUPABASE_ANON_KEY` | Public | Netlify env |
| `ANTHROPIC_API_KEY` | **Secret** | Supabase Edge Function secrets |
| `CLAUDE_MODEL` | Config | Supabase secrets (default: cheapest available Haiku model) |
| `PIN_PEPPER` | **Secret** | Supabase secrets |
| `EDARA_API_TOKEN` (Phase 9) | **Secret** | Supabase secrets |

No secret ever lands in the repo, in client bundles or in chat. `.env*` is git-ignored except `.env.example`.

---

## 11. Data Model and Security (Supabase)

### 11.1 ERD (logical)
```
warehouses 1─* stock *─1 products *─1 spec_templates
products 1─* interests *─1 customers
interests 1─* follow_ups
staff (1:1 auth.users) 1─* customers(owner) / interests / follow_ups / assistant_logs / search_logs / imports
staff_secrets 1:1 staff (service-role only)
```

### 11.2 DDL (`supabase/migrations/0001_init.sql`)
```sql
create extension if not exists pg_trgm;

create table warehouses (
  id text primary key,
  name_ar text not null
);

create table spec_templates (
  type text primary key,
  label_ar text not null,
  calc_mode text check (calc_mode in ('panel','sheet','box','tile','linear')),
  size_material_colors text[] not null default '{}',
  use_yes text[] not null default '{}',
  use_no text[] not null default '{}',
  say_to_customer text[] not null default '{}',
  install_and_complements text[] not null default '{}'
);

create table products (
  id uuid primary key default gen_random_uuid(),
  edara_row_no int,
  edara_item_code text unique,
  name text not null,
  category_ar text not null,
  spec_type text references spec_templates(type),
  search_text text not null,
  price numeric(12,2),
  engineer_price numeric(12,2),
  unit_label text,
  calc_mode text check (calc_mode in ('panel','sheet','box','tile','linear')),
  unit_width_cm numeric, unit_length_cm numeric,
  box_area_m2 numeric, pieces_per_box int, piece_length_m numeric,
  waste_pct numeric not null default 10,
  facts jsonb not null default '{}',
  size_material_colors text[], use_yes text[], use_no text[],
  say_to_customer text[], install_and_complements text[],
  complement_product_ids uuid[] not null default '{}',
  image_url text,
  specs_status text not null default 'draft_general_by_type'
    check (specs_status in ('draft_general_by_type','approved')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index products_search_trgm on products using gin (search_text gin_trgm_ops);

create table stock (
  product_id uuid references products(id) on delete cascade,
  warehouse_id text references warehouses(id),
  qty numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);
create view product_stock_total as
  select product_id, sum(qty) as total from stock group by product_id;

create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'sales' check (role in ('sales','manager')),
  pin_hash text not null,
  can_see_engineer_price boolean not null default false,
  is_active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

create table staff_secrets (           -- service_role only, no RLS policies
  staff_id uuid primary key references staff(id) on delete cascade,
  internal_password_enc text not null
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^01[0125][0-9]{8}$'),
  type text not null check (type in ('direct','engineer')),
  owner_staff_id uuid references staff(id),
  created_at timestamptz not null default now()
);

create table interests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  product_id uuid references products(id),
  staff_id uuid references staff(id),
  note text,
  created_at timestamptz not null default now()
);

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  interest_id uuid references interests(id) on delete cascade,
  staff_id uuid references staff(id),
  due_date date not null,
  step int not null check (step in (0,3,7,30)),
  message text not null,
  done_at timestamptz
);
create index follow_ups_due on follow_ups (staff_id, due_date) where done_at is null;

create table assistant_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id),
  question text not null,
  answer text,
  product_ids uuid[] default '{}',
  tool_calls jsonb,
  latency_ms int, input_tokens int, output_tokens int,
  helpful boolean,
  created_at timestamptz not null default now()
);

create table search_logs (
  id bigserial primary key,
  staff_id uuid references staff(id),
  query text not null,
  results_count int,
  opened_product_id uuid,
  created_at timestamptz not null default now()
);

create table imports (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id),
  file_name text,
  rows_read int, rows_matched int, rows_unmatched int,
  unmatched_sample jsonb,
  created_at timestamptz not null default now()
);
```

### 11.3 Row Level Security (RLS) matrix
RLS **enabled on every table**. Helper SQL functions: `is_manager()` and `current_staff()` (security definer).

| Table | Rep (sales) | Manager | anon |
|---|---|---|---|
| `products`, `stock`, `spec_templates`, `warehouses` | SELECT | SELECT, INSERT, UPDATE | none |
| `products.engineer_price` | via `products_for_staff` view only (NULL unless permitted) | full | none |
| `customers` | SELECT/INSERT where `owner_staff_id = auth.uid()` | ALL | none |
| `interests`, `follow_ups` | SELECT/INSERT/UPDATE where `staff_id = auth.uid()` | ALL | none |
| `staff` | SELECT own row (excluding `pin_hash`) | ALL (via RPC, never exposes `pin_hash`) | none |
| `staff_secrets` | none | none | none (service_role only) |
| `assistant_logs`, `search_logs` | INSERT own; UPDATE `helpful` on own row | SELECT | none |
| `imports` | none | SELECT, INSERT | none |

- The client reads products **only** through `products_for_staff` (a `security_invoker` view that masks `engineer_price`).
- Phone dedupe across reps runs through RPC `create_lead(...)` (security definer), so a rep never needs SELECT on other reps' customers.

### 11.4 Auth flow: PIN login (sequence)
Supabase Auth has no native PIN factor. We wrap it:

```
Client                         Edge: pin-login                    Postgres / Auth
  │ POST {staff_id, pin}  ───►  │ load staff (service role)        │
  │                             │ if locked_until > now → 423      │
  │                             │ bcrypt.compare(pin+PEPPER, hash) │
  │                             │ fail → failed_attempts++ ;       │
  │                             │        ≥5 → locked_until=now+10m │
  │                             │        → 401                     │
  │                             │ ok → reset counters              │
  │                             │ decrypt internal password        │
  │                             │ auth.signInWithPassword(         │
  │                             │   staff-<uuid>@omdadecor.local)  │
  │ ◄── {access_token, refresh_token, role}                       │
  │ supabase.auth.setSession(...)                                  │
```
- PIN hash: `bcrypt(pin + PIN_PEPPER, cost=10)`.
- Internal password: 32+ random bytes, encrypted at rest (AES-GCM with a key derived from `PIN_PEPPER`), never returned to the client.
- Brute-force controls: per-account lockout (5/10 min) + per-IP rate limit on the function (20 req/min).
- JWT lifetime: Supabase default; client-side idle logout at 30 min.

---

## 12. Backend Services (Edge Functions and API contracts)

All functions are Deno/TypeScript, share `_shared/cors.ts` and `_shared/auth.ts`, and return `application/json` with a `{ error: { code, message_ar } }` envelope on failure.

### 12.1 `GET /functions/v1/staff-list` (public)
```json
200 [{ "id": "uuid", "display_name": "string", "avatar_url": "string|null" }]
```
Only `is_active = true`. No role and no PIN data.

### 12.2 `POST /functions/v1/pin-login` (public, rate-limited)
```json
req  { "staff_id": "uuid", "pin": "1234" }
200  { "access_token": "...", "refresh_token": "...", "role": "sales|manager" }
401  { "error": { "code": "BAD_PIN", "message_ar": "الرقم غلط، جرّب تاني", "attempts_left": 3 } }
423  { "error": { "code": "LOCKED", "message_ar": "استنى 10 دقايق أو كلّم المدير", "retry_at": "ISO" } }
```

### 12.3 `POST /functions/v1/ask` (authenticated)
```json
req  { "question": "string (≤ 500 chars)" }
200  { "answer_text": "string", "product_ids": ["uuid"], "log_id": "uuid" }
429  { "error": { "code": "RATE_LIMIT" } }
```
**LLM orchestration:**
- Model: `CLAUDE_MODEL`, `temperature: 0.2`, `max_tokens: 400`, max 4 tool-use iterations, 15s timeout.
- Tools (JSON Schema):
  - `search_products({ query: string, limit?: number ≤ 8 })` → `[{id, name, spec_type, facts, stock_total, price}]`
  - `get_product_details({ product_id: uuid })` → resolved specs + `specs_status`
  - `calculate_quantity({ product_id, mode, a, b?, doors?, windows? })` → output of the shared `calc.ts`
- **System prompt** (Arabic, verbatim in code):
```
انت مساعد مبيعات معرض العمدة لمستلزمات الديكور في أسيوط. بتساعد بائع واقف مع عميل.
- اتكلم بالعامية المصرية، وبحد أقصى 6 سطور قصيرة.
- أي معلومة عن منتج لازم تجيبها من الأدوات. ما تذكرش منتج مش راجع من search_products.
- أي حساب كميات لازم يتم بـ calculate_quantity. ممنوع تحسب بنفسك.
- ما تكتبش سعر أو رصيد غير اللي راجع من الأدوات. لو السعر null قول "السعر يتأكد من الكاشير".
- لو المواصفات حالتها draft_general_by_type قول إنها "مواصفات عامة للنوع".
- لو المعلومة مش موجودة قول: "المعلومة دي مش متسجلة عندي، اسأل المدير".
- رشّح منتجين أو تلاتة بالكتير، واذكر سبب كل ترشيح في جملة.
```
- **Guardrails (defense in depth):**
  1. `product_ids` = union of IDs returned by tool calls in this turn. The UI renders cards from the DB only.
  2. **Post-generation validator:** if the answer mentions a product name not in the tool results, or contains a number that matches no tool output, replace the answer with the fallback copy and flag the log row.
  3. Everything (question, tool calls, latency, tokens) is logged to `assistant_logs` for offline review.
- **Eval harness:** `tests/assistant_eval.json` with 30 cases `{question, must_include_product_ids[], must_not_include[], expects_calc?: bool}`; `npm run eval` produces a pass/fail report. Gate: ≥ 90% pass, **0** price/stock hallucinations.

### 12.4 `POST /functions/v1/import-edara` (manager)
```json
req  multipart/form-data { file, mode: "dry_run" | "apply" }
200  { "rows_read": 100, "matched": 96, "unmatched": 4,
       "unmatched_sample": [{ "row": 17, "name": "..." }],
       "changes": { "price": 40, "engineer_price": 12, "stock": 96 } }
```
**Pipeline:**
1. Parse (SheetJS) → header detection (Arabic column names from the Edara "Warehouse Balances" report).
2. Normalize names (`normalize.ts`).
3. Match priority: `edara_item_code` → exact normalized name → unmatched (no fuzzy auto-match, to avoid wrong updates).
4. Upsert `stock` per warehouse column; update `price` / `engineer_price` if those columns exist.
5. `apply` runs in a **single transaction** (all-or-nothing) and writes an `imports` audit row.
- **PDF input is not supported.** Edara's PDF export breaks Arabic text extraction (the lam-alef ligature extracts as alef+lam, and numbers bleed into names). A cleaned CSV fallback exists at `data/edara_stock_2026-11-20.csv`.

### 12.5 Postgres RPCs
| RPC | Purpose |
|---|---|
| `create_lead(p_name, p_phone, p_type, p_product_id, p_note)` | Upsert customer by phone, insert interest + 4 follow-ups, return `{customer_id, is_existing}`. Atomic. |
| `manager_kpis()` | Returns the 3 KPI values for `/manager`. |
| `staff_admin_upsert(...)` | Creates the auth user, staff row, hashed PIN and encrypted internal password (calls the Edge Function or runs as service role). |

---

## 13. Domain Logic: Quantity Calculator

### 13.1 Formulas
```
WALL   net_area   = L × H − doors × (0.9 × 2.1) − windows × (1.2 × 1.2)
FLOOR  net_area   = L × W
       gross_area = net_area × (1 + waste_pct / 100)

unit_area:
  panel | sheet | tile → (unit_width_cm / 100) × (unit_length_cm / 100)
  box                  → box_area_m2

units = ceil(gross_area / unit_area)
boxes = pieces_per_box > 1 ? ceil(units / pieces_per_box) : null

LINEAR pieces = ceil(L × (1 + waste_pct / 100) / piece_length_m)

total_price = (boxes ?? units ?? pieces) × price         (only when price is not null)
stock_ok    = required_units ≤ stock_total
```
- Display: areas rounded to 2 decimals; counts are integers.
- Validation: any required input ≤ 0 or missing → `{ ok: false, error: 'MISSING_INPUT' }` (UI copy: "اكتب المقاسات").
- Net area < 0 (openings exceed the wall) → `{ ok: false, error: 'OPENINGS_EXCEED_AREA' }`.
- Floating-point safety: compute with an epsilon (`ceil(x - 1e-9)`) to avoid `ceil(18.0000001) = 19`.

### 13.2 Golden test cases (`tests/unit/calc.test.ts`)
| # | Case | Input | Expected |
|---|---|---|---|
| 1 | WPC wall | 4 × 2.8, 1 door, panel 20×290 cm, waste 10% | net 9.31 m², gross 10.24 m², **18 panels** |
| 2 | Tile floor | 5 × 4, tile 60×60, 4/box, waste 5%, price 250/box | 21 m², **59 tiles = 15 boxes**, total 3,750 |
| 3 | Stainless strip | 18 m linear, piece 2.4 m, waste 5% | 18.9 m, **8 pieces** |
| 4 | Missing input | L = 0 | `MISSING_INPUT` |
| 5 | Low stock | required 18, stock 10 | `stock_ok = false`, shortfall 8 |

Coverage target: 100% lines/branches for `calc.ts`.

---

## 14. Domain Logic: Search

### 14.1 Normalization (`normalize.ts`, shared)
1. Lowercase Latin characters; Arabic-Indic digits (٠-٩) → ASCII digits.
2. Alef variants `أ إ آ` → `ا`; `ة` → `ه`; `ى` → `ي`.
3. Strip tashkeel (U+064B-U+0652) and tatweel (`ـ`).
4. Strip repeated punctuation / `+` noise from Edara names; collapse whitespace.

### 14.2 Indexing
`search_text = normalize(name) + ' ' + synonyms(spec_type)`. Synonym map (extensible JSON):
`استلس | ستانلس → استانلس`, `wpc → بديل خشب`, `مرمر → رخام`, `spc → بديل رخام`, ...

### 14.3 Ranking
1. Prefix match on the full name.
2. Whole-token match.
3. Substring match.
4. Trigram similarity (`similarity()` ≥ 0.25) as a tail.

Tie-breakers: `specs_status = 'approved'` first, then `stock_total > 0`.

**MVP implementation:** client-side over the cached 100 SKUs (sub-100ms, offline-capable). **Scale-out path (full catalog):** a Postgres function `search_products(q)` using `pg_trgm` + the GIN index, same ranking, behind the same `search.ts` interface.

### 14.4 Test cases
| Query | Must return |
|---|---|
| `استلس` | stainless items |
| `رخامه` | marble-alternative items |
| `بديل الخشب` | WPC wall panels |
| `8005` | the SKU whose name/code contains 8005 |
| `٢٠ سم` | items whose facts include 20 cm |

---

## 15. Delivery Plan (Phases and Definition of Done)

Cadence: each phase = 1-2 working sessions → Netlify deploy preview → PO review → sign-off. **Global DoD for every phase:** typecheck + lint clean, all tests green, deploy preview live, short changelog sent to the PO (what was built, what was tested, open questions).

| Phase | Scope | Key deliverables | Phase-specific DoD |
|---|---|---|---|
| **P1: Foundation & Design System** | Scaffold, tokens, components, `/_kit` | Vite/TS/Tailwind/Router/Query/PWA setup, ESLint/Prettier, CI | `/_kit` renders RTL, all targets ≥ 56px, IBM Plex Sans Arabic loaded, Edara-like look. **PO design sign-off is a hard gate.** |
| **P2: Data layer** | Migration, RLS, seed | `0001_init.sql`, `seed.ts`, `products_for_staff` view, RPC stubs | 100 products + 5 warehouses seeded; anon read of `products_for_staff` is denied; RLS tests pass |
| **P3: Auth** | `staff-list`, `pin-login`, `/login`, idle logout | Edge Functions + screen + hooks | Happy path, wrong PIN, lockout after 5, idle logout (1 min in dev) all covered by E2E |
| **P4: Search & Product** | `/`, `/p/:id`, `search.ts`, `normalize.ts` | Screens + unit tests | Search tests (14.4) pass; 4 tabs functional; draft badge visible; verified on 1024×768 |
| **P5: Calculator & Leads** | `/p/:id/calc`, `/p/:id/lead`, `create_lead` RPC | `calc.ts`, `followups.ts` | Golden cases (13.2) pass; 4 follow-ups created atomically; phone dedupe verified |
| **P6: AI Assistant** | `ask` function, `/ask`, eval harness | Tool definitions, validator, logs | Eval ≥ 90% pass, 0 hallucinated price/stock; rate limit verified |
| **P7: Manager** | `/manager/*`, `import-edara`, `manager_kpis` | Import dry-run/apply, staff admin, spec review | Importing an Excel built from `data/edara_stock_2026-11-20.csv` updates stock with a correct summary; transaction rollback on error tested |
| **P8: Launch** | Prod deploy, domain, PWA, docs | `sales.omdadecor.com`, HTTPS, install on iPad, 1-page rep guide + manager guide | **UAT:** 3 reps reach a product's specs in < 20s unaided |
| **P9: Edara sync (post-launch)** | Scheduled read-only sync | Cron Edge Function every 15 min, Bearer token (read-only API user) | Matches on `edara_item_code`; zero writes to Edara; failure alerting |

**Critical path:** P1 (design sign-off) → P2 → P3 → P4. P5 and P6 can run in parallel after P4. P7 depends on P2 and P5.

---

## 16. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | First load < 2s on 4G (LCP); JS bundle < 250 KB gzipped; search < 100ms; assistant p90 < 6s |
| Availability | Supabase Pro + Netlify; no SLA beyond the vendors'; graceful offline mode for the catalog |
| Offline | Service worker caches the app shell + product catalog (stale-while-revalidate). Writes (leads) require connectivity, with a clear "no internet" message |
| Accessibility | WCAG 2.1 AA contrast (≥ 4.5:1), `aria-label` on icon buttons, full keyboard navigation, visible focus ring |
| Localization | Arabic only, RTL, Western digits, `Intl.NumberFormat('ar-EG', { numberingSystem: 'latn' })` |
| Security | RLS everywhere, secrets in Supabase only, PIN lockout + rate limit, CSP headers via `netlify.toml`, no PII in URLs or logs beyond phone numbers stored in `customers` |
| Privacy | Customer phone numbers are visible only to the owning rep and the manager |
| Observability | `assistant_logs`, `search_logs`, `imports` as product telemetry; Edge Function logs in Supabase; client errors to the console + (optional) Sentry in P8 |
| Data | Daily backups (Supabase Pro); migrations are forward-only and versioned |
| Browser support | Latest Chrome/Edge on Windows, Safari on iPadOS 16+ |

---

## 17. Testing Strategy

| Level | Tooling | Scope |
|---|---|---|
| Unit | Vitest | `calc.ts`, `normalize.ts`, `search.ts`, `followups.ts` (date math, timezone `Africa/Cairo`) |
| Component | Testing Library | `NumPad`, `DetailTabs`, `Field` validation |
| DB / RLS | SQL tests (pgTAP or scripted `supabase-js` with role JWTs) | Rep cannot read other reps' customers; anon is denied; `engineer_price` masking |
| E2E | Playwright @ 1366×768 and 1024×768 | (1) login → search "بديل رخام" → open product → "Pitch to customer"; (2) calc wall 4×2.8 + door → 18 panels; (3) lead → 4 follow-ups in DB; (4) 5 wrong PINs → lockout |
| LLM eval | `npm run eval` | 30-case golden set, regression on every prompt/model change |
| UAT | Manual, remote-moderated | 3 reps, task-based, time-on-task recorded |

---

## 18. Environments, CI/CD and Release

| Env | Frontend | Backend | Purpose |
|---|---|---|---|
| Local | `npm run dev` | `supabase start` (Docker) | Development |
| Preview | Netlify deploy preview per PR | Supabase staging project (or branch) | PO review per phase |
| Production | `sales.omdadecor.com` | Supabase production project | Live |

- **Git workflow:** trunk-based; `main` is protected; feature branches `p<phase>/<feature>`; Conventional Commits.
- **CI (GitHub Actions):** `typecheck → lint → unit → build`; E2E on preview URLs; migrations applied via `supabase db push` on merge (manual approval for prod).
- **Release:** tag per phase (`v0.<phase>.0`); changelog in the PR description.
- **Ownership:** GitHub org, Supabase, Netlify, Anthropic Console and the domain (Namecheap) are registered under the **showroom's** account, with the PO as admin.

---

## 19. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Users reject the UI (low digital literacy) | Med | High | P1 design gate, `/_kit` review, UAT in P8, strict UX guardrails |
| R2 | LLM hallucinates specs/prices | Med | High | Tool-only grounding, post-gen validator, DB-rendered cards, eval gate |
| R3 | Generic specs are inaccurate for a specific SKU | High | Med | `DraftBadge`, manager spec review queue, product-level overrides |
| R4 | Edara Excel format drifts | Med | Med | Header detection, dry-run summary, unmatched report, transactional apply |
| R5 | Missing unit dimensions → wrong quantities | Med | High | Visible unit-size line with Edit; defaults documented (Section 20); catalog sizes requested from the client |
| R6 | PIN brute force on a shared device | Low | Med | 5-try lockout, IP rate limit, idle logout |
| R7 | Supabase free tier pauses after 7 days of inactivity | High (if free) | High | Supabase Pro from production launch |
| R8 | Poor in-store connectivity | Med | Med | PWA offline catalog cache, lightweight bundle |
| R9 | PO is remote; no on-site observation | High | Med | Deploy previews, recorded UAT sessions, `search_logs` / `assistant_logs` telemetry |

---

## 20. Open Questions and Dependencies

| # | Item | Owner | Needed by | Default if unanswered |
|---|---|---|---|---|
| Q1 | Real staff names + photos | Client | P3 | Placeholder reps "بائع 1-3" + initials |
| Q2 | Edara **item master** export (code, price, engineer price) | Client | P7 | Match by normalized name; prices null |
| Q3 | Actual unit dimensions per product line (W×L×thickness) | Client | P5 | WPC: width-from-name × 290 cm; marble alt: 122×280; board/chipboard: 122×244; floor box: 2.2 m²; strips/cornice: length-from-name, else 2.4 m |
| Q4 | Show per-warehouse stock or total only? | PO | P4 | Total only |
| Q5 | "My follow-ups" screen design for reps | PO | Post-MVP | Not built |
| Q6 | Engineer pricing visibility rules | Client | P3 | Off by default, manager toggles per rep |

**Seed assumptions (`supabase/seed/seed.ts`):**
- `facts` = `facts_from_name`.
- `calc_mode` comes from the spec template.
- All products start as `specs_status = 'draft_general_by_type'`.
- Staff: 1 manager (Hatem, PIN set at setup) + 3 test reps.
- **Spec copy is generic per product type, written from general market knowledge, and pending client review. Do not invent additional technical figures.**

**Demo dataset mix (100 SKUs):** WPC 20, marble alt 18, stainless strips 17, boards 12, stone alt 10, flooring 5, chipboard 5, cornice 5, insulation 5, lighting 3.

---

## 21. Glossary

| Term | Meaning |
|---|---|
| SKU | Stock Keeping Unit, one Edara item |
| WPC | Wood-Plastic Composite wall panels (بديل الخشب) |
| SPC / PVC marble | Marble-alternative sheets (بديل الرخام) |
| Take-off | Quantity estimation from dimensions |
| Waste factor | Extra % added for cuts and breakage (هالك) |
| RLS | Row Level Security (Postgres) |
| Edge Function | Supabase serverless function (Deno) |
| Grounding | Constraining the LLM to answer only from tool/DB data |
| Dry run | Import preview with no writes |
| DoD | Definition of Done |
| PO | Product Owner |
| UAT | User Acceptance Testing |

---

## 22. Appendix: UI Copy (Arabic strings, use verbatim)

| Key | String |
|---|---|
| `login.title` | مين بيستخدم الجهاز؟ |
| `login.pin` | اكتب رقمك السري |
| `login.bad_pin` | الرقم غلط، جرّب تاني |
| `login.locked` | استنى 10 دقايق أو كلّم المدير |
| `search.title` | بتدوّر على إيه؟ |
| `search.placeholder` | اكتب اسم المنتج… مثلاً بديل رخام |
| `search.ask_link` | مش لاقي اللي بتدوّر عليه؟ اسأل المساعد |
| `search.empty` | مفيش منتج بالاسم ده. جرّب كلمة أقصر، أو اسأل المساعد |
| `product.price_unknown` | السعر: يتأكد من الكاشير |
| `product.draft` | مواصفات عامة للنوع، تحت مراجعة المعرض |
| `tabs.size` | المقاس والخامة |
| `tabs.where` | ينفع فين |
| `tabs.pitch` | قول للعميل |
| `tabs.install` | التركيب والمكملات |
| `cta.calc` | احسب كمية |
| `cta.lead` | سجّل عميل مهتم |
| `calc.missing` | اكتب المقاسات |
| `lead.saved` | اتسجل ✓ |
| `lead.existing` | العميل ده متسجل قبل كده، ضفنا المنتج ده لاهتماماته |
| `ask.fallback` | المعلومة دي مش متسجلة عندي، اسأل المدير |
| `followup.d0` | شكراً لزيارتك معرض العمدة، ده ملخص اللي اتفرجت عليه: {product} |
| `followup.d3` | حبيت أبعتلك صورة مشروع مشابه لـ {product} عشان تتخيل الشكل |
| `followup.d7` | أخبارك إيه؟ وصلت لقرار في {product}؟ لو فيه أي سؤال أنا موجود |
| `followup.d30` | عندنا جديد في {category} ممكن يعجبك، تحب أبعتلك؟ |
| `common.back` | رجوع |
| `common.logout` | خروج |

All strings live in `src/i18n/ar.ts` as a typed constant. No inline copy in components. No em dashes in any UI string.

---

## 23. Addendum: Sales Planning (Phase 10, PO request 2026-11-22)

> Status: **draft for PO sign-off.** Not part of the 25,000 EGP scope until the PO confirms. Builds on Phase 7 (manager area, Excel import).

### 23.1 Goal
A manager-only tool where the showroom enters its inventory, fixed costs and operating costs, and gets a **sales target** that accounts for **seasons**, **collection timing** (cash vs credit) and the **three customer segments**: engineers (مهندسين), craftsmen (صنايعية) and end customers (عميل نهائي). After 12 months of recorded sales it **recalibrates itself** from the real data, writes an **evaluation report**, and proposes the next year's target based on what was actually achieved.

Decisions taken (PO, 2026-11-22): lives **inside the Omda app** (`/manager/planning`); actual sales arrive as a **monthly Edara Excel** upload; first-year seasonality comes from **manager estimates**.

### 23.2 Inputs (manager enters once a year, edits any time)
| Input | Detail |
|---|---|
| Inventory | Pulled from the Edara stock import (qty per product per warehouse) × **cost price** per product (see Q11). Summarised per category. |
| Fixed costs | Monthly line items: rent, salaries, utilities, subscriptions, other. |
| Variable operating costs | % of sales: delivery, commissions, packaging, card fees. |
| Customer segments (x3) | For each: expected share of sales %, average discount %, bonus % (engineers), and a **collection profile**: % cash, % at 30 days, % at 60 days, % at 90 days. |
| Gross margin | Average margin % per category (before segment discounts). |
| Seasonality (year 1) | Manager rates each month 1-5 (ضعيف → قوي); normalised to monthly weights summing to 1. |
| Profit goal | Desired net profit for the year (EGP). |

### 23.3 Outputs (all deterministic, `src/lib/planning.ts`, 100% unit-tested like `calc.ts`)
- **Effective margin** per segment = category-weighted margin − discount − bonus; **blended margin** = Σ share × effective margin.
- **Annual sales target** = (annual fixed costs + profit goal) ÷ (blended margin − variable cost %). Refuse with a clear message if the denominator ≤ 0 (the plan cannot make a profit).
- **Break-even sales** = annual fixed costs ÷ (blended margin − variable cost %).
- **Monthly targets** = annual target × season weight; each split by segment and by category (category mix from the inventory / sales history).
- **Cash forecast**: each month's sales spread forward by every segment's collection profile → monthly cash-in vs monthly costs → months with a **cash gap** highlighted.
- **Inventory cover**: the cost of goods the target needs per category vs inventory at cost → months of cover, shortfall (buy) or overstock (slow stock).

### 23.4 Actuals and tracking (monthly)
- Manager uploads Edara's monthly **sales report** (Excel) like the stock import: dry run → confirm → stored per month, category and segment.
- Segment comes from the Edara customer type (see Q12). Unmapped customers go to "end customer" and are reported in the dry run.
- Dashboard: target vs achieved per month, segment and category; cumulative progress; cash collected vs forecast (once collection data exists, Q13).

### 23.5 Annual review ("trains itself" = recalibration on real data)
After 12 months of actuals (button enabled when 12 months exist; also re-runnable later):
1. **Recompute from data (formulas, not AI):** actual seasonality index per month, realised margin per segment and category, actual segment mix, actual collection days per segment (Q13), achieved vs target, category sell-through vs inventory.
2. **Next year's seasonality** = 70% actual + 30% previous weights in year 2, then the average of all recorded years.
3. **Next year's target** = max(new break-even-based target from the updated inputs, achieved × (1 + growth)), where growth defaults to 10% and is capped by a PO-set maximum. The manager can override, and the override is logged.
4. **Evaluation report (Arabic):** written by Claude from the computed metrics only (tool-grounded, same post-generation validator as 12.3: any number not present in the metrics voids the paragraph). Sections: what was achieved, gaps (weak season, late-paying segment, slow category), team and segment behaviour, recommendations, proposed target. If the AI assistant is not enabled, the report shows the same metrics as tables without the narrative.

### 23.6 Data model (new tables, manager-only RLS)
`planning_years(year, profit_goal, variable_cost_pct, growth_pct, growth_cap_pct, approved_at)`, `planning_fixed_costs(year, label, monthly_amount)`, `planning_segments(year, segment, share_pct, discount_pct, bonus_pct, cash_pct, d30_pct, d60_pct, d90_pct)`, `planning_seasons(year, month, rating, weight)`, `category_margins(year, category, margin_pct)`, `sales_actuals(month, category, segment, amount, cogs)`, `planning_reviews(year, metrics jsonb, report text, proposed_target, approved_target)`.

### 23.7 Phasing
| Sub-phase | Scope | DoD |
|---|---|---|
| 10a | Inputs screens + target, break-even, monthly split, cash forecast, inventory cover | Golden-case unit tests for every formula; manager can produce a full plan from scratch |
| 10b | Monthly Edara sales import + target vs achieved dashboard | Import from a real Edara sales export with dry run; numbers reconcile with Edara totals |
| 10c | Annual review: recalibration, AI evaluation report, next-year target | Review on a 12-month synthetic dataset reproduces the expected weights/target; report passes the number validator |

### 23.8 Open questions
| # | Item | Owner | Default if unanswered |
|---|---|---|---|
| Q10 | Are the 25% engineer bonus and the craftsman discount fixed rates or per deal? | Client | Fixed % per segment, editable |
| Q11 | Does Edara export **cost price** per item (needed for inventory value and COGS)? | Client | Use the stock report's total value split by quantity share |
| Q12 | Does Edara mark the **customer type** (engineer / craftsman / end customer) on invoices? | Client | Manager maps customers once; new ones default to end customer |
| Q13 | Can Edara export **collections / receivables** by customer (for real collection days)? | Client | Collection profile stays as entered; review flags it as unverified |
| Q14 | Is Sales Planning added to the proposal as a priced future phase? | PO | Listed under "خطط مستقبلية" without a price |
