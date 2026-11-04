import { DELIVERY_FEE, type PublicConfig } from '@eaternity/shared';
import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppContext } from './context';
import { isDatabaseConnected } from './db';
import { apiNotFound, errorHandler, send } from './lib/http';
import { adminRouter } from './routes/admin';
import { cartRouter } from './routes/cart';
import { foodsRouter } from './routes/foods';
import { ordersRouter } from './routes/orders';
import { usersRouter } from './routes/users';

/**
 * Serves a built single-page app. Hashed assets are cached for a year,
 * everything else falls back to index.html so client-side routes work.
 */
function serveSpa(app: Express, mountPath: '/' | '/admin', directory: string): boolean {
  const indexFile = path.join(directory, 'index.html');
  if (!existsSync(indexFile)) return false;

  app.use(
    mountPath,
    express.static(directory, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  const pattern = mountPath === '/' ? '/{*path}' : `${mountPath}{/*path}`;
  app.get(pattern, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return true;
}

export function createApp(context: AppContext): Express {
  const { config, payments } = context;
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'blob:'],
          // Plain HTTP must keep working for local and LAN use.
          'upgrade-insecure-requests': null,
        },
      },
      strictTransportSecurity: false,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    const database = isDatabaseConnected() ? 'up' : 'down';
    res
      .status(database === 'up' ? 200 : 503)
      .json({ status: database === 'up' ? 'ok' : 'degraded', database });
  });
  app.get('/api/config', (_req, res) => {
    send<PublicConfig>(res, { paymentMode: payments.mode, deliveryFee: DELIVERY_FEE });
  });

  app.use('/api/users', usersRouter(context));
  app.use('/api/admin', adminRouter(context));
  app.use('/api/foods', foodsRouter(context));
  app.use('/api/cart', cartRouter(context));
  app.use('/api/orders', ordersRouter(context));
  app.use('/api', apiNotFound);

  app.use(
    '/images',
    express.static(config.uploadsDir, { maxAge: '30d', immutable: true, fallthrough: false }),
  );

  serveSpa(app, '/admin', config.adminDir);
  serveSpa(app, '/', config.webDir);

  app.use(errorHandler);
  return app;
}
