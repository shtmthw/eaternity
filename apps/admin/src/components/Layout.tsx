import { Logo, useToast } from '@eaternity/ui';
import { LayoutDashboard, ListOrdered, LogOut, PlusCircle, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAdminAuth } from '../auth/AdminAuth';
import { isPending, useAdminData } from '../data/AdminData';
import styles from './Layout.module.css';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export function Layout() {
  const { email, signOut } = useAdminAuth();
  const { orders } = useAdminData();
  const toast = useToast();
  const pending = orders.data?.filter(isPending).length ?? 0;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo height={24} />
          <span className={styles.tag}>Admin</span>
        </div>

        <nav className={styles.nav} aria-label="Admin">
          <NavLink to="/" end className={navClass}>
            <LayoutDashboard size={17} aria-hidden="true" />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/items" end className={navClass}>
            <UtensilsCrossed size={17} aria-hidden="true" />
            <span>Menu items</span>
          </NavLink>
          <NavLink to="/items/new" className={navClass}>
            <PlusCircle size={17} aria-hidden="true" />
            <span>Add item</span>
          </NavLink>
          <NavLink to="/orders" className={navClass}>
            <ListOrdered size={17} aria-hidden="true" />
            <span>Orders</span>
            {pending > 0 && (
              <span className={styles.count} aria-label={`${pending} awaiting confirmation`}>
                {pending}
              </span>
            )}
          </NavLink>
        </nav>

        <div className={styles.account}>
          <p className={styles.email} title={email ?? undefined}>
            {email}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              signOut();
              toast.success('Signed out');
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDescription}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}
