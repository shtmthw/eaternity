import { addressSchema, formatPrice, type Address } from '@eaternity/shared';
import { errorMessage } from '@eaternity/ui';
import { Info, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { OrderSummary } from '../components/OrderSummary';
import { api } from '../lib/api';
import { useStore } from '../store/StoreContext';
import styles from './CheckoutPage.module.css';

type Field = keyof Address;

const FIELDS: { name: Field; label: string; type: string; autoComplete: string; placeholder: string }[] = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name', placeholder: 'Jane Doe' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  { name: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel', placeholder: '+1 555 010 0199' },
];

export function CheckoutPage() {
  const { cartLines, totals, user, config, foodsStatus, cartReady, openAuth } = useStore();
  // Only what the customer typed is stored. Name and email fall back to the
  // account, which also covers signing in halfway through filling the form.
  const [edits, setEdits] = useState<Partial<Address>>({});
  const values: Address = {
    name: edits.name ?? user?.name ?? '',
    email: edits.email ?? user?.email ?? '',
    phone: edits.phone ?? '',
    location: edits.location ?? '',
  };
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isDemo = config?.paymentMode === 'demo';

  if (foodsStatus === 'loading' || !cartReady) return null;
  if (cartLines.length === 0 && !submitting) return <Navigate to="/cart" replace />;

  const update = (field: Field, value: string) => {
    setEdits((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!user) {
      openAuth('signin', 'Sign in or create an account to place your order.');
      return;
    }

    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as Field] ??= issue.message;
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const { checkoutUrl } = await api.orders.place({
        items: cartLines.map(({ food, quantity }) => ({ foodId: food._id, quantity })),
        address: parsed.data,
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  };

  const inputProps = (field: Field) => ({
    id: `checkout-${field}`,
    name: field,
    value: values[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `checkout-${field}-error` : undefined,
    onChange: (event: { target: { value: string } }) => update(field, event.target.value),
  });

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Checkout</h1>

      <form className={styles.layout} onSubmit={submit} noValidate>
        <section className={`card ${styles.form}`} aria-labelledby="delivery-title">
          <h2 id="delivery-title" className={styles.sectionTitle}>
            Delivery details
          </h2>

          {!user && (
            <div className={styles.notice}>
              <Info size={16} aria-hidden="true" />
              <p>
                You need an account to place an order.{' '}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() => openAuth('signin', 'Sign in or create an account to place your order.')}
                >
                  Sign in
                </button>{' '}
                to continue. Your cart will be kept.
              </p>
            </div>
          )}

          {formError && (
            <p className="form-alert" role="alert">
              {formError}
            </p>
          )}

          <div className={styles.grid}>
            {FIELDS.map((field) => (
              <div key={field.name} className={`field ${field.name === 'name' ? styles.full : ''}`}>
                <label className="label" htmlFor={`checkout-${field.name}`}>
                  {field.label}
                </label>
                <input
                  {...inputProps(field.name)}
                  className="input"
                  type={field.type}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                />
                {errors[field.name] && (
                  <p className="field-error" id={`checkout-${field.name}-error`}>
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}
            <div className={`field ${styles.full}`}>
              <label className="label" htmlFor="checkout-location">
                Delivery address
              </label>
              <textarea
                {...inputProps('location')}
                className="textarea"
                rows={3}
                autoComplete="street-address"
                placeholder="Street, building, floor and any notes for the rider"
              />
              {errors.location && (
                <p className="field-error" id="checkout-location-error">
                  {errors.location}
                </p>
              )}
            </div>
          </div>
        </section>

        <OrderSummary
          totals={totals}
          footer={
            <>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                {submitting ? (
                  <span className="spinner" aria-hidden="true" />
                ) : (
                  <Lock size={16} aria-hidden="true" />
                )}
                {isDemo ? 'Place order' : `Pay ${formatPrice(totals.total)}`}
              </button>
              <p className={styles.paymentNote}>
                {isDemo
                  ? 'Demo mode: no payment is taken and the order is marked as paid.'
                  : 'You will be taken to Stripe to pay securely.'}
              </p>
            </>
          }
        >
          <ul className={styles.items}>
            {cartLines.map(({ food, quantity }) => (
              <li key={food._id}>
                <span className={styles.itemName}>
                  <span className={styles.quantity}>{quantity} &times;</span> {food.name}
                </span>
                <span>{formatPrice(food.price * quantity)}</span>
              </li>
            ))}
          </ul>
        </OrderSummary>
      </form>
    </div>
  );
}
