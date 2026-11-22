// Layout for every signed-in screen: TopBar + idle logout (FR-1-5) + session watch.
import { useCallback, useEffect } from 'react';
import { Outlet, useLoaderData, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components';
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { signOut, type Me } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export function AppShell() {
  const me = useLoaderData() as Me;
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [navigate]);

  useIdleLogout(() => void logout());

  // Session revoked or refresh failed elsewhere: go back to the picker.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/login', { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg">
      <TopBar repName={me.display_name} onLogout={() => void logout()} />
      <Outlet />
    </div>
  );
}
