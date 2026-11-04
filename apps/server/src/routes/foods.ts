import { foodInputSchema, objectIdSchema, type Food } from '@eaternity/shared';
import { Router } from 'express';
import type { AppContext } from '../context';
import { HttpError, parse, send } from '../lib/http';
import { requireAdmin } from '../middleware/auth';
import { FoodModel, toFood } from '../models/food';
import { UserModel } from '../models/user';
import { createImageUpload, removeImage } from '../services/uploads';

export function foodsRouter({ config, tokens }: AppContext): Router {
  const router = Router();
  const upload = createImageUpload(config.uploadsDir);

  router.get('/', async (_req, res) => {
    const foods = await FoodModel.find().sort({ createdAt: 1 }).lean();
    send<Food[]>(res, foods.map(toFood));
  });

  router.post('/', requireAdmin(tokens), upload.single('image'), async (req, res) => {
    const file = req.file;
    try {
      if (!file) throw new HttpError(400, 'Choose an image for this item');
      const input = parse(foodInputSchema, req.body);
      const food = await FoodModel.create({ ...input, image: file.filename });
      send<Food>(res, toFood(food), { message: 'Item added', status: 201 });
    } catch (error) {
      if (file) await removeImage(config.uploadsDir, file.filename);
      throw error;
    }
  });

  router.delete('/:id', requireAdmin(tokens), async (req, res) => {
    const id = parse(objectIdSchema, req.params.id);
    const food = await FoodModel.findByIdAndDelete(id).lean();
    if (!food) throw new HttpError(404, 'Item not found');

    await Promise.all([
      removeImage(config.uploadsDir, food.image),
      UserModel.updateMany({ [`cart.${id}`]: { $exists: true } }, { $unset: { [`cart.${id}`]: '' } }),
    ]);
    send<Food>(res, toFood(food), { message: 'Item removed' });
  });

  return router;
}
