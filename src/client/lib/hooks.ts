import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { formatMoney } from '../../shared/money.ts';
import { trpc } from '../trpc.ts';
import { useCartLines } from './cart.ts';

// The root route loads the config and the session before anything renders,
// so these never actually suspend.

export function useConfig() {
  return useSuspenseQuery(trpc.shop.config.queryOptions()).data;
}

export function useUser() {
  return useSuspenseQuery(trpc.auth.me.queryOptions()).data;
}

export function useMenu() {
  return useSuspenseQuery(trpc.shop.menu.queryOptions()).data;
}

export function useMoney() {
  const { currency } = useConfig();
  return useCallback((cents: number) => formatMoney(cents, currency), [currency]);
}

export function useCart() {
  const menu = useMenu();
  const { deliveryFeeCents } = useConfig();
  return useCartLines(menu, deliveryFeeCents);
}
