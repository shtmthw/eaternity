import { formatPrice } from '@eaternity/shared';
import { formatDate, orderReference } from '@eaternity/ui';
import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '../components/Layout';
import { OrderBadges } from '../components/OrderBadges';
import { isPending, useAdminData } from '../data/AdminData';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  const { foods, orders } = useAdminData();
  const allOrders = orders.data ?? [];
  const paid = allOrders.filter((order) => order.payment);
  const revenue = paid.reduce((sum, order) => sum + order.amount, 0);
  const recent = allOrders.slice(0, 5);

  const stats = [
    { label: 'Menu items', value: foods.data ? String(foods.data.length) : null },
    {
      label: 'Awaiting confirmation',
      value: orders.data ? String(allOrders.filter(isPending).length) : null,
    },
    { label: 'Paid orders', value: orders.data ? String(paid.length) : null },
    { label: 'Revenue', value: orders.data ? formatPrice(revenue) : null },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="A quick look at the menu and recent orders."
        actions={
          <Link to="/items/new" className="btn btn-primary">
            <Plus size={16} aria-hidden="true" />
            Add item
          </Link>
        }
      />

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={`card ${styles.stat}`}>
            <p className={styles.statLabel}>{stat.label}</p>
            {stat.value === null ? (
              <div className="skeleton" style={{ height: 30, width: 60, marginTop: 8 }} />
            ) : (
              <p className={styles.statValue}>{stat.value}</p>
            )}
          </div>
        ))}
      </div>

      <section className={`card ${styles.recent}`} aria-labelledby="recent-title">
        <header className={styles.recentHeader}>
          <h2 id="recent-title" className={styles.recentTitle}>
            Recent orders
          </h2>
          <Link to="/orders" className={styles.viewAll}>
            View all
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>
        {orders.error && <p className={`form-alert ${styles.inset}`}>{orders.error}</p>}
        {orders.data && recent.length === 0 && <p className={styles.empty}>No orders yet.</p>}
        {recent.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th>Status</th>
                <th className={styles.right}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => (
                <tr key={order._id}>
                  <td className={styles.reference}>#{orderReference(order._id)}</td>
                  <td>{order.address.name}</td>
                  <td className="muted">{formatDate(order.createdAt)}</td>
                  <td>
                    <OrderBadges order={order} />
                  </td>
                  <td className={styles.right}>{formatPrice(order.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
