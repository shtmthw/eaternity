import nodemailer from 'nodemailer';
import { formatMoney } from '../../shared/money.ts';
import type { MailConfig } from '../config.ts';

export interface ConfirmationEmail {
  id: number;
  name: string;
  email: string;
  address: string;
  currency: string;
  totalCents: number;
  items: { name: string; quantity: number }[];
}

export interface Mailer {
  enabled: boolean;
  sendConfirmation(order: ConfirmationEmail): Promise<void>;
}

export function createMailer(config: MailConfig): Mailer {
  if (!config.enabled) return { enabled: false, async sendConfirmation() {} };

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  return {
    enabled: true,
    async sendConfirmation(order) {
      const text = [
        `Hi ${order.name},`,
        '',
        `The kitchen has confirmed order #${order.id}:`,
        '',
        ...order.items.map((item) => `  ${item.quantity} x ${item.name}`),
        '',
        `Total: ${formatMoney(order.totalCents, order.currency, 'en')}`,
        `Delivering to: ${order.address}`,
        '',
        'Thanks for ordering with Eaternity.',
      ].join('\n');

      await transport.sendMail({
        from: `Eaternity <${config.from}>`,
        to: order.email,
        subject: `Order #${order.id} is confirmed`,
        text,
      });
    },
  };
}
