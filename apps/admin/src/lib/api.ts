import type { AdminAuthResult, Food, LoginInput, Order } from '@eaternity/shared';
import { createApiClient } from '@eaternity/ui';

export const ADMIN_TOKEN_KEY = 'eaternity.admin.token';

let handleUnauthorized: () => void = () => {};

export function setUnauthorizedHandler(handler: () => void) {
  handleUnauthorized = handler;
}

const client = createApiClient({
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  onUnauthorized: () => handleUnauthorized(),
});

export const api = {
  login: (input: LoginInput) => client.post<AdminAuthResult>('/api/admin/login', input),
  me: () => client.get<{ email: string }>('/api/admin/me'),

  foods: {
    list: () => client.get<Food[]>('/api/foods'),
    create: (form: FormData) => client.postForm<Food>('/api/foods', form),
    remove: (id: string) => client.delete<Food>(`/api/foods/${id}`),
  },

  orders: {
    list: () => client.get<Order[]>('/api/orders'),
    confirm: (id: string) => client.post<Order>(`/api/orders/${id}/confirm`),
  },
};
