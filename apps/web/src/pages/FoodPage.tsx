import { formatPrice } from '@eaternity/shared';
import { imageUrl } from '@eaternity/ui';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import { QuantityControl } from '../components/QuantityControl';
import { useStore } from '../store/StoreContext';
import styles from './FoodPage.module.css';

export function FoodPage() {
  const { id } = useParams();
  const { foods, foodsStatus, cart } = useStore();
  const food = foods.find((item) => item._id === id);

  if (foodsStatus === 'loading') {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.layout}>
          <div className={`skeleton ${styles.media}`} />
          <div>
            <div className="skeleton" style={{ height: 36, width: '70%' }} />
            <div className="skeleton" style={{ height: 16, width: '90%', marginTop: 20 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!food) {
    return (
      <div className={`container ${styles.page}`}>
        <EmptyState
          icon={SearchX}
          title="This dish is not on the menu"
          action={
            <Link to="/" className="btn btn-secondary">
              Back to the menu
            </Link>
          }
        >
          It may have been removed. Have a look at what else we are cooking.
        </EmptyState>
      </div>
    );
  }

  const inCart = (cart[food._id] ?? 0) > 0;

  return (
    <div className={`container ${styles.page}`}>
      <Link to="/" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the menu
      </Link>
      <div className={styles.layout}>
        <div className={styles.media}>
          <img src={imageUrl(food.image)} alt={food.name} />
        </div>
        <div className={styles.details}>
          <span className="badge">{food.category}</span>
          <h1 className={styles.title}>{food.name}</h1>
          <p className={styles.price}>{formatPrice(food.price)}</p>
          <p className={styles.description}>{food.description}</p>
          <div className={styles.actions}>
            <QuantityControl foodId={food._id} name={food.name} size="md" />
            {inCart && (
              <Link to="/cart" className="btn btn-primary">
                View cart
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
