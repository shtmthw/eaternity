import { APP_NAME, formatPrice, type Order } from '@eaternity/shared';
import nodemailer from 'nodemailer';
import type { Config } from '../config';

export interface Mailer {
  enabled: boolean;
  sendOrderConfirmation(order: Order): Promise<void>;
}

export function createMailer(config: Config['mail']): Mailer {
  if (!config.enabled) {
    return {
      enabled: false,
      async sendOrderConfirmation() {},
    };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  return {
    enabled: true,
    async sendOrderConfirmation(order) {
      const lines = order.items.map((item) => `  ${item.quantity} x ${item.name}`);
      const text = [
        `Hi ${order.address.name},`,
        '',
        'Your order has been confirmed and is on its way:',
        '',
        ...lines,
        '',
        `Total: ${formatPrice(order.amount)}`,
        `Delivering to: ${order.address.location}`,
        '',
        `Thanks for ordering with ${APP_NAME}.`,
      ].join('\n');

      await transport.sendMail({
        from: `${APP_NAME} <${config.from}>`,
        to: order.address.email,
        subject: `Your ${APP_NAME} order is confirmed`,
        text,
      });
    },
  };
}
