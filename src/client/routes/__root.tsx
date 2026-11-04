import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Toaster } from '../components/Toaster.tsx';
import type { trpc } from '../trpc.ts';

export interface RouterContext {
  queryClient: QueryClient;
  trpc: typeof trpc;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Everything below reads these two from the query cache.
  beforeLoad: async ({ context: { queryClient, trpc } }) => {
    await Promise.all([
      queryClient.ensureQueryData(trpc.auth.me.queryOptions()),
      queryClient.ensureQueryData(trpc.shop.config.queryOptions()),
    ]);
  },
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: NotFound,
  errorComponent: Failure,
});

function NotFound() {
  return (
    <Message title="Page not found" body="The page you were looking for does not exist.">
      <Link to="/" className="btn btn-primary">
        Back to the menu
      </Link>
    </Message>
  );
}

function Failure({ error }: ErrorComponentProps) {
  const router = useRouter();
  const body = error instanceof Error && error.message ? error.message : 'The page could not be loaded.';
  return (
    <Message title="Something went wrong" body={body}>
      <button type="button" className="btn btn-primary" onClick={() => void router.invalidate()}>
        Try again
      </button>
    </Message>
  );
}

function Message({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="muted mt-2">{body}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
