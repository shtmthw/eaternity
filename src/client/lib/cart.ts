import { useMemo, useSyncExternalStore } from 'react';
import { MAX_QUANTITY } from '../../shared/constants.ts';
import { orderTotals } from '../../shared/money.ts';
import type { MenuDish } from './types.ts';

// The cart lives in the browser. The server only sees it at checkout, where
// it looks up current prices itself, so there is nothing to keep in sync.

type Cart = Readonly<Record<number, number>>;

const STORAGE_KEY = 'eaternity.cart';

function load(): Cart {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!stored || typeof stored !== 'object') return {};
    return Object.fromEntries(
      Object.entries(stored).filter(
        ([id, quantity]) =>
          /^\d+$/.test(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY,
      ),
    );
  } catch {
    return {};
  }
}

let cart: Cart = load();
let panelOpen = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function emit() {
  for (const listener of listeners) listener();
}

function save(next: Cart) {
  cart = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

// Keeps several open tabs in step.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    cart = load();
    emit();
  }
});

export const cartActions = {
  setQuantity(dishId: number, quantity: number) {
    const next = { ...cart };
    if (quantity > 0) next[dishId] = Math.min(quantity, MAX_QUANTITY);
    else delete next[dishId];
    save(next);
  },
  add(dishId: number) {
    cartActions.setQuantity(dishId, (cart[dishId] ?? 0) + 1);
  },
  remove(dishId: number) {
    cartActions.setQuantity(dishId, (cart[dishId] ?? 0) - 1);
  },
  clear() {
    save({});
  },
  open() {
    panelOpen = true;
    emit();
  },
  close() {
    panelOpen = false;
    emit();
  },
};

export function useQuantity(dishId: number): number {
  return useSyncExternalStore(subscribe, () => cart[dishId] ?? 0);
}

export function useCartPanelOpen(): boolean {
  return useSyncExternalStore(subscribe, () => panelOpen);
}

export interface CartLine {
  dish: MenuDish;
  quantity: number;
}

/** Joins the stored quantities with the menu. Dishes that left the menu drop out. */
export function useCartLines(menu: readonly MenuDish[], deliveryFeeCents: number) {
  const current = useSyncExternalStore(subscribe, () => cart);
  return useMemo(() => {
    const lines: CartLine[] = menu
      .filter((dish) => (current[dish.id] ?? 0) > 0)
      .map((dish) => ({ dish, quantity: current[dish.id] ?? 0 }));
    const totals = orderTotals(
      lines.map((line) => ({ priceCents: line.dish.priceCents, quantity: line.quantity })),
      deliveryFeeCents,
    );
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    return { lines, count, ...totals };
  }, [menu, current, deliveryFeeCents]);
}
