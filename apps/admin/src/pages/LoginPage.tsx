import { adminLoginSchema } from '@eaternity/shared';
import { Logo, errorMessage } from '@eaternity/ui';
import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '../auth/AdminAuth';
import { api } from '../lib/api';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = adminLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter your email and password');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      signIn(await api.login(parsed.data));
    } catch (failure) {
      setError(errorMessage(failure));
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <Logo height={30} />
        </div>
        <form className={`card ${styles.card}`} onSubmit={submit} noValidate>
          <div>
            <h1 className={styles.title}>Sign in to the admin panel</h1>
            <p className={styles.subtitle}>Manage the menu and confirm incoming orders.</p>
          </div>

          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label className="label" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              className="input"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting && <span className="spinner" aria-hidden="true" />}
            Sign in
          </button>
        </form>
        <p className={styles.help}>
          The credentials come from ADMIN_EMAIL and ADMIN_PASSWORD. If no password was set, one was generated
          on first start and printed in the server log.
        </p>
      </div>
    </div>
  );
}
