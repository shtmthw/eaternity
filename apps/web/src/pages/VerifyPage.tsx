import { errorMessage, useToast } from '@eaternity/ui';
import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../lib/api';
import { useStore } from '../store/StoreContext';
import styles from './VerifyPage.module.css';

/** Landing page after checkout. Confirms the payment with the server, then moves on. */
export function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refreshCart, openAuth } = useStore();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const orderId = params.get('orderId');
  const success = params.get('success') === 'true';

  useEffect(() => {
    if (!user || !orderId || started.current) return;
    started.current = true;

    api.orders.verify(orderId, success).then(
      async (result) => {
        if (result.paid) {
          await refreshCart().catch(() => {});
          toast.success('Payment received. Your order is being prepared.');
          navigate('/myorders', { replace: true });
        } else {
          toast.info('Payment was cancelled. Your cart has been kept.');
          navigate('/cart', { replace: true });
        }
      },
      (failure: unknown) => setError(errorMessage(failure)),
    );
  }, [navigate, orderId, refreshCart, success, toast, user]);

  if (!orderId) {
    return (
      <Status title="Nothing to confirm" text="This link is missing an order reference.">
        <Link to="/" className="btn btn-secondary">
          Back to the menu
        </Link>
      </Status>
    );
  }

  if (!user) {
    return (
      <Status title="Sign in to finish your order" text="Your session ended while you were paying.">
        <button type="button" className="btn btn-primary" onClick={() => openAuth('signin')}>
          Sign in
        </button>
      </Status>
    );
  }

  if (error) {
    return (
      <Status title="We could not confirm your payment" text={error} isError>
        <Link to="/myorders" className="btn btn-secondary">
          View my orders
        </Link>
      </Status>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.box} role="status">
        <span className={`spinner ${styles.spinner}`} aria-hidden="true" />
        <h1 className={styles.title}>Confirming your payment</h1>
        <p className="muted">This only takes a moment.</p>
      </div>
    </div>
  );
}

function Status({
  title,
  text,
  isError,
  children,
}: {
  title: string;
  text: string;
  isError?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.box}>
        {isError && <CircleAlert size={28} className={styles.errorIcon} aria-hidden="true" />}
        <h1 className={styles.title}>{title}</h1>
        <p className="muted">{text}</p>
        <div className={styles.actions}>{children}</div>
      </div>
    </div>
  );
}
