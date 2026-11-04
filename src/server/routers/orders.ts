import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { MAX_QUANTITY } from '../../shared/constants.ts';
import { orderTotals } from '../../shared/money.ts';
import { idSchema, placeOrderSchema } from '../../shared/schemas.ts';
import { dishes, orderItems, orders } from '../db/schema.ts';
import { findOrders, type OrderView } from '../services/orders.ts';
import { authedProcedure, type Context, router } from '../trpc.ts';

const byId = z.object({ id: idSchema });

function ownOrder(ctx: Context & { user: { id: number } }, id: number, { includeCancelled = false } = {}) {
  const order = ctx.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, ctx.user.id)))
    .get();
  if (!order || (order.status === 'cancelled' && !includeCancelled)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
  }
  return order;
}

function orderView(ctx: Context, id: number): OrderView {
  const [view] = findOrders(ctx.db, eq(orders.id, id), 1);
  if (!view) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
  return view;
}

function markPaid(ctx: Context, id: number) {
  ctx.db
    .update(orders)
    .set({ status: 'paid', paidAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.status, 'pending')))
    .run();
}

export const ordersRouter = router({
  list: authedProcedure.query(({ ctx }) =>
    findOrders(ctx.db, and(eq(orders.userId, ctx.user.id), inArray(orders.status, ['paid', 'confirmed']))),
  ),

  get: authedProcedure.input(byId).query(({ ctx, input }) => {
    ownOrder(ctx, input.id);
    return orderView(ctx, input.id);
  }),

  place: authedProcedure.input(placeOrderSchema).mutation(async ({ ctx, input }) => {
    const quantities = new Map<number, number>();
    for (const { dishId, quantity } of input.items) {
      quantities.set(dishId, Math.min((quantities.get(dishId) ?? 0) + quantity, MAX_QUANTITY));
    }

    // Prices come from the database. The client only says what and how many.
    const found = ctx.db
      .select()
      .from(dishes)
      .where(inArray(dishes.id, [...quantities.keys()]))
      .all();
    if (found.length !== quantities.size) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Some dishes in your cart are no longer on the menu',
      });
    }

    const items = found.map((dish) => ({
      dishId: dish.id,
      name: dish.name,
      priceCents: dish.priceCents,
      quantity: quantities.get(dish.id) ?? 1,
    }));
    const totals = orderTotals(items, ctx.config.deliveryFeeCents);
    const demo = ctx.payments.mode === 'demo';

    const order = ctx.db.transaction((tx) => {
      const created = tx
        .insert(orders)
        .values({
          userId: ctx.user.id,
          // Without Stripe there is nothing to wait for, so the order counts as paid.
          status: demo ? 'paid' : 'pending',
          paidAt: demo ? new Date() : null,
          currency: ctx.config.currency,
          ...totals,
          ...input.delivery,
        })
        .returning()
        .get();
      tx.insert(orderItems)
        .values(items.map((item) => ({ ...item, orderId: created.id })))
        .run();
      return created;
    });

    if (ctx.payments.mode === 'demo') return { orderId: order.id, checkoutUrl: null };

    try {
      const checkout = await ctx.payments.createCheckout(
        {
          id: order.id,
          currency: order.currency,
          email: order.email,
          deliveryCents: order.deliveryCents,
          items,
        },
        ctx.baseUrl,
      );
      ctx.db.update(orders).set({ stripeSessionId: checkout.sessionId }).where(eq(orders.id, order.id)).run();
      return { orderId: order.id, checkoutUrl: checkout.url };
    } catch (error) {
      ctx.db.delete(orders).where(eq(orders.id, order.id)).run();
      console.error('Could not start Stripe Checkout:', error);
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: 'Payment could not be started. Please try again.',
      });
    }
  }),

  /** Called when Stripe sends the customer back after paying. */
  completeCheckout: authedProcedure.input(byId).mutation(async ({ ctx, input }) => {
    const order = ownOrder(ctx, input.id);
    if (order.status === 'pending' && ctx.payments.mode === 'stripe' && order.stripeSessionId) {
      if (await ctx.payments.isPaid(order.stripeSessionId)) markPaid(ctx, order.id);
    }
    return orderView(ctx, order.id);
  }),

  /** Called when the customer leaves Stripe Checkout without paying. */
  cancelCheckout: authedProcedure.input(byId).mutation(async ({ ctx, input }) => {
    const order = ownOrder(ctx, input.id, { includeCancelled: true });
    if (order.status !== 'pending') return { status: order.status };

    // Ask Stripe first, so an order that did get paid is never thrown away.
    if (
      ctx.payments.mode === 'stripe' &&
      order.stripeSessionId &&
      (await ctx.payments.isPaid(order.stripeSessionId))
    ) {
      markPaid(ctx, order.id);
      return { status: 'paid' as const };
    }
    ctx.db
      .update(orders)
      .set({ status: 'cancelled' })
      .where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
      .run();
    return { status: 'cancelled' as const };
  }),
});
