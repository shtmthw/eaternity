import { formatPrice, type Order } from '@eaternity/shared';
import { errorMessage, formatDate, orderReference, useToast } from '@eaternity/ui';
import { Check, Mail, MapPin, Phone, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { OrderBadges } from '../components/OrderBadges';
import { isPending, useAdminData } from '../data/AdminData';
import { api } from '../lib/api';
import styles from './OrdersPage.module.css';

const FILTERS = {
  pending: { label: 'Awaiting confirmation', test: isPending },
  confirmed: { label: 'Confirmed', test: (order: Order) => order.status === 'confirmed' },
  all: { label: 'All orders', test: () => true },
} as const;

type FilterKey = keyof typeof FILTERS;

export function OrdersPage() {
  const { orders } = useAdminData();
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const list = (orders.data ?? []).filter(FILTERS[filter].test);

  const refresh = async () => {
    setRefreshing(true);
    await orders.reload();
    setRefreshing(false);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Confirm paid orders to let customers know their food is on the way."
        actions={
          <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={15} aria-hidden="true" className={refreshing ? styles.spinning : undefined} />
            Refresh
          </button>
        }
      />

      <div className={styles.tabs} role="tablist" aria-label="Filter orders">
        {(Object.keys(FILTERS) as FilterKey[]).map((key) => {
          const count = (orders.data ?? []).filter(FILTERS[key].test).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={styles.tab}
              onClick={() => setFilter(key)}
            >
              {FILTERS[key].label}
              <span className={styles.tabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {orders.error && <p className="form-alert">{orders.error}</p>}
      {!orders.data && !orders.error && (
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
      )}
      {orders.data && list.length === 0 && (
        <div className={`card ${styles.empty}`}>
          {filter === 'pending' ? 'Nothing waiting for confirmation.' : 'No orders to show.'}
        </div>
      )}

      <div className={styles.list}>
        {list.map((order) => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    </>
  );
}

function OrderCard({ order }: { order: Order }) {
  const { orders } = useAdminData();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const confirm = async () => {
    setConfirming(true);
    try {
      const updated = await api.orders.confirm(order._id);
      orders.set((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      toast.success(`Order #${orderReference(order._id)} confirmed`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <article className={`card ${styles.order}`}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.reference}>Order #{orderReference(order._id)}</h2>
          <p className={styles.date}>{formatDate(order.createdAt)}</p>
        </div>
        <OrderBadges order={order} />
      </header>

      <div className={styles.body}>
        <div className={styles.customer}>
          <p className={styles.customerName}>{order.address.name}</p>
          <p>
            <Mail size={14} aria-hidden="true" />
            <a href={`mailto:${order.address.email}`}>{order.address.email}</a>
          </p>
          <p>
            <Phone size={14} aria-hidden="true" />
            <a href={`tel:${order.address.phone.replace(/\s/g, '')}`}>{order.address.phone}</a>
          </p>
          <p>
            <MapPin size={14} aria-hidden="true" />
            <span>{order.address.location}</span>
          </p>
        </div>

        <div className={styles.items}>
          <ul>
            {order.items.map((item) => (
              <li key={item.foodId}>
                <span>
                  <span className="muted">{item.quantity} &times;</span> {item.name}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
            <li className="muted">
              <span>Delivery</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </li>
          </ul>
          <p className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(order.amount)}</span>
          </p>
        </div>
      </div>

      {isPending(order) && (
        <footer className={styles.footer}>
          <button type="button" className="btn btn-primary btn-sm" onClick={confirm} disabled={confirming}>
            {confirming ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <Check size={15} aria-hidden="true" />
            )}
            Confirm order
          </button>
        </footer>
      )}
    </article>
  );
}
