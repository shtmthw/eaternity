import { dismissToast, useToasts } from '../lib/toast.ts';

export function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismissToast(item.id)}
          className={`pointer-events-auto max-w-md rounded-full px-5 py-2.5 text-sm shadow-lg ${
            item.tone === 'error' ? 'bg-red-700 text-white' : 'bg-stone-900 text-white'
          }`}
        >
          {item.message}
        </button>
      ))}
    </div>
  );
}
