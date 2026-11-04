import { asc, desc, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { orderItems, orders, type OrderItemRow, type OrderRow } from '../db/schema.ts';

export type OrderView = Omit<OrderRow, 'userId' | 'stripeSessionId'> & {
  items: Pick<OrderItemRow, 'dishId' | 'name' | 'priceCents' | 'quantity'>[];
};

/** Loads orders, newest first, together with their items. */
export function findOrders(db: Database, where: SQL | undefined, limit = 200): OrderView[] {
  const rows = db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(limit)
    .all();
  if (rows.length === 0) return [];

  const items = db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(orderItems.id))
    .all();

  const byOrder = Map.groupBy(items, (item) => item.orderId);
  return rows.map(({ userId: _userId, stripeSessionId: _sessionId, ...order }) => ({
    ...order,
    items: (byOrder.get(order.id) ?? []).map(({ dishId, name, priceCents, quantity }) => ({
      dishId,
      name,
      priceCents,
      quantity,
    })),
  }));
}
