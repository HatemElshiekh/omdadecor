// /p/:id Product detail (PLAN.md 9.3, FR-3-1..FR-3-7). Specs are the hero.
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Home, MessageSquareQuote, Ruler, Wrench, XCircle } from 'lucide-react';
import {
  BackButton,
  BidiText,
  BigButton,
  DetailTabs,
  DraftBadge,
  type DetailTab,
} from '@/components';
import { ar } from '@/i18n/ar';
import { FEATURES } from '@/lib/features';
import { fmt, formatNumber } from '@/lib/format';
import { productsQuery, templatesQuery, type Product as P } from '@/lib/products';
import { resolveSpecs } from '@/lib/specs';

function Bullets({ items, tone }: { items: string[]; tone?: 'yes' | 'no' }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          {tone === 'yes' && (
            <CheckCircle2
              size={24}
              strokeWidth={1.75}
              aria-hidden
              className="mt-1 shrink-0 text-success"
            />
          )}
          {tone === 'no' && (
            <XCircle
              size={24}
              strokeWidth={1.75}
              aria-hidden
              className="mt-1 shrink-0 text-danger"
            />
          )}
          {!tone && <span aria-hidden className="mt-3 size-2 shrink-0 rounded-full bg-muted" />}
          <span>
            <BidiText text={t} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function MetaLine({ p }: { p: P }) {
  const price =
    p.price == null
      ? ar.product.price_unknown
      : fmt(ar.product.price, { price: formatNumber(p.price) });
  const parts = [price, fmt(ar.product.stock, { qty: formatNumber(p.stock_total) })];
  // FR-3-2: engineer_price is null unless the DB view allows this staff member to see it.
  if (p.engineer_price != null)
    parts.push(fmt(ar.product.engineer_price, { price: formatNumber(p.engineer_price) }));
  return (
    <p className="text-small text-muted" data-meta>
      {parts.join(' · ')}
    </p>
  );
}

export function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const products = useQuery(productsQuery);
  const templates = useQuery(templatesQuery);

  if (products.isPending) return <main className="mx-auto max-w-[960px] p-6" aria-busy />;
  const p = products.data?.find((x) => x.id === id);
  if (!p) return <Navigate to="/" replace />;

  const specs = resolveSpecs(p, p.spec_type ? templates.data?.[p.spec_type] : null);
  const complements = (p.complement_product_ids ?? [])
    .map((cid) => products.data?.find((x) => x.id === cid))
    .filter((x): x is P => Boolean(x));

  const tabs: DetailTab[] = [
    {
      id: 'size',
      label: ar.tabs.size,
      icon: Ruler,
      content: (
        <div className="flex flex-col gap-5">
          {Object.keys(p.facts).length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              {Object.entries(p.facts).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">
                    <BidiText text={v} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <Bullets items={specs.size_material_colors} />
        </div>
      ),
    },
    {
      id: 'where',
      label: ar.tabs.where,
      icon: Home,
      content: (
        <div className="flex flex-col gap-5">
          <Bullets items={specs.use_yes} tone="yes" />
          {specs.use_no.length > 0 && <Bullets items={specs.use_no} tone="no" />}
        </div>
      ),
    },
    {
      id: 'pitch',
      label: ar.tabs.pitch,
      icon: MessageSquareQuote,
      content: (
        <div className="flex flex-col gap-3">
          {specs.say_to_customer.slice(0, 3).map((t) => (
            <p key={t} className="rounded bg-surface-soft p-5 text-pitch font-medium">
              {t}
            </p>
          ))}
        </div>
      ),
    },
    {
      id: 'install',
      label: ar.tabs.install,
      icon: Wrench,
      content: (
        <div className="flex flex-col gap-5">
          <Bullets items={specs.install_and_complements} />
          {complements.length > 0 && (
            <ul className="flex flex-col gap-3">
              {complements.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/p/${c.id}`}
                    className="flex min-h-tap-min items-center rounded bg-primary-soft px-4 text-body font-medium text-primary"
                  >
                    <BidiText text={c.name} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ];

  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));
  const showCalc = FEATURES.calc && p.calc_mode != null;

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 p-6" data-screen="product">
      <div className="flex">
        <BackButton onClick={back} />
      </div>

      <header className="flex flex-col gap-3">
        <h1 className="text-title font-semibold">
          <BidiText text={p.name} />
        </h1>
        <MetaLine p={p} />
        {p.specs_status === 'draft_general_by_type' && (
          <div>
            <DraftBadge />
          </div>
        )}
      </header>

      <DetailTabs key={p.id} tabs={tabs} />

      {(showCalc || FEATURES.lead) && (
        <div className="grid grid-cols-2 gap-3">
          {showCalc && (
            <BigButton variant="secondary" onClick={() => navigate(`/p/${p.id}/calc`)}>
              {ar.cta.calc}
            </BigButton>
          )}
          {FEATURES.lead && (
            <BigButton variant="secondary" onClick={() => navigate(`/p/${p.id}/lead`)}>
              {ar.cta.lead}
            </BigButton>
          )}
        </div>
      )}
    </main>
  );
}
