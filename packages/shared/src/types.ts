import type { Category, OrderStatus } from './constants';
import type { Address } from './schemas';

export interface Food {
  _id: string;
  name: string;
  description: string;
  price: number;
  /** File name of the uploaded image, served from /images/<image>. */
  image: string;
  category: Category;
}

/** Map of food id to quantity. */
export type Cart = Record<string, number>;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface AdminAuthResult {
  token: string;
  email: string;
}

export interface OrderItem {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  amount: number;
  address: Address;
  status: OrderStatus;
  payment: boolean;
  createdAt: string;
}

export interface PlaceOrderResult {
  orderId: string;
  checkoutUrl: string;
}

export interface PublicConfig {
  /** "demo" means no Stripe key is configured and payments are simulated. */
  paymentMode: 'stripe' | 'demo';
  deliveryFee: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiFailure {
  success: false;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
