import { ORDER_STATUS_LABELS, type OrderStatus } from '../../shared/constants.ts';
import { useMoney } from '../lib/hooks.ts';
import type { Order } from '../lib/types.ts';

const DOT: Record<OrderStatus, string> = {
  pending: 'bg-stone-300',
  paid: 'bg-amber-500',
  confirmed: 'bg-accent',
  cancelled: 'bg-stone-300',
};

/** A coloured dot and the status name. `compact` keeps only the dot on small screens. */
export function StatusBadge({ status, compact }: { status: OrderStatus; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-stone-600">
      <span className={`size-1.5 rounded-full ${DOT[status]}`} aria-hidden="true" />
      <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{ORDER_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? 'text-[15px] font-semibold' : 'text-sm text-stone-600'}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Items and totals of a placed order. */
export function OrderLines({ order }: { order: Order }) {
  const money = useMoney();
  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-4 py-3 text-sm">
            <span>
              <span className="text-stone-400 tabular-nums">{item.quantity} ×</span> {item.name}
            </span>
            <span className="tabular-nums">{money(item.priceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-1.5 border-t border-stone-100 pt-4">
        <SummaryRow label="Subtotal" value={money(order.subtotalCents)} />
        <SummaryRow label="Delivery" value={money(order.deliveryCents)} />
        <div className="pt-1.5">
          <SummaryRow label="Total" value={money(order.totalCents)} strong />
        </div>
      </div>
    </div>
  );
}
