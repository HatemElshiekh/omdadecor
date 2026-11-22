// "/" Search (PLAN.md 9.2, FR-2-1..FR-2-7).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRouteLoaderData, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { BidiText } from '@/components';
import { ar } from '@/i18n/ar';
import type { Me } from '@/lib/auth';
import { CATEGORY_SHORTCUTS } from '@/lib/categories';
import { FEATURES } from '@/lib/features';
import { logOpened, logSearch, productsQuery } from '@/lib/products';
import { search } from '@/lib/search';

const DEBOUNCE_MS = 150; // FR-2-2
const LOG_IDLE_MS = 1000; // log a query once the rep stops typing

export function Search() {
  const me = useRouteLoaderData('app') as Me;
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const query = params.get('q') ?? '';
  const products = useQuery(productsQuery);
  const lastLog = useRef<{ q: string; id: Promise<number | null> } | null>(null);

  // Debounce typing into the ?q= param (so Back from a product restores the search).
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== query)
        setParams(text.trim() ? { q: text.trim() } : {}, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, query, setParams]);

  const results = useMemo(
    () => (query && products.data ? search(products.data, query) : []),
    [query, products.data],
  );

  // FR-2-7: log each settled query with its result count.
  useEffect(() => {
    if (!query || !products.data) return;
    const t = setTimeout(() => {
      lastLog.current = { q: query, id: logSearch(me.id, query, results.length) };
    }, LOG_IDLE_MS);
    return () => clearTimeout(t);
  }, [query, results.length, products.data, me.id]);

  // Attach the opened product to this query's log row (waiting for an in-flight insert),
  // or log it now if the rep opened a result before the query settled.
  const onOpen = (productId: string) => {
    const l = lastLog.current;
    if (l?.q === query) {
      void l.id.then((id) => (id ? logOpened(id, productId) : undefined));
    } else {
      lastLog.current = { q: query, id: logSearch(me.id, query, results.length, productId) };
    }
  };

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-8">
      <h1 className="text-center text-title font-semibold">{ar.search.title}</h1>

      <label className="relative block">
        <span className="sr-only">{ar.search.title}</span>
        <SearchIcon
          size={28}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          autoFocus
          enterKeyHint="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={ar.search.placeholder}
          className="h-[72px] w-full rounded-lg border border-line bg-surface pe-5 ps-16 text-input text-ink shadow-card outline-none placeholder:text-muted focus:border-primary"
        />
      </label>

      {FEATURES.ask && (
        <Link
          to="/ask"
          className="flex min-h-tap-min items-center justify-center text-body text-primary"
        >
          {ar.search.ask_link}
        </Link>
      )}

      {!query && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={ar.search.title}>
          {CATEGORY_SHORTCUTS.map(({ label, query: q, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setText(q)}
                className="flex h-[120px] w-full flex-col items-center justify-center gap-3 rounded-lg bg-surface px-3 text-center text-body font-medium shadow-card hover:bg-surface-soft"
              >
                <Icon size={28} strokeWidth={1.75} aria-hidden className="text-primary" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && products.data && results.length === 0 && (
        <p
          role="status"
          className="rounded-lg bg-surface p-6 text-center text-body text-muted shadow-card"
        >
          {ar.search.empty}
        </p>
      )}

      {results.length > 0 && (
        <ul
          className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-card"
          data-results
        >
          {results.map((p) => (
            <li key={p.id} className="border-b border-line last:border-b-0">
              <Link
                to={`/p/${p.id}`}
                onClick={() => onOpen(p.id)}
                className="flex h-[72px] items-center gap-3 px-5 hover:bg-surface-soft"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium">
                    <BidiText text={p.name} />
                  </span>
                  <span className="truncate text-small text-muted">{p.category_ar}</span>
                </span>
                <ChevronLeft
                  size={24}
                  strokeWidth={1.75}
                  aria-hidden
                  className="shrink-0 text-muted"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
