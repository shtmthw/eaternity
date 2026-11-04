import { MutationCache, QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';
import type { AppRouter } from '../server/routers/index.ts';
import { toast } from './lib/toast.ts';

export type ApiError = TRPCClientError<AppRouter>;

export function errorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}

export function fieldErrors(error: unknown): Record<string, string | undefined> {
  if (!(error instanceof TRPCClientError)) return {};
  const fields = (error as ApiError).data?.fieldErrors ?? {};
  return Object.fromEntries(Object.entries(fields).map(([field, messages]) => [field, messages?.[0]]));
}

const isClientError = (error: unknown) => {
  const status = error instanceof TRPCClientError ? (error as ApiError).data?.httpStatus : undefined;
  return status !== undefined && status < 500;
};

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Set when the component shows the error itself, for example next to a form. */
      handlesErrors?: boolean;
    };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failures, error) => !isClientError(error) && failures < 2,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.meta?.handlesErrors) toast.error(errorMessage(error));
    },
  }),
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
