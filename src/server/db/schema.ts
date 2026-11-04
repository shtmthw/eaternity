import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { CATEGORIES, ORDER_STATUSES } from '../../shared/constants.ts';

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['customer', 'admin'] })
    .notNull()
    .default('customer'),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256 of the token in the cookie, so a leaked database cannot be used to sign in. */
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
);

export const dishes = sqliteTable('dishes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  priceCents: integer('price_cents').notNull(),
  category: text('category', { enum: CATEGORIES }).notNull(),
  /** File name inside the uploads directory, served from /images/<name>. */
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('pending'),
    currency: text('currency').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryCents: integer('delivery_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    address: text('address').notNull(),
    stripeSessionId: text('stripe_session_id'),
    createdAt: createdAt(),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('orders_user_idx').on(table.userId, table.createdAt),
    index('orders_status_idx').on(table.status, table.createdAt),
  ],
);

/** Name and price are copied from the dish, so later menu changes do not rewrite old orders. */
export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    dishId: integer('dish_id').references(() => dishes.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    priceCents: integer('price_cents').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
);

export type User = typeof users.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
