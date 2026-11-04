import { formatPrice } from '@eaternity/shared';
import { imageUrl } from '@eaternity/ui';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import { OrderSummary } from '../components/OrderSummary';
import { QuantityControl } from '../components/QuantityControl';
import { useStore } from '../store/StoreContext';
import styles from './CartPage.module.css';

export function CartPage() {
  const { cartLines, totals, foodsStatus, cartReady } = useStore();
  const navigate = useNavigate();

  if (foodsStatus === 'loading' || !cartReady) return null;

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Your cart</h1>

      {cartLines.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          action={
            <Link to="/" className="btn btn-primary">
              Browse the menu
            </Link>
          }
        >
          Add a few dishes from the menu and they will show up here.
        </EmptyState>
      ) : (
        <div className={styles.layout}>
          <ul className={`card ${styles.lines}`}>
            {cartLines.map(({ food, quantity }) => (
              <li key={food._id} className={styles.line}>
                <Link to={`/food/${food._id}`} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                  <img src={imageUrl(food.image)} alt="" />
                </Link>
                <div className={styles.info}>
                  <Link to={`/food/${food._id}`} className={styles.name}>
                    {food.name}
                  </Link>
                  <span className={styles.unit}>{formatPrice(food.price)} each</span>
                </div>
                <QuantityControl foodId={food._id} name={food.name} />
                <span className={styles.lineTotal}>{formatPrice(food.price * quantity)}</span>
              </li>
            ))}
          </ul>

          <OrderSummary
            totals={totals}
            footer={
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={() => navigate('/checkout')}
              >
                Continue to checkout
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
