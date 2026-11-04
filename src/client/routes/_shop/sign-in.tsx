import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { AuthForm, type AuthMode } from '../../components/AuthForm.tsx';

interface SignInSearch {
  mode?: 'sign-up';
  /** Where to go afterwards. Only paths on this site are accepted. */
  redirect?: string;
}

const safePath = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined;

export const Route = createFileRoute('/_shop/sign-in')({
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    const next = safePath(search.redirect);
    return { ...(search.mode === 'sign-up' ? { mode: 'sign-up' } : {}), ...(next ? { redirect: next } : {}) };
  },
  beforeLoad: async ({ context: { queryClient, trpc }, search }) => {
    if (await queryClient.ensureQueryData(trpc.auth.me.queryOptions()))
      throw redirect({ href: search.redirect ?? '/' });
  },
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const mode: AuthMode = search.mode ?? 'sign-in';

  return (
    <div className="wrap grid place-items-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === 'sign-up' ? 'Create an account' : 'Sign in'}
        </h1>
        <p className="muted mt-1.5 mb-8 text-sm">
          {mode === 'sign-up'
            ? 'You need an account to place orders and follow them.'
            : 'Welcome back. Sign in to order and see your past orders.'}
        </p>
        <AuthForm
          mode={mode}
          onModeChange={(next) =>
            void navigate({
              search: (current) => ({ ...current, mode: next === 'sign-up' ? 'sign-up' : undefined }),
              replace: true,
            })
          }
          onSuccess={(user) => {
            // Navigating runs the root beforeLoad again, which picks up the new session.
            router.history.push(search.redirect ?? (user.role === 'admin' ? '/admin' : '/'));
          }}
        />
      </div>
    </div>
  );
}
