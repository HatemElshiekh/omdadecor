#!/usr/bin/env bash
# Runs migration + seed + RLS tests against a throwaway Postgres database.
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
# Uses the Supabase shim, so it must NOT point at a real Supabase project.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a disposable Postgres database}"
cd "$(dirname "$0")/../.."
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c 'drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists extensions cascade; drop schema if exists private cascade; drop schema if exists vault cascade;'
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/supabase_shim.sql
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/seed/seed.sql
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/rls.test.sql 2>&1 | grep -E "ok -|FAIL|PASSED|ERROR"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/pin_login.test.sql 2>&1 | grep -E "ok -|FAIL|PASSED|ERROR"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/lead.test.sql 2>&1 | grep -E "ok -|FAIL|PASSED|ERROR"
