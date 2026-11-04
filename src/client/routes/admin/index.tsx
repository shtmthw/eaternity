import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { OrderLines, StatusBadge } from '../../components/OrderParts.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { Spinner } from '../../components/Spinner.tsx';
import { formatDateTime, formatWhen, plural } from '../../lib/format.ts';
import { useMoney } from '../../lib/hooks.ts';
import { toast } from '../../lib/toast.ts';
import type { Order } from '../../lib/types.ts';
import { queryClient, trpc } from '../../trpc.ts';

type Filter = 'paid' | 'confirmed' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'paid', label: 'To confirm' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'all', label: 'All' },
];

export const Route = createFileRoute('/admin/')({
  validateSearch: (search: Record<string, unknown>): { status?: Exclude<Filter, 'paid'> } =>
    search.status === 'confirmed' || search.status === 'all' ? { status: search.status } : {},
  component: OrdersBoard,
});

// New orders show up without a reload.
const REFRESH_MS = 15_000;

function OrdersBoard() {
  const filter: Filter = Route.useSearch().status ?? 'paid';
  const stats = useQuery({ ...trpc.admin.stats.queryOptions(), refetchInterval: REFRESH_MS });
  const orders = useQuery({
    ...trpc.admin.orders.queryOptions({ status: filter }),
    refetchInterval: REFRESH_MS,
  });
  // The last selected order stays around while the panel slides shut.
  const [selected, setSelected] = useState<{ id: number; open: boolean } | null>(null);
  const show = (id: number) => setSelected({ id, open: true });
  const open = orders.data?.find((order) => order.id === selected?.id) ?? null;
  const money = useMoney();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        <dl className="flex gap-10">
          <Stat label="To confirm" value={stats.data ? String(stats.data.toConfirm) : '–'} />
          <Stat label="Orders, 7 days" value={stats.data ? String(stats.data.ordersThisWeek) : '–'} />
          <Stat label="Revenue, 7 days" value={stats.data ? money(stats.data.revenueThisWeekCents) : '–'} />
        </dl>
      </div>

      <nav aria-label="Filter orders" className="mt-10 flex gap-1 border-b border-stone-100 pb-3">
        {FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            to="/admin"
            search={value === 'paid' ? {} : { status: value }}
            className={`btn btn-sm ${filter === value ? 'bg-stone-900 text-white hover:bg-stone-800' : 'btn-ghost'}`}
          >
            {label}
            {value === 'paid' && !!stats.data?.toConfirm && (
              <span className="tabular-nums opacity-60">{stats.data.toConfirm}</span>
            )}
          </Link>
        ))}
      </nav>

      {orders.isPending ? (
        <Spinner />
      ) : orders.isError ? (
        <p className="muted py-16 text-center">The orders could not be loaded.</p>
      ) : orders.data.length === 0 ? (
        <p className="muted py-16 text-center">
          {filter === 'paid' ? 'Nothing waiting. New orders appear here on their own.' : 'No orders yet.'}
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-[13px] text-stone-400">
            <tr>
              <th className="py-3 pr-4 font-normal">Order</th>
              <th className="py-3 pr-4 font-normal">Customer</th>
              <th className="hidden py-3 pr-4 font-normal md:table-cell">Items</th>
              <th className="py-3 pr-4 text-right font-normal">Total</th>
              <th className="py-3 text-right font-normal">
                <span className="sr-only">Status</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 border-t border-stone-100">
            {orders.data.map((order) => (
              <tr
                key={order.id}
                className="cursor-pointer transition-colors hover:bg-stone-50"
                onClick={() => show(order.id)}
              >
                <td className="py-4 pr-4 align-top whitespace-nowrap">
                  <button
                    type="button"
                    className="font-medium"
                    onClick={(event) => {
                      event.stopPropagation();
                      show(order.id);
                    }}
                  >
                    #{order.id}
                  </button>
                  <div className="text-[13px] text-stone-400">{formatWhen(order.createdAt)}</div>
                </td>
                <td className="py-4 pr-4 align-top">
                  <div>{order.name}</div>
                  <div className="hidden max-w-56 truncate text-[13px] text-stone-400 sm:block">
                    {order.address}
                  </div>
                </td>
                <td className="hidden max-w-xs py-4 pr-4 align-top text-stone-600 md:table-cell">
                  <span className="line-clamp-2">
                    {order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}
                  </span>
                </td>
                <td className="py-4 pr-4 text-right align-top tabular-nums">{money(order.totalCents)}</td>
                <td className="py-3 text-right align-top">
                  {order.status === 'paid' ? (
                    <ConfirmButton order={order} size="sm" />
                  ) : (
                    <span className="inline-block pt-1">
                      <StatusBadge status={order.status} compact />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Sheet
        open={open !== null && selected?.open === true}
        onClose={() => setSelected((current) => current && { ...current, open: false })}
        title={open ? `Order #${open.id}` : 'Order'}
        footer={open?.status === 'paid' && <ConfirmButton order={open} size="lg" />}
      >
        {open && <OrderDetails order={open} />}
      </Sheet>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ConfirmButton({ order, size }: { order: Order; size: 'sm' | 'lg' }) {
  const confirm = useMutation(
    trpc.admin.confirmOrder.mutationOptions({
      onSuccess: ({ emailed }) => {
        toast.info(
          emailed
            ? `Order #${order.id} confirmed and ${order.email} notified`
            : `Order #${order.id} confirmed`,
        );
        void queryClient.invalidateQueries({ queryKey: trpc.admin.pathKey() });
      },
    }),
  );

  return (
    <button
      type="button"
      className={`btn btn-primary ${size === 'sm' ? 'btn-sm' : 'h-12 w-full'}`}
      disabled={confirm.isPending}
      onClick={(event) => {
        event.stopPropagation();
        confirm.mutate({ id: order.id });
      }}
    >
      {confirm.isPending ? 'Confirming…' : 'Confirm'}
    </button>
  );
}

function OrderDetails({ order }: { order: Order }) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <StatusBadge status={order.status} />
        <span className="text-[13px] text-stone-400">{formatDateTime(order.createdAt)}</span>
      </div>

      <section>
        <h3 className="mb-3 text-[13px] text-stone-400">Customer</h3>
        <p className="font-medium">{order.name}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-stone-600">{order.address}</p>
        <p className="mt-3 text-sm">
          <a href={`tel:${order.phone}`} className="link">
            {order.phone}
          </a>
        </p>
        <p className="text-sm">
          <a href={`mailto:${order.email}`} className="link">
            {order.email}
          </a>
        </p>
      </section>

      <section>
        <h3 className="mb-1 text-[13px] text-stone-400">{plural(count, 'item')}</h3>
        <OrderLines order={order} />
      </section>

      {order.confirmedAt && (
        <p className="text-[13px] text-stone-400">Confirmed {formatDateTime(order.confirmedAt)}</p>
      )}
    </div>
  );
}
