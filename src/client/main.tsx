import './zod-setup.ts';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Spinner } from './components/Spinner.tsx';
import { routeTree } from './routeTree.gen.ts';
import { queryClient, trpc } from './trpc.ts';
import './styles.css';

const router = createRouter({
  routeTree,
  context: { queryClient, trpc },
  defaultPreload: 'intent',
  // Loaders read from the query cache, which has its own idea of freshness.
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: Spinner,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('The page is missing its #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
