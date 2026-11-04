import { existsSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadConfig } from './config';
import { createContext } from './context';
import { connectDatabase } from './db';

async function main() {
  const config = loadConfig();
  const context = createContext(config);

  await connectDatabase(config.mongoUri);

  const app = createApp(context);
  const server = app.listen(config.port, () => {
    const origin = config.publicUrl ?? `http://localhost:${config.port}`;
    const hasWeb = existsSync(path.join(config.webDir, 'index.html'));
    const hasAdmin = existsSync(path.join(config.adminDir, 'index.html'));

    console.log(`Eaternity API listening on port ${config.port}`);
    if (hasWeb) console.log(`  Shop:        ${origin}/`);
    if (hasAdmin) console.log(`  Admin panel: ${origin}/admin (sign in as ${config.admin.email})`);
    console.log(
      `  Payments:    ${context.payments.mode === 'stripe' ? 'Stripe' : 'demo mode (no STRIPE_SECRET_KEY set)'}`,
    );
    console.log(
      `  Email:       ${context.mailer.enabled ? 'enabled' : 'disabled (no SMTP_USER/SMTP_PASS set)'}`,
    );
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down`);
    server.close(() => {
      void mongoose.disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
