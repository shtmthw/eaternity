import type { z } from 'zod';

export type FieldErrors = Record<string, string | undefined>;

export function formValues(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form)) {
    if (typeof value === 'string') values[name] = value;
  }
  return values;
}

/** Runs the same schema the server uses, so most mistakes are caught before a request is made. */
export function validate<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { ok: true; data: z.output<S> } | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
