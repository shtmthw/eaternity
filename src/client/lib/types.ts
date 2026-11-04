import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../server/routers/index.ts';

type Outputs = inferRouterOutputs<AppRouter>;

export type ShopConfig = Outputs['shop']['config'];
export type MenuDish = Outputs['shop']['menu'][number];
export type Order = Outputs['orders']['get'];
export type CurrentUser = NonNullable<Outputs['auth']['me']>;
