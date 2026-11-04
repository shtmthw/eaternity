import { Logo } from '@eaternity/ui';
import { Search, ShoppingBag } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { useStore } from '../store/StoreContext';
import { AccountMenu } from './AccountMenu';
import styles from './Navbar.module.css';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

const shortcutHint = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';

export function Navbar() {
  const { cartCount, user, openAuth, setSearchOpen } = useStore();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Eaternity home">
          <Logo height={26} />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Menu
          </NavLink>
          <NavLink to="/myorders" className={navClass}>
            Orders
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={`btn btn-ghost ${styles.search}`}
            onClick={() => setSearchOpen(true)}
            aria-label="Search the menu"
          >
            <Search size={18} aria-hidden="true" />
            <span className={styles.searchLabel}>Search</span>
            <kbd className={styles.kbd}>{shortcutHint}</kbd>
          </button>

          <Link
            to="/cart"
            className={`btn btn-ghost btn-icon ${styles.cart}`}
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
          >
            <ShoppingBag size={19} aria-hidden="true" />
            {cartCount > 0 && <span className={styles.count}>{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>

          {user ? (
            <AccountMenu user={user} />
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAuth('signin')}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
