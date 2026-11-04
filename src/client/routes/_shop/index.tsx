import { createFileRoute, Link } from '@tanstack/react-router';
import { Search, UtensilsCrossed } from 'lucide-react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { CATEGORIES, type Category } from '../../../shared/constants.ts';
import { QuantityStepper } from '../../components/QuantityStepper.tsx';
import { cartActions, useCartPanelOpen, useQuantity } from '../../lib/cart.ts';
import { plural } from '../../lib/format.ts';
import { useCart, useConfig, useMenu, useMoney, useUser } from '../../lib/hooks.ts';
import { imageUrl } from '../../lib/images.ts';
import type { MenuDish } from '../../lib/types.ts';

interface MenuSearch {
  category?: Category;
}

export const Route = createFileRoute('/_shop/')({
  validateSearch: (search: Record<string, unknown>): MenuSearch =>
    CATEGORIES.includes(search.category as Category) ? { category: search.category as Category } : {},
  component: MenuPage,
});

function MenuPage() {
  const { category } = Route.useSearch();
  const menu = useMenu();
  const money = useMoney();
  const { deliveryFeeCents } = useConfig();
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query.trim().toLowerCase());

  const visible = menu.filter(
    (dish) =>
      (!category || dish.category === category) &&
      (!search || `${dish.name} ${dish.description}`.toLowerCase().includes(search)),
  );
  const sections = CATEGORIES.map((name) => ({
    name,
    dishes: visible.filter((dish) => dish.category === name),
  })).filter((section) => section.dishes.length > 0);

  return (
    <>
      <section className="wrap pt-12 pb-10 sm:pt-16 sm:pb-12">
        <h1 className="max-w-xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Cooked to order, delivered hot.
        </h1>
        <p className="mt-4 max-w-md text-stone-500">
          Choose a few dishes, pay by card and we bring them to your door. Delivery is a flat{' '}
          {money(deliveryFeeCents)}.
        </p>
      </section>

      <div className="sticky top-16 z-20 border-b border-stone-100 bg-white/85 backdrop-blur-md">
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <CategoryTabs active={category} />
          <SearchBox value={query} onChange={setQuery} />
        </div>
      </div>

      <div className="wrap pt-10 pb-32">
        {menu.length === 0 ? (
          <EmptyMenu />
        ) : sections.length === 0 ? (
          <p className="muted py-16 text-center">
            Nothing on the menu matches {search ? `“${query.trim()}”` : 'this category'}.
          </p>
        ) : (
          <div className="space-y-14">
            {sections.map((section) => (
              <section key={section.name} aria-labelledby={`category-${section.name}`}>
                <h2
                  id={`category-${section.name}`}
                  className="mb-5 flex items-baseline gap-2 text-lg font-semibold tracking-tight"
                >
                  {section.name}
                  <span className="text-sm font-normal text-stone-400">{section.dishes.length}</span>
                </h2>
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {section.dishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <CartBar />
    </>
  );
}

function CategoryTabs({ active }: { active: Category | undefined }) {
  const tab = (selected: boolean) =>
    `btn btn-sm ${selected ? 'bg-stone-900 text-white hover:bg-stone-800' : 'btn-ghost'}`;

  return (
    <nav aria-label="Categories" className="-mx-1 flex gap-1 overflow-x-auto px-1">
      <Link to="/" search={{}} className={tab(!active)} aria-current={!active ? 'page' : undefined}>
        All
      </Link>
      {CATEGORIES.map((name) => (
        <Link
          key={name}
          to="/"
          search={{ category: name }}
          className={tab(active === name)}
          aria-current={active === name ? 'page' : undefined}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);

  // "/" jumps to the search field, as on many sites.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !target.closest('input, textarea, select, [contenteditable]')) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <label className="relative hidden w-60 shrink-0 sm:block">
      <span className="sr-only">Search the menu</span>
      <Search
        size={15}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400"
      />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onChange('')}
        placeholder="Search"
        className="input h-9 rounded-full py-0 pl-9 text-sm"
      />
    </label>
  );
}

function DishCard({ dish }: { dish: MenuDish }) {
  const money = useMoney();
  const quantity = useQuantity(dish.id);

  return (
    <article className="group flex flex-col">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
        {dish.image ? (
          <img
            src={imageUrl(dish.image)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid size-full place-items-center text-stone-300">
            <UtensilsCrossed size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <h3 className="mt-4 font-medium">{dish.name}</h3>
      {dish.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{dish.description}</p>}
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="tabular-nums">{money(dish.priceCents)}</span>
        {quantity > 0 ? (
          <QuantityStepper dishId={dish.id} quantity={quantity} name={dish.name} />
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => cartActions.add(dish.id)}
            aria-label={`Add ${dish.name} to cart`}
          >
            Add
          </button>
        )}
      </div>
    </article>
  );
}

/** Floating summary that opens the cart, shown once something is in it. */
function CartBar() {
  const { count, subtotalCents } = useCart();
  const panelOpen = useCartPanelOpen();
  const money = useMoney();
  if (count === 0 || panelOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-5">
      <button
        type="button"
        onClick={cartActions.open}
        className="btn btn-primary pointer-events-auto h-12 gap-3 px-6 shadow-xl shadow-stone-900/15"
      >
        <span>View cart</span>
        <span className="text-stone-400">·</span>
        <span className="tabular-nums">{plural(count, 'item')}</span>
        <span className="text-stone-400">·</span>
        <span className="tabular-nums">{money(subtotalCents)}</span>
      </button>
    </div>
  );
}

function EmptyMenu() {
  const user = useUser();
  return (
    <div className="py-16 text-center">
      <p className="font-medium">The menu is empty for now</p>
      <p className="muted mt-1 text-sm">
        {user?.role === 'admin' ? (
          <>
            Add dishes from the{' '}
            <Link to="/admin/menu" className="link text-stone-900">
              admin page
            </Link>
            .
          </>
        ) : (
          'Check back soon.'
        )}
      </p>
    </div>
  );
}
