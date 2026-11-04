import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { AccountMenu } from '../components/AccountMenu.tsx';
import { CartSheet } from '../components/CartSheet.tsx';
import { Logo } from '../components/Logo.tsx';
import { cartActions } from '../lib/cart.ts';
import { useCart, useUser } from '../lib/hooks.ts';

export const Route = createFileRoute('/_shop')({
  // The cart needs the menu on every shop page.
  loader: ({ context: { queryClient, trpc } }) => queryClient.ensureQueryData(trpc.shop.menu.queryOptions()),
  component: ShopLayout,
});

function ShopLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="wrap flex items-center justify-between py-10 text-[13px] text-stone-400">
        <span>© {new Date().getFullYear()} Eaternity</span>
        <span>Cooked to order, delivered hot.</span>
      </footer>
      <CartSheet />
    </div>
  );
}

function Header() {
  const user = useUser();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-100 bg-white/85 backdrop-blur-md">
      <div className="wrap flex h-16 items-center justify-between">
        <Link to="/" aria-label="Eaternity menu">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5">
          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Link to="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={cartActions.open}>
            Cart
            {count > 0 && (
              <span className="-mr-1 grid h-5 min-w-5 place-items-center rounded-full bg-stone-900 px-1.5 text-[11px] font-semibold text-white tabular-nums">
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
