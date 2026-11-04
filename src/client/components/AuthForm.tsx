import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { signInSchema, signUpSchema } from '../../shared/schemas.ts';
import { type FieldErrors, formValues, validate } from '../lib/forms.ts';
import { setSessionUser } from '../lib/session.ts';
import type { CurrentUser } from '../lib/types.ts';
import { errorMessage, fieldErrors, trpc } from '../trpc.ts';
import { Field, FormError } from './Field.tsx';

export type AuthMode = 'sign-in' | 'sign-up';

interface AuthFormProps {
  mode: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onSuccess: (user: CurrentUser) => void | Promise<void>;
}

export function AuthForm({ mode, onModeChange, onSuccess }: AuthFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const options = {
    meta: { handlesErrors: true },
    onSuccess: async (user: CurrentUser) => {
      setSessionUser(user);
      await onSuccess(user);
    },
    onError: (error: unknown) => setErrors({ ...fieldErrors(error), form: errorMessage(error) }),
  };
  const signIn = useMutation(trpc.auth.signIn.mutationOptions(options));
  const signUp = useMutation(trpc.auth.signUp.mutationOptions(options));
  const pending = signIn.isPending || signUp.isPending;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = formValues(event.currentTarget);
    if (mode === 'sign-up') {
      const result = validate(signUpSchema, values);
      setErrors(result.ok ? {} : result.errors);
      if (result.ok) signUp.mutate(result.data);
    } else {
      const result = validate(signInSchema, values);
      setErrors(result.ok ? {} : result.errors);
      if (result.ok) signIn.mutate(result.data);
    }
  };

  const switchTo = (next: AuthMode) => {
    setErrors({});
    onModeChange?.(next);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError>{errors.form}</FormError>
      {mode === 'sign-up' && (
        <Field label="Name" error={errors.name}>
          <input name="name" className="input" autoComplete="name" />
        </Field>
      )}
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" className="input" autoComplete="email" />
      </Field>
      <Field
        label="Password"
        error={errors.password}
        {...(mode === 'sign-up' ? { hint: 'At least 8 characters.' } : {})}
      >
        <input
          name="password"
          type="password"
          className="input"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        />
      </Field>
      <button type="submit" className="btn btn-primary h-11 w-full" disabled={pending}>
        {pending ? 'One moment…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </button>
      {onModeChange && (
        <p className="pt-2 text-center text-sm text-stone-500">
          {mode === 'sign-up' ? 'Already have an account? ' : 'New here? '}
          <button
            type="button"
            className="link text-stone-900"
            onClick={() => switchTo(mode === 'sign-up' ? 'sign-in' : 'sign-up')}
          >
            {mode === 'sign-up' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      )}
    </form>
  );
}
