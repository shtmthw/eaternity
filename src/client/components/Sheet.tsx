import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** A panel that slides in from the right. */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog itself, not its contents, landed on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone-100 pr-3 pl-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <footer className="shrink-0 border-t border-stone-100 px-6 py-5">{footer}</footer>}
    </dialog>
  );
}
