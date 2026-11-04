import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { deliverySchema } from '../../../shared/schemas.ts';
import { Field, FormError } from '../../components/Field.tsx';
import { SummaryRow } from '../../components/OrderParts.tsx';
import { cartActions } from '../../lib/cart.ts';
import { type FieldErrors, formValues, validate } from '../../lib/forms.ts';
import { requireUser } from '../../lib/guards.ts';
import { useCart, useConfig, useMoney } from '../../lib/hooks.ts';
import { errorMessage, queryClient, trpc } from '../../trpc.ts';

interface CheckoutSearch {
  /** Set by Stripe when the customer leaves the payment page without paying. */
  cancelled?: number;
}

export const Route = createFileRoute('/_shop/checkout')({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => {
    const id = Number(search.cancelled);
    return Number.isInteger(id) && id > 0 ? { cancelled: id } : {};
  },
  beforeLoad: requireUser,
  // Used to fill in the delivery details from the last order.
  loader: ({ context: { queryClient, trpc } }) =>
    queryClient.ensureQueryData(trpc.orders.list.queryOptions()),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user } = Route.useRouteContext();
  const { cancelled } = Route.useSearch();
  const navigate = Route.useNavigate();
  const cart = useCart();
  const money = useMoney();
  const { paymentMode } = useConfig();
  const { data: pastOrders } = useSuspenseQuery(trpc.orders.list.queryOptions());
  const last = pastOrders[0];

  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string>();
  const [redirecting, setRedirecting] = useState(false);

  const cancel = useMutation(trpc.orders.cancelCheckout.mutationOptions({ meta: { handlesErrors: true } }));
  const handledCancel = useRef(false);
  useEffect(() => {
    if (!cancelled || handledCancel.current) return;
    handledCancel.current = true;
    void navigate({ search: {}, replace: true });
    cancel.mutate(
      { id: cancelled },
      {
        onSuccess: ({ status }) => {
          if (status === 'paid') {
            cartActions.clear();
            void navigate({ to: '/orders/$orderId', params: { orderId: String(cancelled) }, search: {} });
          } else {
            setNotice('Payment was cancelled and nothing was charged. Your cart is still here.');
          }
        },
      },
    );
  }, [cancelled, cancel, navigate]);

  const place = useMutation(
    trpc.orders.place.mutationOptions({
      meta: { handlesErrors: true },
      onSuccess: async ({ orderId, checkoutUrl }) => {
        if (checkoutUrl) {
          setRedirecting(true);
          window.location.assign(checkoutUrl);
          return;
        }
        cartActions.clear();
        await queryClient.invalidateQueries({ queryKey: trpc.orders.pathKey() });
        await navigate({
          to: '/orders/$orderId',
          params: { orderId: String(orderId) },
          search: { placed: true },
        });
      },
      onError: (error) => {
        setErrors({ form: errorMessage(error) });
        // A dish may have left the menu. Reloading it drops that dish from the cart.
        void queryClient.invalidateQueries({ queryKey: trpc.shop.menu.queryKey() });
      },
    }),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validate(deliverySchema, formValues(event.currentTarget));
    setErrors(result.ok ? {} : result.errors);
    if (!result.ok) return;
    place.mutate({
      delivery: result.data,
      items: cart.lines.map((line) => ({ dishId: line.dish.id, quantity: line.quantity })),
    });
  };

  if (cart.count === 0) {
    return (
      <div className="wrap py-16 sm:py-24">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        {notice && <Notice>{notice}</Notice>}
        <p className="muted mt-4">Your cart is empty.</p>
        <Link to="/" className="btn btn-primary mt-8">
          Browse the menu
        </Link>
      </div>
    );
  }

  const busy = place.isPending || redirecting;

  return (
    <div className="wrap py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      {notice && <Notice>{notice}</Notice>}

      <form onSubmit={submit} noValidate className="mt-10 grid items-start gap-12 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="delivery-title">
          <h2 id="delivery-title" className="font-semibold">
            Delivery details
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Name" error={errors.name}>
              <input
                name="name"
                className="input"
                autoComplete="name"
                defaultValue={last?.name ?? user.name}
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input
                name="phone"
                type="tel"
                className="input"
                autoComplete="tel"
                defaultValue={last?.phone}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email" error={errors.email} hint="We send the order confirmation here.">
                <input
                  name="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  defaultValue={last?.email ?? user.email}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Address" error={errors.address}>
                <textarea
                  name="address"
                  rows={3}
                  className="input resize-none"
                  autoComplete="street-address"
                  defaultValue={last?.address}
                />
              </Field>
            </div>
          </div>
        </section>

        <aside aria-labelledby="summary-title" className="rounded-3xl bg-stone-50 p-6 lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between">
            <h2 id="summary-title" className="font-semibold">
              Your order
            </h2>
            <button type="button" className="link text-sm text-stone-500" onClick={cartActions.open}>
              Edit
            </button>
          </div>
          <ul className="mt-4 space-y-2.5">
            {cart.lines.map(({ dish, quantity }) => (
              <li key={dish.id} className="flex justify-between gap-4 text-sm">
                <span>
                  <span className="text-stone-400 tabular-nums">{quantity} ×</span> {dish.name}
                </span>
                <span className="tabular-nums">{money(dish.priceCents * quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-1.5 border-t border-stone-200/70 pt-5">
            <SummaryRow label="Subtotal" value={money(cart.subtotalCents)} />
            <SummaryRow label="Delivery" value={money(cart.deliveryCents)} />
            <div className="pt-1.5">
              <SummaryRow label="Total" value={money(cart.totalCents)} strong />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <FormError>{errors.form}</FormError>
            <button type="submit" className="btn btn-primary h-12 w-full" disabled={busy}>
              {redirecting
                ? 'Opening Stripe…'
                : place.isPending
                  ? 'Placing order…'
                  : paymentMode === 'stripe'
                    ? `Pay ${money(cart.totalCents)}`
                    : 'Place order'}
            </button>
            <p className="text-center text-[13px] text-stone-500">
              {paymentMode === 'stripe'
                ? 'You will pay on Stripe’s secure checkout page.'
                : 'Demo mode. No payment is taken.'}
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Notice({ children }: { children: string }) {
  return <p className="mt-6 rounded-2xl bg-stone-100 px-5 py-3.5 text-sm text-stone-700">{children}</p>;
}
