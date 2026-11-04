import Stripe from 'stripe';
import type { Config } from '../config';
import type { OrderRecord } from '../models/order';

type PayableOrder = Pick<OrderRecord, 'items' | 'deliveryFee' | 'paymentSessionId'> & {
  _id: { toString(): string };
};

export interface CheckoutSession {
  url: string;
  sessionId?: string;
}

export interface PaymentProvider {
  mode: 'stripe' | 'demo';
  createCheckout(order: PayableOrder, baseUrl: string): Promise<CheckoutSession>;
  isPaid(order: PayableOrder): Promise<boolean>;
}

function verifyUrl(baseUrl: string, orderId: string, success: boolean) {
  const params = new URLSearchParams({ success: String(success), orderId });
  return `${baseUrl}/verify?${params.toString()}`;
}

function createStripeProvider(secretKey: string, currency: string, exchangeRate: number): PaymentProvider {
  const stripe = new Stripe(secretKey);
  const toMinorUnits = (usd: number) => Math.round(usd * exchangeRate * 100);

  return {
    mode: 'stripe',
    async createCheckout(order, baseUrl) {
      const orderId = order._id.toString();
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
        price_data: {
          currency,
          product_data: { name: item.name },
          unit_amount: toMinorUnits(item.price),
        },
        quantity: item.quantity,
      }));

      if (order.deliveryFee > 0) {
        lineItems.push({
          price_data: {
            currency,
            product_data: { name: 'Delivery' },
            unit_amount: toMinorUnits(order.deliveryFee),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        metadata: { orderId },
        success_url: verifyUrl(baseUrl, orderId, true),
        cancel_url: verifyUrl(baseUrl, orderId, false),
      });

      if (!session.url) throw new Error('Stripe did not return a checkout URL');
      return { url: session.url, sessionId: session.id };
    },
    async isPaid(order) {
      if (!order.paymentSessionId) return false;
      const session = await stripe.checkout.sessions.retrieve(order.paymentSessionId);
      return session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    },
  };
}

/** Used when no Stripe key is configured: checkout goes straight to the success page. */
const demoProvider: PaymentProvider = {
  mode: 'demo',
  async createCheckout(order, baseUrl) {
    return { url: verifyUrl(baseUrl, order._id.toString(), true) };
  },
  async isPaid() {
    return true;
  },
};

export function createPaymentProvider(config: Config['payments']): PaymentProvider {
  return config.stripeSecretKey
    ? createStripeProvider(config.stripeSecretKey, config.currency, config.exchangeRate)
    : demoProvider;
}
