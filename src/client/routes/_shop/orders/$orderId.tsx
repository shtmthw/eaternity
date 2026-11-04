import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { OrderLines, StatusBadge } from '../../../components/OrderParts.tsx';
import { cartActions } from '../../../lib/cart.ts';
import { formatDateTime, formatWhen } from '../../../lib/format.ts';
import { requireUser } from '../../../lib/guards.ts';
import type { Order } from '../../../lib/types.ts';
import { queryClient, trpc } from '../../../trpc.ts';

interface OrderSearch {
  /** Stripe sends customers back with ?checkout=done after they pay. */
  checkout?: 'done';
  /** Set after placing an order, to say thanks. */
  placed?: boolean;
}

export const Route = createFileRoute('/_shop/orders/$orderId')({
  validateSearch: (search: Record<string, unknown>): OrderSearch => ({
    ...(search.checkout === 'done' ? { checkout: 'done' } : {}),
    ...(search.placed === true || search.placed === 'true' ? { placed: true } : {}),
  }),
  beforeLoad: requireUser,
  loader: ({ context: { queryClient, trpc }, params }) => {
    const id = orderNumber(params.orderId);
    if (!id) throw notFound();
    return queryClient.ensureQueryData(trpc.orders.get.queryOptions({ id }));
  },
  component: OrderPage,
});

function orderNumber(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function OrderPage() {
  const orderId = orderNumber(Route.useParams().orderId) ?? 0;
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const options = trpc.orders.get.queryOptions({ id: orderId });
  const { data: order } = useSuspenseQuery({
    ...options,
    // Keep an eye on the kitchen while the order waits for confirmation.
    refetchInterval: (query) => (query.state.data?.status === 'paid' ? 15_000 : false),
  });

  const complete = useMutation(
    trpc.orders.completeCheckout.mutationOptions({
      onSuccess: (updated) => {
        queryClient.setQueryData(options.queryKey, updated);
        void queryClient.invalidateQueries({ queryKey: trpc.orders.list.queryKey() });
        if (updated.status !== 'pending') {
          cartActions.clear();
          void navigate({ search: { placed: true }, replace: true });
        }
      },
    }),
  );
  const checked = useRef(false);
  useEffect(() => {
    if (search.checkout !== 'done' || checked.current) return;
    checked.current = true;
    complete.mutate({ id: orderId });
  }, [search.checkout, orderId, complete]);

  return (
    <div className="wrap max-w-3xl py-12 sm:py-16">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft size={15} />
        Your orders
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Order #{order.id}</h1>
          <p className="muted mt-1.5 text-sm">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {search.placed && order.status !== 'pending' && (
        <p className="mt-8 rounded-2xl bg-accent-soft px-5 py-4 text-sm text-stone-800">
          Thanks, your order is in. The kitchen will confirm it shortly.
        </p>
      )}
      {order.status === 'pending' && (
        <p className="mt-8 rounded-2xl bg-stone-100 px-5 py-4 text-sm text-stone-700">
          {complete.isPending
            ? 'Checking your payment…'
            : 'We have not received the payment for this order yet.'}
        </p>
      )}

      <Progress order={order} />

      <div className="mt-12 grid gap-12 sm:grid-cols-[1fr_220px]">
        <section aria-labelledby="items-title">
          <h2 id="items-title" className="mb-2 font-semibold">
            Items
          </h2>
          <OrderLines order={order} />
        </section>
        <section aria-labelledby="delivery-title" className="text-sm">
          <h2 id="delivery-title" className="mb-4 text-[15px] font-semibold">
            Delivery
          </h2>
          <p>{order.name}</p>
          <p className="mt-1 whitespace-pre-line text-stone-600">{order.address}</p>
          <p className="mt-3 text-stone-600">{order.phone}</p>
          <p className="break-all text-stone-600">{order.email}</p>
        </section>
      </div>
    </div>
  );
}

function Progress({ order }: { order: Order }) {
  const steps = [
    { label: 'Placed', at: order.createdAt },
    { label: 'Paid', at: order.paidAt },
    { label: 'Confirmed', at: order.confirmedAt },
  ];

  return (
    <ol className="mt-10 grid grid-cols-3 gap-3">
      {steps.map((step) => (
        <li key={step.label}>
          <div className={`h-1 rounded-full ${step.at ? 'bg-stone-900' : 'bg-stone-200'}`} />
          <p className={`mt-3 text-sm font-medium ${step.at ? '' : 'text-stone-400'}`}>{step.label}</p>
          <p className="text-[13px] text-stone-400">{step.at ? formatWhen(step.at) : 'Waiting'}</p>
        </li>
      ))}
    </ol>
  );
}
