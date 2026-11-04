import { formatPrice, type OrderTotals } from '@eaternity/shared';
import type { ReactNode } from 'react';
import styles from './OrderSummary.module.css';

interface Props {
  totals: OrderTotals;
  children?: ReactNode;
  footer?: ReactNode;
}

export function OrderSummary({ totals, children, footer }: Props) {
  return (
    <aside className={`card ${styles.summary}`} aria-label="Order summary">
      <h2 className={styles.title}>Order summary</h2>
      {children}
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Subtotal</dt>
          <dd>{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className={styles.row}>
          <dt>Delivery</dt>
          <dd>{formatPrice(totals.deliveryFee)}</dd>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <dt>Total</dt>
          <dd>{formatPrice(totals.total)}</dd>
        </div>
      </dl>
      {footer}
    </aside>
  );
}
