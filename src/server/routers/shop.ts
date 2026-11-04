import { asc } from 'drizzle-orm';
import { dishes } from '../db/schema.ts';
import { publicProcedure, router } from '../trpc.ts';

export const dishColumns = {
  id: dishes.id,
  name: dishes.name,
  description: dishes.description,
  priceCents: dishes.priceCents,
  category: dishes.category,
  image: dishes.image,
};

export const shopRouter = router({
  config: publicProcedure.query(({ ctx }) => ({
    currency: ctx.config.currency,
    deliveryFeeCents: ctx.config.deliveryFeeCents,
    paymentMode: ctx.payments.mode,
  })),

  menu: publicProcedure.query(({ ctx }) =>
    ctx.db.select(dishColumns).from(dishes).orderBy(asc(dishes.createdAt), asc(dishes.id)).all(),
  ),
});
