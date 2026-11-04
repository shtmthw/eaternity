import {
  ORDER_STATUSES,
  type Address,
  type Order,
  type OrderItem,
  type OrderStatus,
} from '@eaternity/shared';
import { Schema, model, type Types } from 'mongoose';

export interface OrderRecord {
  userId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  amount: number;
  address: Address;
  status: OrderStatus;
  payment: boolean;
  paymentSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    foodId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const addressSchema = new Schema<Address>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderRecord>(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    amount: { type: Number, required: true },
    address: { type: addressSchema, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'processing' },
    payment: { type: Boolean, default: false },
    paymentSessionId: { type: String },
  },
  { timestamps: true },
);

export const OrderModel = model<OrderRecord>('Order', orderSchema);

export function toOrder(doc: OrderRecord & { _id: Types.ObjectId }): Order {
  return {
    _id: doc._id.toString(),
    userId: doc.userId,
    items: doc.items.map(({ foodId, name, price, quantity }) => ({ foodId, name, price, quantity })),
    subtotal: doc.subtotal,
    deliveryFee: doc.deliveryFee,
    amount: doc.amount,
    address: {
      name: doc.address.name,
      email: doc.address.email,
      phone: doc.address.phone,
      location: doc.address.location,
    },
    status: doc.status,
    payment: doc.payment,
    createdAt: doc.createdAt.toISOString(),
  };
}
