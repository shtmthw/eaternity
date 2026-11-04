import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name. Shown as the heading unless hideTitle is set. */
  title: string;
  description?: string;
  hideTitle?: boolean;
  width?: number;
  children: ReactNode;
}

/**
 * Wraps the native <dialog> element, which handles focus trapping,
 * the Escape key and the backdrop for us.
 */
export function Dialog({ open, onClose, title, description, hideTitle, width = 420, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      style={{ maxWidth: width }}
      aria-label={title}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        // A press on the element itself (not its content) is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
          {!hideTitle && (
            <header className={styles.header}>
              <h2 className={styles.title}>{title}</h2>
              {description && <p className={styles.description}>{description}</p>}
            </header>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
