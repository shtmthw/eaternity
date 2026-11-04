import { z } from 'zod';
import { CATEGORIES, MAX_ITEM_QUANTITY } from './constants';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Name is too long'),
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Enter your email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.input<typeof loginSchema>;

export const addressSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Name is too long'),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/, 'Enter a valid phone number'),
  location: z.string().trim().min(3, 'Enter your delivery address').max(300, 'Address is too long'),
});
export type Address = z.output<typeof addressSchema>;

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        foodId: objectIdSchema,
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(100),
  address: addressSchema,
});
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export const verifyOrderSchema = z.object({
  success: z.boolean(),
});

export const cartItemSchema = z.object({
  foodId: objectIdSchema,
});

export const mergeCartSchema = z.object({
  cart: z.record(objectIdSchema, z.number().int().min(1).max(MAX_ITEM_QUANTITY)),
});

/** Fields of the multipart form used to add a menu item. */
export const foodInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Name is too long'),
  description: z.string().trim().min(1, 'Enter a description').max(500, 'Description is too long'),
  price: z.preprocess(
    // An empty form field means "missing", not zero.
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number('Enter a price')
      .positive('Price must be greater than zero')
      .max(10_000, 'Price is too high')
      .transform((value) => Math.round(value * 100) / 100),
  ),
  category: z.enum(CATEGORIES, 'Choose a category'),
});
export type FoodInput = z.input<typeof foodInputSchema>;

export const adminLoginSchema = loginSchema;
