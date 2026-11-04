import type { Cart, PublicUser } from '@eaternity/shared';
import { Schema, model, type Types } from 'mongoose';

export interface UserRecord {
  name: string;
  email: string;
  password: string;
  /** Food id to quantity. Updated with atomic $inc/$unset operations. */
  cart: Cart;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    cart: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, minimize: false },
);

export const UserModel = model<UserRecord>('User', userSchema);

export function toPublicUser(doc: Pick<UserRecord, 'name' | 'email'> & { _id: Types.ObjectId }): PublicUser {
  return { id: doc._id.toString(), name: doc.name, email: doc.email };
}

/** Drops zero or invalid quantities that can linger after concurrent updates. */
export function cleanCart(cart: Cart | null | undefined): Cart {
  const result: Cart = {};
  for (const [foodId, quantity] of Object.entries(cart ?? {})) {
    if (typeof quantity === 'number' && quantity > 0) result[foodId] = quantity;
  }
  return result;
}
