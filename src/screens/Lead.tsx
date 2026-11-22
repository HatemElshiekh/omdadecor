// /p/:id/lead Lead capture (PLAN.md 9.5, FR-5-1..FR-5-4). Follow-ups are created server-side.
import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BackButton,
  BidiText,
  BigButton,
  Field,
  NumberField,
  NumPad,
  Toggle,
  useToast,
} from '@/components';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { ar } from '@/i18n/ar';
import { createLead, PHONE_RE } from '@/lib/leads';
import { applyNumPadKey } from '@/lib/numpad';
import { productsQuery, type Product } from '@/lib/products';

function LeadScreen({ p, initialNote }: { p: Product; initialNote: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const touch = useCoarsePointer();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'direct' | 'engineer'>('direct');
  const [note, setNote] = useState(initialNote);
  const [noteOpen, setNoteOpen] = useState(initialNote !== '');
  const [phoneActive, setPhoneActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameError = submitted && !name.trim() ? ar.lead.name_error : undefined;
  const phoneError = submitted && !PHONE_RE.test(phone) ? ar.lead.phone_error : undefined;

  const save = async () => {
    setSubmitted(true);
    if (!name.trim() || !PHONE_RE.test(phone)) return;
    setSaving(true);
    const r = await createLead({ name, phone, type, productId: p.id, note });
    setSaving(false);
    if (r.status === 'saved') {
      toast(r.existing ? ar.lead.existing : ar.lead.saved, 'success'); // FR-5-2 / FR-5-3
      navigate(`/p/${p.id}`, { replace: true });
    } else if (r.status === 'invalid') {
      toast(ar.lead.phone_error, 'error');
    } else {
      toast(ar.common.offline, 'error');
    }
  };

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 p-6" data-screen="lead">
      <div className="flex">
        <BackButton onClick={() => navigate(-1)} />
      </div>
      <h1 className="text-title font-semibold">
        <BidiText text={p.name} />
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-6 rounded-lg bg-surface p-6 shadow-card">
          <Field
            label={ar.lead.name}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            onFocus={() => setPhoneActive(false)}
            error={nameError}
            autoComplete="off"
            enterKeyHint="next"
          />
          <NumberField
            label={ar.lead.phone}
            name="phone"
            value={phone}
            onChange={setPhone}
            decimal={false}
            maxLength={11}
            touch={touch}
            active={touch && phoneActive}
            onActivate={() => setPhoneActive(true)}
            error={phoneError}
          />
          <Toggle
            label={ar.lead.type}
            value={type}
            onChange={setType}
            options={[
              { value: 'direct', label: ar.lead.type_direct },
              { value: 'engineer', label: ar.lead.type_engineer },
            ]}
          />
          {noteOpen ? (
            <label className="flex flex-col gap-2">
              <span className="text-small text-muted">{ar.lead.note}</span>
              <textarea
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                onFocus={() => setPhoneActive(false)}
                rows={3}
                className="rounded border border-line bg-surface-soft p-3 text-body outline-none focus:border-primary"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="h-tap-min self-start rounded border border-line px-5 text-body font-medium text-primary"
            >
              {ar.lead.add_note}
            </button>
          )}
        </section>

        <section className="flex flex-col gap-6">
          {touch && phoneActive && (
            <div className="flex justify-center">
              <NumPad mode="pin" onKey={(k) => setPhone((v) => applyNumPadKey(v, k, 11, 'pin'))} />
            </div>
          )}
          <BigButton variant="primary" loading={saving} onClick={() => void save()}>
            {ar.lead.save}
          </BigButton>
        </section>
      </div>
    </main>
  );
}

export function Lead() {
  const { id } = useParams();
  const location = useLocation();
  const products = useQuery(productsQuery);
  if (products.isPending) return <main className="mx-auto max-w-[960px] p-6" aria-busy />;
  const p = products.data?.find((x) => x.id === id);
  if (!p) return <Navigate to="/" replace />;
  const note = (location.state as { note?: string } | null)?.note ?? '';
  return <LeadScreen p={p} initialNote={note} />;
}
