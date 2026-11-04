export { ApiError, createApiClient, errorMessage, imageUrl, type ApiClient } from './api';
export { Dialog } from './Dialog';
export { Logo, LogoMark } from './Logo';
export { ToastProvider, useToast } from './Toast';

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Short human-friendly reference for an order, taken from the end of its id. */
export const orderReference = (id: string) => id.slice(-6).toUpperCase();
