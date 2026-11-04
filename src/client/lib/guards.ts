import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '../routes/__root.tsx';

/** beforeLoad helper for pages that need an account. */
export async function requireUser({
  context,
  location,
}: {
  context: RouterContext;
  location: { href: string };
}) {
  const user = await context.queryClient.ensureQueryData(context.trpc.auth.me.queryOptions());
  if (!user) throw redirect({ to: '/sign-in', search: { redirect: location.href } });
  return { user };
}
