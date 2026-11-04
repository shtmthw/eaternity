export const APP_NAME = 'Eaternity';

export const CATEGORIES = ['Meats', 'Veggies', 'Mixed'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Flat delivery charge added to every order, in USD. */
export const DELIVERY_FEE = 2;

export const ORDER_STATUSES = ['processing', 'confirmed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  processing: 'Being prepared',
  confirmed: 'Confirmed',
};

export const MAX_ITEM_QUANTITY = 99;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const;
