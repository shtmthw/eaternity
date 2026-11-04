import type {
  AuthResult,
  Cart,
  Food,
  LoginInput,
  Order,
  PlaceOrderInput,
  PlaceOrderResult,
  PublicConfig,
  PublicUser,
  RegisterInput,
} from '@eaternity/shared';
import { createApiClient } from '@eaternity/ui';

export const TOKEN_KEY = 'eaternity.token';
export const USER_KEY = 'eaternity.user';
export const GUEST_CART_KEY = 'eaternity.cart';

let handleUnauthorized: () => void = () => {};

/** Lets the store sign the user out when the server rejects their token. */
export function setUnauthorizedHandler(handler: () => void) {
  handleUnauthorized = handler;
}

const client = createApiClient({
  getToken: () => localStorage.getItem(TOKEN_KEY),
  onUnauthorized: () => handleUnauthorized(),
});

export interface VerifyResult {
  paid: boolean;
  order?: Order;
}

export const api = {
  config: () => client.get<PublicConfig>('/api/config'),
  foods: () => client.get<Food[]>('/api/foods'),

  register: (input: RegisterInput) => client.post<AuthResult>('/api/users/register', input),
  login: (input: LoginInput) => client.post<AuthResult>('/api/users/login', input),
  me: () => client.get<PublicUser>('/api/users/me'),

  cart: {
    get: () => client.get<Cart>('/api/cart'),
    add: (foodId: string) => client.post<Cart>('/api/cart/items', { foodId }),
    remove: (foodId: string) => client.delete<Cart>(`/api/cart/items/${foodId}`),
    merge: (cart: Cart) => client.post<Cart>('/api/cart/merge', { cart }),
  },

  orders: {
    place: (input: PlaceOrderInput) => client.post<PlaceOrderResult>('/api/orders', input),
    verify: (orderId: string, success: boolean) =>
      client.post<VerifyResult>(`/api/orders/${orderId}/verify`, { success }),
    mine: () => client.get<Order[]>('/api/orders/mine'),
  },
};
