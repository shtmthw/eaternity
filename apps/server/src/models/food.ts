import { CATEGORIES, type Category, type Food } from '@eaternity/shared';
import { Schema, model, type Types } from 'mongoose';

export interface FoodRecord {
  name: string;
  description: string;
  price: number;
  image: string;
  category: Category;
  createdAt: Date;
  updatedAt: Date;
}

const foodSchema = new Schema<FoodRecord>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    category: { type: String, required: true, enum: CATEGORIES },
  },
  { timestamps: true },
);

export const FoodModel = model<FoodRecord>('Food', foodSchema);

export function toFood(doc: FoodRecord & { _id: Types.ObjectId }): Food {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    price: doc.price,
    image: doc.image,
    category: doc.category,
  };
}
