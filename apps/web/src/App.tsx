import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { AuthDialog } from './components/AuthDialog';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SearchDialog } from './components/SearchDialog';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { FoodPage } from './pages/FoodPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrdersPage } from './pages/OrdersPage';
import { VerifyPage } from './pages/VerifyPage';
import { useStore } from './store/StoreContext';
import styles from './App.module.css';

export function App() {
  const { setSearchOpen } = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/food/:id" element={<FoodPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/myorders" element={<OrdersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <AuthDialog />
      <SearchDialog />
    </div>
  );
}
