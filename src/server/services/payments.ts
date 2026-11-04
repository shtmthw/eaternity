import Stripe from 'stripe';

export interface CheckoutOrder {
  id: number;
  currency: string;
  email: string;
  deliveryCents: number;
  items: { name: string; priceCents: number; quantity: number }[];
}

export type Payments =
  | { mode: 'demo' }
  | {
      mode: 'stripe';
      createCheckout(order: CheckoutOrder, baseUrl: string): Promise<{ url: string; sessionId: string }>;
      isPaid(sessionId: string): Promise<boolean>;
    };

// Stripe takes these currencies in whole units instead of hundredths.
// https://docs.stripe.com/currencies#zero-decimal
const ZERO_DECIMAL = new Set('bif clp djf gnf jpy kmf krw mga pyg rwf ugx vnd vuv xaf xof xpf'.split(' '));

export function stripeAmount(cents: number, currency: string): number {
  return ZERO_DECIMAL.has(currency) ? Math.round(cents / 100) : cents;
}

export function createPayments(secretKey: string | undefined): Payments {
  if (!secretKey) return { mode: 'demo' };
  const stripe = new Stripe(secretKey);

  return {
    mode: 'stripe',
    async createCheckout(order, baseUrl) {
      const line = (name: string, cents: number, quantity: number) => ({
        quantity,
        price_data: {
          currency: order.currency,
          unit_amount: stripeAmount(cents, order.currency),
          product_data: { name },
        },
      });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: order.email,
        client_reference_id: String(order.id),
        metadata: { orderId: String(order.id) },
        line_items: [
          ...order.items.map((item) => line(item.name, item.priceCents, item.quantity)),
          ...(order.deliveryCents > 0 ? [line('Delivery', order.deliveryCents, 1)] : []),
        ],
        success_url: `${baseUrl}/orders/${order.id}?checkout=done`,
        cancel_url: `${baseUrl}/checkout?cancelled=${order.id}`,
      });
      if (!session.url) throw new Error('Stripe did not return a checkout URL');
      return { url: session.url, sessionId: session.id };
    },
    async isPaid(sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    },
  };
}
