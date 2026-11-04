export const CATEGORIES = ['Meats', 'Veggies', 'Mixed'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * pending: placed, waiting for Stripe.
 * paid: paid for, waiting for the kitchen to confirm.
 * confirmed: accepted by the kitchen.
 * cancelled: the customer left Stripe Checkout without paying.
 */
export const ORDER_STATUSES = ['pending', 'paid', 'confirmed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Awaiting payment',
  paid: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export const MAX_QUANTITY = 20;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MIN_PASSWORD_LENGTH = 8;
