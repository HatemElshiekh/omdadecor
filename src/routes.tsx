import { createBrowserRouter, redirect, type RouteObject } from 'react-router-dom';
import { homeFor, meQuery } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { AppShell } from '@/screens/AppShell';
import { Login } from '@/screens/Login';

/** /_kit is dev only. Deploy previews enable it with VITE_ENABLE_KIT=true for PO review. */
export const KIT_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_KIT === 'true';

const getMe = () => queryClient.fetchQuery(meQuery);

// Route guards (PLAN.md 7): unauthenticated -> /login; non-manager on /manager/* -> /.
async function requireStaff() {
  const me = await getMe();
  if (!me) throw redirect('/login');
  return me;
}
async function requireManager() {
  const me = await getMe();
  if (me?.role !== 'manager') throw redirect('/');
  return null;
}
async function loginLoader() {
  const me = await getMe();
  if (me) throw redirect(homeFor(me.role));
  return null;
}

const routes: RouteObject[] = [
  { path: '/login', loader: loginLoader, element: <Login /> },
  {
    id: 'app',
    loader: requireStaff,
    element: <AppShell />,
    children: [
      {
        index: true,
        lazy: () => import('@/screens/Search').then((m) => ({ Component: m.Search })),
      },
      {
        path: 'p/:id',
        lazy: () => import('@/screens/Product').then((m) => ({ Component: m.Product })),
      },
      {
        path: 'manager',
        loader: requireManager,
        lazy: () => import('@/screens/manager/Home').then((m) => ({ Component: m.ManagerHome })),
      },
    ],
  },
  ...(KIT_ENABLED
    ? [{ path: '/_kit', lazy: () => import('./screens/Kit').then((m) => ({ Component: m.Kit })) }]
    : []),
  { path: '*', loader: () => redirect('/') },
];

export const router = createBrowserRouter(routes);
