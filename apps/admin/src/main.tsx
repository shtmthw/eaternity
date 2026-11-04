import '@eaternity/ui/styles.css';
import { ToastProvider } from '@eaternity/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AdminAuthProvider } from './auth/AdminAuth';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename="/admin">
      <ToastProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
