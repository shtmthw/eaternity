import {
  calculateTotals,
  objectIdSchema,
  placeOrderSchema,
  verifyOrderSchema,
  type Order,
  type OrderItem,
  type PlaceOrderResult,
} from '@eaternity/shared';
import { Router, type Request } from 'express';
import type { AppContext } from '../context';
import { HttpError, parse, send } from '../lib/http';
import { currentUserId, requireAdmin, requireUser } from '../middleware/auth';
import { FoodModel } from '../models/food';
import { OrderModel, toOrder } from '../models/order';
import { UserModel } from '../models/user';

export interface VerifyResult {
  paid: boolean;
  order?: Order;
}

export function ordersRouter({ config, tokens, payments, mailer }: AppContext): Router {
  const router = Router();
  const user = requireUser(tokens);
  const admin = requireAdmin(tokens);

  /** Where Stripe should send the customer back to. */
  const baseUrl = (req: Request) => config.publicUrl ?? `${req.protocol}://${req.get('host')}`;

  router.post('/', user, async (req, res) => {
    const userId = currentUserId(req);
    const { items: requested, address } = parse(placeOrderSchema, req.body);

    // Prices always come from the database, never from the client.
    const quantities = new Map<string, number>();
    for (const { foodId, quantity } of requested) {
      quantities.set(foodId, (quantities.get(foodId) ?? 0) + quantity);
    }
    const foods = await FoodModel.find({ _id: { $in: [...quantities.keys()] } }).lean();
    if (foods.length !== quantities.size) {
      throw new HttpError(409, 'Some items in your cart are no longer available');
    }

    const items: OrderItem[] = foods.map((food) => ({
      foodId: food._id.toString(),
      name: food.name,
      price: food.price,
      quantity: quantities.get(food._id.toString()) ?? 1,
    }));
    const { subtotal, deliveryFee, total } = calculateTotals(items);

    const order = await OrderModel.create({
      userId,
      items,
      subtotal,
      deliveryFee,
      amount: total,
      address,
    });

    try {
      const checkout = await payments.createCheckout(order, baseUrl(req));
      if (checkout.sessionId) {
        order.paymentSessionId = checkout.sessionId;
        await order.save();
      }
      send<PlaceOrderResult>(
        res,
        { orderId: order._id.toString(), checkoutUrl: checkout.url },
        { status: 201 },
      );
    } catch (error) {
      await order.deleteOne();
      console.error('Could not create a checkout session:', error);
      throw new HttpError(502, 'Payment could not be started. Please try again.');
    }
  });

  router.post('/:id/verify', user, async (req, res) => {
    const userId = currentUserId(req);
    const id = parse(objectIdSchema, req.params.id);
    const { success } = parse(verifyOrderSchema, req.body);

    const order = await OrderModel.findOne({ _id: id, userId });
    if (!order) throw new HttpError(404, 'Order not found');

    if (order.payment) {
      send<VerifyResult>(res, { paid: true, order: toOrder(order) }, { message: 'Payment received' });
      return;
    }

    // Ask the provider even on the cancel path, so a paid order is never thrown away.
    const paid = success
      ? await payments.isPaid(order)
      : payments.mode === 'stripe' && (await payments.isPaid(order));

    if (!paid && !success) {
      await order.deleteOne();
      send<VerifyResult>(res, { paid: false }, { message: 'Payment was cancelled' });
      return;
    }
    if (!paid) throw new HttpError(402, 'We have not received your payment yet');

    order.payment = true;
    await order.save();
    await UserModel.updateOne({ _id: userId }, { $set: { cart: {} } });
    send<VerifyResult>(res, { paid: true, order: toOrder(order) }, { message: 'Payment received' });
  });

  router.get('/mine', user, async (req, res) => {
    const orders = await OrderModel.find({ userId: currentUserId(req) })
      .sort({ createdAt: -1 })
      .lean();
    send<Order[]>(res, orders.map(toOrder));
  });

  router.get('/', admin, async (_req, res) => {
    const orders = await OrderModel.find().sort({ createdAt: -1 }).lean();
    send<Order[]>(res, orders.map(toOrder));
  });

  router.post('/:id/confirm', admin, async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const order = await OrderModel.findById(id);
    if (!order) throw new HttpError(404, 'Order not found');
    if (!order.payment) throw new HttpError(409, 'This order has not been paid for yet');

    if (order.status === 'confirmed') {
      send<Order>(res, toOrder(order), { message: 'Order was already confirmed' });
      return;
    }

    order.status = 'confirmed';
    await order.save();
    const confirmed = toOrder(order);

    let message = 'Order confirmed';
    if (mailer.enabled) {
      try {
        await mailer.sendOrderConfirmation(confirmed);
        message = `Order confirmed and ${confirmed.address.email} was notified`;
      } catch (error) {
        console.error('Could not send the confirmation email:', error);
        message = 'Order confirmed, but the confirmation email could not be sent';
      }
    }
    send<Order>(res, confirmed, { message });
  });

  return router;
}
