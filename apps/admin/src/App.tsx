import { Navigate, Route, Routes } from 'react-router';
import { useAdminAuth } from './auth/AdminAuth';
import { Layout } from './components/Layout';
import { AdminDataProvider } from './data/AdminData';
import { AddItemPage } from './pages/AddItemPage';
import { ItemsPage } from './pages/ItemsPage';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { OverviewPage } from './pages/OverviewPage';

export function App() {
  const { isSignedIn } = useAdminAuth();
  if (!isSignedIn) return <LoginPage />;

  return (
    <AdminDataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="items/new" element={<AddItemPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AdminDataProvider>
  );
}
