import { existsSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDatabase } from './db/client.ts';
import { deleteExpiredSessions, ensureAdmin } from './services/auth.ts';
import { removeUnusedImages } from './services/images.ts';
import { createMailer } from './services/mail.ts';
import { createPayments } from './services/payments.ts';
import { createRateLimiter } from './services/rate-limit.ts';

const HOUR = 60 * 60 * 1000;

async function main() {
  const config = loadConfig();
  const db = openDatabase(config.databaseFile);
  await ensureAdmin(db, config.admin.email, config.admin.password);

  const services = {
    config,
    db,
    payments: createPayments(config.stripeSecretKey),
    mailer: createMailer(config.mail),
    signInLimiter: createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 }),
    signUpLimiter: createRateLimiter({ limit: 30, windowMs: 15 * 60 * 1000 }),
  };

  const housekeeping = async () => {
    deleteExpiredSessions(db);
    await removeUnusedImages(db, config.uploadsDir);
  };
  await housekeeping();
  setInterval(() => void housekeeping().catch(console.error), 6 * HOUR).unref();

  const server = serve({ fetch: createApp(services).fetch, port: config.port }, () => {
    const origin = config.publicUrl ?? `http://localhost:${config.port}`;
    const hasClient = existsSync(path.join(config.clientDir, 'index.html'));
    const adminPassword = config.admin.generatedPasswordFile
      ? `password in ${config.admin.generatedPasswordFile}`
      : 'password from ADMIN_PASSWORD';

    console.log(`Eaternity is listening on port ${config.port}`);
    if (hasClient) console.log(`  Shop:     ${origin}`);
    if (hasClient) console.log(`  Admin:    ${origin}/admin`);
    console.log(`  Sign in:  ${config.admin.email} (${adminPassword})`);
    console.log(
      `  Payments: ${services.payments.mode === 'stripe' ? 'Stripe' : 'demo mode, no STRIPE_SECRET_KEY'}`,
    );
    console.log(`  Email:    ${services.mailer.enabled ? 'on' : 'off, no SMTP_USER and SMTP_PASS'}`);
  });

  const shutdown = () => {
    server.close(() => {
      db.$client.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
