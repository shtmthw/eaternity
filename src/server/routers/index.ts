import { createCallerFactory, router } from '../trpc.ts';
import { adminRouter } from './admin.ts';
import { authRouter } from './auth.ts';
import { ordersRouter } from './orders.ts';
import { shopRouter } from './shop.ts';

export const appRouter = router({
  shop: shopRouter,
  auth: authRouter,
  orders: ordersRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
