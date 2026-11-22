import { LogOut } from 'lucide-react';
import { ar } from '@/i18n/ar';

export interface TopBarProps {
  /** Logged-in rep's display name. Omitted on /login. */
  repName?: string;
  onLogout?: () => void;
}

/** 56px charcoal bar. Start (right in RTL): app name. End (left): rep name + Logout. */
export function TopBar({ repName, onLogout }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center justify-between bg-topbar ps-5 text-primary-ink">
      <span className="text-body font-semibold">{ar.app.name}</span>
      {repName && (
        <div className="flex h-full items-center gap-3">
          <span className="text-small opacity-90">{repName}</span>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex h-topbar min-w-tap-min items-center gap-2 px-4 text-small font-medium hover:bg-white/10"
            >
              <LogOut size={24} strokeWidth={1.75} aria-hidden className="rtl:-scale-x-100" />
              {ar.common.logout}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
