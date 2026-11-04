import { MAX_ITEM_QUANTITY } from '@eaternity/shared';
import { Minus, Plus } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import styles from './QuantityControl.module.css';

interface Props {
  foodId: string;
  name: string;
  size?: 'sm' | 'md';
}

/** "Add" button that turns into a quantity stepper once the item is in the cart. */
export function QuantityControl({ foodId, name, size = 'sm' }: Props) {
  const { cart, addToCart, removeFromCart } = useStore();
  const quantity = cart[foodId] ?? 0;

  if (quantity === 0) {
    return (
      <button
        type="button"
        className={`btn btn-secondary ${size === 'sm' ? 'btn-sm' : ''}`}
        onClick={() => void addToCart(foodId)}
        aria-label={`Add ${name} to cart`}
      >
        <Plus size={15} aria-hidden="true" />
        Add
      </button>
    );
  }

  return (
    <div className={styles.stepper} data-size={size} role="group" aria-label={`Quantity of ${name}`}>
      <button
        type="button"
        className={styles.step}
        onClick={() => void removeFromCart(foodId)}
        aria-label={quantity === 1 ? `Remove ${name} from cart` : `Remove one ${name}`}
      >
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className={styles.value} aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className={styles.step}
        onClick={() => void addToCart(foodId)}
        disabled={quantity >= MAX_ITEM_QUANTITY}
        aria-label={`Add one more ${name}`}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
