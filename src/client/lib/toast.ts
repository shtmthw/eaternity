import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function show(message: string, tone: Toast['tone']) {
  const id = nextId++;
  // Keep at most three on screen.
  toasts = [...toasts.slice(-2), { id, message, tone }];
  emit();
  setTimeout(() => dismissToast(id), tone === 'error' ? 6000 : 3500);
}

export const toast = {
  info: (message: string) => show(message, 'info'),
  error: (message: string) => show(message, 'error'),
};

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
  );
}
