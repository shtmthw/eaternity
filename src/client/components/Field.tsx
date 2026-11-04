import { type ReactElement, cloneElement, useId } from 'react';

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label, control and error message, wired together for screen readers. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': note ? noteId : undefined,
      })}
      {note && (
        <p id={noteId} className={`mt-1.5 text-[13px] ${error ? 'text-red-700' : 'text-stone-500'}`}>
          {note}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children: string | undefined }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </p>
  );
}
