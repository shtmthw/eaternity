import { Logo } from '@eaternity/ui';
import { Link } from 'react-router';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo height={22} />
          <p className="muted">Fresh meals, cooked to order and delivered to your door.</p>
        </div>
        <nav className={styles.links} aria-label="Footer">
          <Link to="/">Menu</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/myorders">Orders</Link>
        </nav>
      </div>
      <div className={`container ${styles.bottom}`}>
        <p>&copy; {new Date().getFullYear()} Eaternity</p>
      </div>
    </footer>
  );
}
