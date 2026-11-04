import { existsSync } from 'node:fs';
import path from 'node:path';
import { TRPCError } from '@trpc/server';
import { and, count, eq, gte, inArray, sum } from 'drizzle-orm';
import { z } from 'zod';
import { dishSchema, idSchema } from '../../shared/schemas.ts';
import { dishes, orders } from '../db/schema.ts';
import { removeImage } from '../services/images.ts';
import { findOrders } from '../services/orders.ts';
import { adminProcedure, type Context, router } from '../trpc.ts';
import { dishColumns } from './shop.ts';

const byId = z.object({ id: idSchema });
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function assertImageExists(ctx: Context, image: string | null) {
  if (image && !existsSync(path.join(ctx.config.uploadsDir, image))) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The image upload was not found. Choose it again.' });
  }
}

export const adminRouter = router({
  stats: adminProcedure.query(({ ctx }) => {
    const toConfirm = ctx.db.select({ value: count() }).from(orders).where(eq(orders.status, 'paid')).get();
    const week = ctx.db
      .select({ orders: count(), revenue: sum(orders.totalCents).mapWith(Number) })
      .from(orders)
      .where(
        and(
          inArray(orders.status, ['paid', 'confirmed']),
          gte(orders.createdAt, new Date(Date.now() - WEEK_MS)),
        ),
      )
      .get();
    return {
      toConfirm: toConfirm?.value ?? 0,
      ordersThisWeek: week?.orders ?? 0,
      revenueThisWeekCents: week?.revenue ?? 0,
    };
  }),

  orders: adminProcedure
    .input(z.object({ status: z.enum(['paid', 'confirmed', 'all']).default('paid') }))
    .query(({ ctx, input }) =>
      findOrders(
        ctx.db,
        input.status === 'all'
          ? inArray(orders.status, ['paid', 'confirmed'])
          : eq(orders.status, input.status),
      ),
    ),

  confirmOrder: adminProcedure.input(byId).mutation(async ({ ctx, input }) => {
    const confirmed = ctx.db
      .update(orders)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(and(eq(orders.id, input.id), eq(orders.status, 'paid')))
      .returning({ id: orders.id })
      .get();

    if (!confirmed) {
      const order = ctx.db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, input.id))
        .get();
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      if (order.status !== 'confirmed') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Only paid orders can be confirmed' });
      }
      return { emailed: false };
    }

    const [order] = findOrders(ctx.db, eq(orders.id, input.id), 1);
    if (!order || !ctx.mailer.enabled) return { emailed: false };
    try {
      await ctx.mailer.sendConfirmation(order);
      return { emailed: true };
    } catch (error) {
      console.error(`Could not email the confirmation for order #${order.id}:`, error);
      return { emailed: false };
    }
  }),

  createDish: adminProcedure.input(dishSchema).mutation(({ ctx, input }) => {
    assertImageExists(ctx, input.image);
    const created = ctx.db.insert(dishes).values(input).returning(dishColumns).get();
    if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    return created;
  }),

  updateDish: adminProcedure.input(dishSchema.extend({ id: idSchema })).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;
    const existing = ctx.db.select().from(dishes).where(eq(dishes.id, id)).get();
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dish not found' });
    assertImageExists(ctx, values.image);

    const updated = ctx.db.update(dishes).set(values).where(eq(dishes.id, id)).returning(dishColumns).get();
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dish not found' });
    if (existing.image !== values.image) await removeImage(ctx.config.uploadsDir, existing.image);
    return updated;
  }),

  deleteDish: adminProcedure.input(byId).mutation(async ({ ctx, input }) => {
    const removed = ctx.db.delete(dishes).where(eq(dishes.id, input.id)).returning().get();
    if (!removed) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dish not found' });
    await removeImage(ctx.config.uploadsDir, removed.image);
    return { id: removed.id };
  }),
});
