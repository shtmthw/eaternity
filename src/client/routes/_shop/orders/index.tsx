import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../../components/OrderParts.tsx';
import { formatDateTime, plural } from '../../../lib/format.ts';
import { requireUser } from '../../../lib/guards.ts';
import { useMoney } from '../../../lib/hooks.ts';
import { trpc } from '../../../trpc.ts';

export const Route = createFileRoute('/_shop/orders/')({
  beforeLoad: requireUser,
  loader: ({ context: { queryClient, trpc } }) =>
    queryClient.ensureQueryData(trpc.orders.list.queryOptions()),
  component: OrdersPage,
});

function OrdersPage() {
  const { data: orders } = useSuspenseQuery(trpc.orders.list.queryOptions());
  const money = useMoney();

  return (
    <div className="wrap max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-6">
          <p className="muted">You have not ordered anything yet.</p>
          <Link to="/" className="btn btn-primary mt-8">
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-stone-100 border-y border-stone-100">
          {orders.map((order) => {
            const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: String(order.id) }}
                  search={{}}
                  className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-5 transition-colors hover:bg-stone-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">Order #{order.id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-stone-500">
                      {formatDateTime(order.createdAt)} · {plural(count, 'item')} ·{' '}
                      {order.items.map((item) => item.name).join(', ')}
                    </p>
                  </div>
                  <span className="tabular-nums">{money(order.totalCents)}</span>
                  <ChevronRight
                    size={16}
                    className="text-stone-300 transition-colors group-hover:text-stone-500"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
