// /login: staff picker + 4-digit PIN (PLAN.md 9.1, FR-1-1..FR-1-4).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BackButton, NumPad, PinDots, TopBar } from '@/components';
import { ar } from '@/i18n/ar';
import { fetchStaffList, homeFor, pinLogin, type StaffCard } from '@/lib/auth';
import { applyNumPadKey, type NumPadKey } from '@/lib/numpad';

const PIN_LENGTH = 4;
type Notice = 'bad_pin' | 'locked' | 'error' | null;

export function Login() {
  const navigate = useNavigate();
  const staff = useQuery({ queryKey: ['staff-list'], queryFn: fetchStaffList, staleTime: 0 });
  const [selected, setSelected] = useState<StaffCard | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [shake, setShake] = useState(0);

  // Re-enable the pad when the lock window ends.
  useEffect(() => {
    if (!lockedUntil) return;
    const ms = lockedUntil - Date.now();
    if (ms <= 0) return setLockedUntil(null);
    const t = setTimeout(() => {
      setLockedUntil(null);
      setNotice(null);
    }, ms);
    return () => clearTimeout(t);
  }, [lockedUntil]);

  const choose = (s: StaffCard | null) => {
    setSelected(s);
    setPin('');
    setNotice(null);
    setLockedUntil(null);
  };

  const submit = async (staffId: string, value: string) => {
    setBusy(true);
    const r = await pinLogin(staffId, value);
    setBusy(false);
    if (r.status === 'ok') {
      navigate(homeFor(r.role), { replace: true });
      return;
    }
    setPin('');
    setShake((n) => n + 1);
    if (r.status === 'bad_pin') setNotice('bad_pin');
    else if (r.status === 'locked') {
      setNotice('locked');
      setLockedUntil(Date.parse(r.retryAt) || Date.now() + 10 * 60_000);
    } else setNotice('error');
  };

  const onKey = (k: NumPadKey) => {
    if (!selected || busy) return;
    const next = applyNumPadKey(pin, k, PIN_LENGTH, 'pin');
    setPin(next);
    if (k !== 'back' && k !== 'clear') setNotice((n) => (n === 'locked' ? n : null));
    if (next.length === PIN_LENGTH) void submit(selected.id, next); // FR-1-2: auto-submit
  };

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main className="mx-auto flex max-w-[960px] flex-col gap-8 p-6">
        {!selected ? (
          <>
            <h1 className="text-center text-title font-semibold">{ar.login.title}</h1>
            {staff.isError && (
              <p role="alert" className="text-center text-body text-danger">
                {ar.login.error}
              </p>
            )}
            <ul className="flex flex-wrap justify-center gap-4">
              {staff.data?.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => choose(s)}
                    className="flex size-[140px] flex-col items-center justify-center gap-3 rounded-lg bg-surface shadow-card hover:bg-surface-soft"
                  >
                    <span
                      aria-hidden
                      className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-title font-semibold text-primary"
                    >
                      {s.display_name.trim().charAt(0)}
                    </span>
                    <span className="text-body font-medium">{s.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="flex">
              <BackButton onClick={() => choose(null)} />
            </div>
            <section className="flex flex-col items-center gap-6">
              <p className="text-title font-semibold">{selected.display_name}</p>
              <p className="text-body text-muted">{ar.login.pin}</p>
              <PinDots length={PIN_LENGTH} filled={pin.length} shakeKey={shake} />
              <p role="alert" className="min-h-8 text-center text-body text-danger">
                {notice === 'bad_pin' && ar.login.bad_pin}
                {notice === 'locked' && ar.login.locked}
                {notice === 'error' && ar.login.error}
              </p>
              <NumPad mode="pin" onKey={onKey} disabled={busy || lockedUntil !== null} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
