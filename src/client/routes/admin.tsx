import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router';
import { AuthForm } from '../components/AuthForm.tsx';
import { Logo } from '../components/Logo.tsx';
import { useUser } from '../lib/hooks.ts';
import { useSignOut } from '../lib/session.ts';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

const tab =
  'rounded-full px-3.5 py-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900 data-[status=active]:bg-stone-100 data-[status=active]:text-stone-900';

function AdminLayout() {
  const user = useUser();
  const signOut = useSignOut();

  if (user?.role !== 'admin') return <AdminGate signedInAs={user?.email} />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-stone-100 bg-white/85 backdrop-blur-md">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/admin" aria-label="Admin home">
              <span className="sm:hidden">
                <Logo />
              </span>
              <span className="hidden sm:inline">
                <Logo suffix="Admin" />
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link to="/admin" activeOptions={{ exact: true, includeSearch: false }} className={tab}>
                Orders
              </Link>
              <Link to="/admin/menu" className={tab}>
                Menu
              </Link>
            </nav>
          </div>
          <div className="-mr-3.5 flex items-center gap-1 sm:mr-0">
            <Link to="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              View shop
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => signOut.mutate()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="wrap py-10 sm:py-12">
        <Outlet />
      </main>
    </div>
  );
}

function AdminGate({ signedInAs }: { signedInAs: string | undefined }) {
  const router = useRouter();
  const signOut = useSignOut();

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Logo suffix="Admin" />
        {signedInAs ? (
          <>
            <h1 className="mt-10 text-2xl font-semibold tracking-tight">No admin access</h1>
            <p className="muted mt-2 text-sm">
              You are signed in as {signedInAs}, which is a customer account. Sign out and use the admin
              account instead.
            </p>
            <button type="button" className="btn btn-primary mt-8 w-full" onClick={() => signOut.mutate()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-10 text-2xl font-semibold tracking-tight">Sign in to the kitchen</h1>
            <p className="muted mt-1.5 mb-8 text-sm">
              Use the admin email and password from the server logs.
            </p>
            <AuthForm mode="sign-in" onSuccess={() => router.invalidate()} />
          </>
        )}
        <Link to="/" className="mt-8 block text-center text-sm text-stone-500 hover:text-stone-900">
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
