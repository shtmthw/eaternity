import { DELIVERY_FEE } from './constants';

const roundCents = (value: number) => Math.round(value * 100) / 100;

export interface PricedLine {
  price: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export function calculateTotals(lines: readonly PricedLine[]): OrderTotals {
  const subtotal = roundCents(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
  const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;
  return { subtotal, deliveryFee, total: roundCents(subtotal + deliveryFee) };
}

const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}
