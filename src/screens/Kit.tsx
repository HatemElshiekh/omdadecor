import { useState, type ReactNode } from 'react';
import { CheckCircle2, Home, MessageSquareQuote, Ruler, Wrench, XCircle } from 'lucide-react';
import {
  BackButton,
  BidiText,
  BigButton,
  DetailTabs,
  DraftBadge,
  Field,
  NumPad,
  TopBar,
  applyNumPadKey,
  useToast,
  type DetailTab,
} from '@/components';
import { ar } from '@/i18n/ar';
import { kitLabels, kitProduct, kitRepName, kitTemplate } from './Kit.fixtures';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card" data-kit={title}>
      <h2 dir="ltr" className="text-end text-small font-medium uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items, tone }: { items: readonly string[]; tone?: 'yes' | 'no' }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          {tone === 'yes' && (
            <CheckCircle2
              size={24}
              strokeWidth={1.75}
              className="mt-1 shrink-0 text-success"
              aria-hidden
            />
          )}
          {tone === 'no' && (
            <XCircle
              size={24}
              strokeWidth={1.75}
              className="mt-1 shrink-0 text-danger"
              aria-hidden
            />
          )}
          {!tone && <span className="mt-3 size-2 shrink-0 rounded-full bg-muted" aria-hidden />}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const PIN_LENGTH = 4;

export function Kit() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [pinShake, setPinShake] = useState(0);
  const [length, setLength] = useState('');
  const [phone, setPhone] = useState('012');

  const tabs: DetailTab[] = [
    {
      id: 'size',
      label: ar.tabs.size,
      icon: Ruler,
      content: (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            {Object.entries(kitProduct.facts).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <Bullets items={kitTemplate.size_material_colors} />
        </div>
      ),
    },
    {
      id: 'where',
      label: ar.tabs.where,
      icon: Home,
      content: (
        <div className="flex flex-col gap-4">
          <Bullets items={kitTemplate.use_yes} tone="yes" />
          <Bullets items={kitTemplate.use_no} tone="no" />
        </div>
      ),
    },
    {
      id: 'pitch',
      label: ar.tabs.pitch,
      icon: MessageSquareQuote,
      content: (
        <div className="flex flex-col gap-3">
          {kitTemplate.say_to_customer.map((t) => (
            <p key={t} className="rounded bg-surface-soft p-4 text-pitch font-medium">
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
      content: <Bullets items={kitTemplate.install_and_complements} />,
    },
  ];

  const onPinKey = (k: Parameters<typeof applyNumPadKey>[1]) => {
    const next = applyNumPadKey(pin, k, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      // Demo only: auto-submit on the 4th digit, always "wrong" to show the error state.
      setTimeout(() => {
        setPinShake((n) => n + 1);
        setPin('');
      }, 150);
    }
  };

  const phoneError =
    phone.length > 0 && !/^01[0125][0-9]{8}$/.test(phone) ? kitLabels.phoneError : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <TopBar repName={kitRepName} onLogout={() => toast(ar.common.logout)} />
      <main className="mx-auto flex max-w-[960px] flex-col gap-6 p-6">
        <div className="flex">
          <BackButton onClick={() => toast(ar.common.back)} />
        </div>

        <Section title="Typography">
          <p className="text-hero font-semibold">{ar.search.title}</p>
          <p className="text-title font-semibold">
            <BidiText text={kitProduct.name} />
          </p>
          <p className="text-body">{kitTemplate.say_to_customer[0]}</p>
          <p className="text-small text-muted">
            {ar.product.price_unknown} · {kitLabels.stock}: {kitProduct.stock}
          </p>
        </Section>

        <Section title="DraftBadge">
          <div>
            <DraftBadge />
          </div>
        </Section>

        <Section title="BigButton">
          <BigButton onClick={() => toast(ar.lead.saved)}>{ar.cta.lead}</BigButton>
          <BigButton variant="secondary">{ar.cta.calc}</BigButton>
          <BigButton
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {ar.cta.lead}
          </BigButton>
          <BigButton disabled>{ar.cta.calc}</BigButton>
          <div className="grid grid-cols-2 gap-3">
            <BigButton variant="secondary">{ar.cta.calc}</BigButton>
            <BigButton variant="secondary">{ar.cta.lead}</BigButton>
          </div>
        </Section>

        <Section title="Field">
          <Field label={kitLabels.name} autoComplete="off" />
          <Field
            label={kitLabels.phone}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            error={phoneError}
          />
        </Section>

        <Section title="NumPad (PIN)">
          <div className="flex flex-col items-center gap-6">
            <p className="text-title font-semibold">{ar.login.pin}</p>
            <div
              key={pinShake}
              dir="ltr"
              aria-label={ar.a11y.pin_dots}
              className={pinShake ? 'animate-shake flex gap-4' : 'flex gap-4'}
            >
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < pin.length
                      ? 'size-5 rounded-full bg-primary'
                      : 'size-5 rounded-full border-2 border-line'
                  }
                />
              ))}
            </div>
            {pinShake > 0 && <p className="text-body text-danger">{ar.login.bad_pin}</p>}
            <NumPad mode="pin" onKey={onPinKey} />
          </div>
        </Section>

        <Section title="NumPad (decimal) + Field">
          <div className="flex flex-col items-center gap-6">
            <Field
              className="w-full max-w-[320px]"
              label={kitLabels.length}
              inputMode="decimal"
              value={length}
              readOnly
              error={length === '' ? ar.calc.missing : undefined}
            />
            <NumPad mode="decimal" onKey={(k) => setLength((v) => applyNumPadKey(v, k, 6))} />
          </div>
        </Section>

        <Section title="Toast">
          <div className="grid grid-cols-2 gap-3">
            <BigButton variant="secondary" onClick={() => toast(ar.lead.saved, 'success')}>
              {ar.lead.saved}
            </BigButton>
            <BigButton variant="secondary" onClick={() => toast(ar.login.bad_pin, 'error')}>
              {ar.login.bad_pin}
            </BigButton>
          </div>
        </Section>

        <Section title="DetailTabs">
          <DetailTabs tabs={tabs} />
        </Section>
      </main>
    </div>
  );
}
