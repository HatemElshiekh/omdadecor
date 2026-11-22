import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

/** /_kit is dev only. Deploy previews enable it with VITE_ENABLE_KIT=true for PO review. */
export const KIT_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_KIT === 'true';

// Phase 1 ships only the component gallery. Screens arrive from Phase 3 onwards.
const routes: RouteObject[] = KIT_ENABLED
  ? [
      { path: '/_kit', lazy: () => import('./screens/Kit').then((m) => ({ Component: m.Kit })) },
      { path: '*', element: <Navigate to="/_kit" replace /> },
    ]
  : [{ path: '*', element: null }];

export const router = createBrowserRouter(routes);
