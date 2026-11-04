import { ORDER_STATUS_LABELS, formatPrice, type Order } from '@eaternity/shared';
import { errorMessage, formatDate, orderReference } from '@eaternity/ui';
import { ReceiptText, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { useStore } from '../store/StoreContext';
import styles from './OrdersPage.module.css';

export function OrdersPage() {
  const { user, openAuth } = useStore();

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Your orders</h1>
      {user ? (
        <OrderList key={user.id} />
      ) : (
        <EmptyState
          icon={UserRound}
          title="Sign in to see your orders"
          action={
            <button type="button" className="btn btn-primary" onClick={() => openAuth('signin')}>
              Sign in
            </button>
          }
        >
          Your order history and delivery status live in your account.
        </EmptyState>
      )}
    </div>
  );
}

function OrderList() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.orders.mine().then(
      (result) => !cancelled && setOrders(result),
      (failure: unknown) => !cancelled && setError(errorMessage(failure)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="form-alert">{error}</p>;

  if (!orders) {
    return (
      <div className={styles.list}>
        {[0, 1].map((key) => (
          <div key={key} className="skeleton" style={{ height: 160, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No orders yet"
        action={
          <Link to="/" className="btn btn-primary">
            Browse the menu
          </Link>
        }
      >
        When you place an order it will show up here with its status.
      </EmptyState>
    );
  }

  return (
    <div className={styles.list}>
      {orders.map((order) => (
        <article key={order._id} className={`card ${styles.order}`}>
          <header className={styles.header}>
            <div>
              <h2 className={styles.reference}>Order #{orderReference(order._id)}</h2>
              <p className={styles.date}>{formatDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge order={order} />
          </header>
          <ul className={styles.items}>
            {order.items.map((item) => (
              <li key={item.foodId}>
                <span>
                  <span className="muted">{item.quantity} &times;</span> {item.name}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <footer className={styles.footer}>
            <span className="muted">Delivery {formatPrice(order.deliveryFee)}</span>
            <span className={styles.total}>Total {formatPrice(order.amount)}</span>
          </footer>
        </article>
      ))}
    </div>
  );
}

function OrderStatusBadge({ order }: { order: Order }) {
  if (!order.payment) return <span className="badge badge-warning">Awaiting payment</span>;
  return (
    <span className={`badge ${order.status === 'confirmed' ? 'badge-success' : ''}`}>
      {ORDER_STATUS_LABELS[order.status]}
    </span>
  );
}
