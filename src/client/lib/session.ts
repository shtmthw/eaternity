import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { queryClient, trpc } from '../trpc.ts';
import { cartActions } from './cart.ts';
import type { CurrentUser } from './types.ts';

/** Swaps the signed-in user and drops anything cached for the previous one. */
export function setSessionUser(user: CurrentUser | null) {
  queryClient.removeQueries({ queryKey: trpc.orders.pathKey() });
  queryClient.removeQueries({ queryKey: trpc.admin.pathKey() });
  queryClient.setQueryData(trpc.auth.me.queryKey(), user);
}

export function useSignOut() {
  const router = useRouter();
  return useMutation(
    trpc.auth.signOut.mutationOptions({
      onSuccess: async () => {
        setSessionUser(null);
        // The browser may be shared, so the next person starts with an empty cart.
        cartActions.clear();
        await router.navigate({ to: '/' });
        await router.invalidate();
      },
    }),
  );
}
