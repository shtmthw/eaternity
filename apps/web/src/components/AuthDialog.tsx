import { loginSchema, registerSchema } from '@eaternity/shared';
import { Dialog, errorMessage, useToast } from '@eaternity/ui';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useStore, type AuthMode } from '../store/StoreContext';
import styles from './AuthDialog.module.css';

type Field = 'name' | 'email' | 'password';

export function AuthDialog() {
  const { authDialog, closeAuth } = useStore();
  const { mode, reason } = authDialog;

  return (
    <Dialog
      open={authDialog.open}
      onClose={closeAuth}
      title={mode === 'signin' ? 'Sign in' : 'Create an account'}
      description={
        reason ??
        (mode === 'signin'
          ? 'Welcome back. Sign in to order and track your meals.'
          : 'It only takes a minute.')
      }
    >
      {/* Keyed by mode so switching between the two forms resets them. */}
      <AuthForm key={mode} mode={mode} />
    </Dialog>
  );
}

function AuthForm({ mode }: { mode: AuthMode }) {
  const { completeSignIn, closeAuth, openAuth, authDialog } = useStore();
  const toast = useToast();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const isSignUp = mode === 'signup';

  const update = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = isSignUp
      ? registerSchema.safeParse(values)
      : loginSchema.safeParse({ email: values.email, password: values.password });
    const next: Partial<Record<Field, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        next[field] ??= issue.message;
      }
    }
    setErrors(next);
    setTermsError(!agreed);
    if (!parsed.success || !agreed) return;

    setSubmitting(true);
    try {
      const result = isSignUp
        ? await api.register({ name: values.name, email: values.email, password: values.password })
        : await api.login({ email: values.email, password: values.password });
      await completeSignIn(result);
      closeAuth();
      toast.success(
        isSignUp ? `Welcome to Eaternity, ${result.user.name}` : `Welcome back, ${result.user.name}`,
      );
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (field: Field) => ({
    id: `auth-${field}`,
    className: 'input',
    value: values[field],
    onChange: (event: { target: { value: string } }) => update(field, event.target.value),
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `auth-${field}-error` : undefined,
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {formError && (
        <p className="form-alert" role="alert">
          {formError}
        </p>
      )}

      {isSignUp && (
        <div className="field">
          <label className="label" htmlFor="auth-name">
            Name
          </label>
          <input {...fieldProps('name')} autoComplete="name" autoFocus placeholder="Jane Doe" />
          {errors.name && (
            <p className="field-error" id="auth-name-error">
              {errors.name}
            </p>
          )}
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="auth-email">
          Email
        </label>
        <input
          {...fieldProps('email')}
          type="email"
          autoComplete="email"
          autoFocus={!isSignUp}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="field-error" id="auth-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor="auth-password">
          Password
        </label>
        <input
          {...fieldProps('password')}
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder={isSignUp ? 'At least 6 characters' : ''}
        />
        {errors.password && (
          <p className="field-error" id="auth-password-error">
            {errors.password}
          </p>
        )}
      </div>

      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={agreed}
            aria-invalid={termsError ? true : undefined}
            onChange={(event) => {
              setAgreed(event.target.checked);
              if (event.target.checked) setTermsError(false);
            }}
          />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>
        {termsError && <p className="field-error">Please accept the terms to continue.</p>}
      </div>

      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
        {submitting && <span className="spinner" aria-hidden="true" />}
        {isSignUp ? 'Create account' : 'Sign in'}
      </button>

      <p className={styles.switch}>
        {isSignUp ? 'Already have an account?' : 'New to Eaternity?'}{' '}
        <button
          type="button"
          className={styles.switchButton}
          onClick={() => openAuth(isSignUp ? 'signin' : 'signup', authDialog.reason)}
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </form>
  );
}
