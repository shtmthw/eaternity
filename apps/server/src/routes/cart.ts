import {
  MAX_ITEM_QUANTITY,
  cartItemSchema,
  mergeCartSchema,
  objectIdSchema,
  type Cart,
} from '@eaternity/shared';
import { Router } from 'express';
import type { AppContext } from '../context';
import { HttpError, parse, send } from '../lib/http';
import { currentUserId, requireUser } from '../middleware/auth';
import { FoodModel } from '../models/food';
import { UserModel, cleanCart } from '../models/user';

async function loadCart(userId: string): Promise<Cart> {
  const user = await UserModel.findById(userId, { cart: 1 }).lean();
  if (!user) throw new HttpError(401, 'Your account no longer exists');
  return cleanCart(user.cart);
}

export function cartRouter({ tokens }: AppContext): Router {
  const router = Router();
  router.use(requireUser(tokens));

  router.get('/', async (req, res) => {
    send<Cart>(res, await loadCart(currentUserId(req)));
  });

  router.post('/items', async (req, res) => {
    const userId = currentUserId(req);
    const { foodId } = parse(cartItemSchema, req.body);
    if (!(await FoodModel.exists({ _id: foodId }))) {
      throw new HttpError(404, 'This item is no longer available');
    }

    const path = `cart.${foodId}`;
    await UserModel.updateOne(
      { _id: userId, $or: [{ [path]: { $exists: false } }, { [path]: { $lt: MAX_ITEM_QUANTITY } }] },
      { $inc: { [path]: 1 } },
    );
    send<Cart>(res, await loadCart(userId), { message: 'Added to cart' });
  });

  router.delete('/items/:foodId', async (req, res) => {
    const userId = currentUserId(req);
    const foodId = parse(objectIdSchema, req.params.foodId);
    const path = `cart.${foodId}`;

    // Decrement while more than one remains, otherwise drop the line entirely.
    const decremented = await UserModel.updateOne(
      { _id: userId, [path]: { $gt: 1 } },
      { $inc: { [path]: -1 } },
    );
    if (decremented.matchedCount === 0) {
      await UserModel.updateOne({ _id: userId }, { $unset: { [path]: '' } });
    }
    send<Cart>(res, await loadCart(userId), { message: 'Removed from cart' });
  });

  /** Adds a guest cart to the account cart after signing in. */
  router.post('/merge', async (req, res) => {
    const userId = currentUserId(req);
    const { cart: guestCart } = parse(mergeCartSchema, req.body);
    const ids = Object.keys(guestCart);

    if (ids.length > 0) {
      const existing = await FoodModel.find({ _id: { $in: ids } }, { _id: 1 }).lean();
      const current = await loadCart(userId);
      const updates: Record<string, number> = {};
      for (const { _id } of existing) {
        const id = _id.toString();
        const merged = (current[id] ?? 0) + (guestCart[id] ?? 0);
        updates[`cart.${id}`] = Math.min(merged, MAX_ITEM_QUANTITY);
      }
      if (Object.keys(updates).length > 0) {
        await UserModel.updateOne({ _id: userId }, { $set: updates });
      }
    }
    send<Cart>(res, await loadCart(userId));
  });

  return router;
}
