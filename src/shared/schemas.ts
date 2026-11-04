import { z } from 'zod';
import { CATEGORIES, MAX_QUANTITY, MIN_PASSWORD_LENGTH } from './constants.ts';

export const idSchema = z.number().int().positive();

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Enter your email'),
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Keep the name under 80 characters'),
  email,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200, 'Keep the password under 200 characters'),
});

export const deliverySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep the name under 80 characters'),
  email,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{6,20}$/, 'Enter a phone number'),
  address: z
    .string()
    .trim()
    .min(5, 'Enter a delivery address')
    .max(300, 'Keep the address under 300 characters'),
});
export type Delivery = z.output<typeof deliverySchema>;

export const placeOrderSchema = z.object({
  items: z
    .array(z.object({ dishId: idSchema, quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
    .min(1, 'Your cart is empty')
    .max(50),
  delivery: deliverySchema,
});

/** Name of an uploaded image as returned by POST /api/images. */
export const imageNameSchema = z.string().regex(/^[a-f\d]{32}\.(?:webp|jpg|png|avif|gif)$/, 'Invalid image');

export const dishSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep the name under 80 characters'),
  description: z.string().trim().max(300, 'Keep the description under 300 characters'),
  priceCents: z
    .number('Enter a price')
    .int()
    .min(1, 'Enter a price above zero')
    .max(1_000_000, 'That price is too high'),
  category: z.enum(CATEGORIES, 'Choose a category'),
  image: imageNameSchema.nullable(),
});
export type DishInput = z.input<typeof dishSchema>;
