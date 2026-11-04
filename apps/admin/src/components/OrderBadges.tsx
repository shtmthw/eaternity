import { ORDER_STATUS_LABELS, type Order } from '@eaternity/shared';

export function OrderBadges({ order }: { order: Order }) {
  if (!order.payment) return <span className="badge badge-warning">Unpaid</span>;
  return (
    <span className={`badge ${order.status === 'confirmed' ? 'badge-success' : ''}`}>
      {order.status === 'confirmed' ? ORDER_STATUS_LABELS.confirmed : 'Awaiting confirmation'}
    </span>
  );
}
