import { formatPrice, type Food } from '@eaternity/shared';
import { imageUrl } from '@eaternity/ui';
import { Link } from 'react-router';
import { QuantityControl } from './QuantityControl';
import styles from './FoodCard.module.css';

export function FoodCard({ food }: { food: Food }) {
  return (
    <article className={styles.card}>
      <Link to={`/food/${food._id}`} className={styles.media} tabIndex={-1} aria-hidden="true">
        <img src={imageUrl(food.image)} alt="" loading="lazy" />
      </Link>
      <div className={styles.body}>
        <div className={styles.heading}>
          <h3 className={styles.name}>
            <Link to={`/food/${food._id}`}>{food.name}</Link>
          </h3>
          <span className={styles.price}>{formatPrice(food.price)}</span>
        </div>
        <p className={styles.description}>{food.description}</p>
        <div className={styles.footer}>
          <span className="badge">{food.category}</span>
          <QuantityControl foodId={food._id} name={food.name} />
        </div>
      </div>
    </article>
  );
}

export function FoodCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.media} skeleton`} style={{ borderRadius: 0 }} />
      <div className={styles.body}>
        <div className="skeleton" style={{ height: 18, width: '60%' }} />
        <div className="skeleton" style={{ height: 14, width: '90%', marginTop: 12 }} />
        <div className="skeleton" style={{ height: 14, width: '70%', marginTop: 8 }} />
        <div className={styles.footer}>
          <div className="skeleton" style={{ height: 22, width: 64, borderRadius: 999 }} />
          <div className="skeleton" style={{ height: 32, width: 72 }} />
        </div>
      </div>
    </div>
  );
}
