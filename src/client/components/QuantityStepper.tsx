import { Minus, Plus } from 'lucide-react';
import { MAX_QUANTITY } from '../../shared/constants.ts';
import { cartActions } from '../lib/cart.ts';

export function QuantityStepper({
  dishId,
  quantity,
  name,
}: {
  dishId: number;
  quantity: number;
  name: string;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-full border border-stone-200">
      <button
        type="button"
        className="grid size-8 place-items-center rounded-full text-stone-500 hover:text-stone-900"
        onClick={() => cartActions.remove(dishId)}
        aria-label={quantity === 1 ? `Remove ${name}` : `One less ${name}`}
      >
        <Minus size={14} />
      </button>
      <span className="min-w-5 text-center text-[13px] font-medium tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="grid size-8 place-items-center rounded-full text-stone-500 hover:text-stone-900 disabled:opacity-30"
        onClick={() => cartActions.add(dishId)}
        disabled={quantity >= MAX_QUANTITY}
        aria-label={`One more ${name}`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
