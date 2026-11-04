import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { parsePrice } from '../shared/money.ts';

// An empty variable counts as unset, so `STRIPE_SECRET_KEY=` in a compose
// file means "not configured" rather than "configured as an empty string".
const optional = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined);

const flag = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((value) => value === 'true' || value === '1' || value === 'yes');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  DATA_DIR: z.string().trim().min(1).default('./data'),
  PUBLIC_URL: optional.pipe(
    z.url('PUBLIC_URL must be a full URL such as https://food.example.com').optional(),
  ),
  TRUST_PROXY: flag.default(false),

  ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('ADMIN_EMAIL must be an email address'))
    .default('admin@eaternity.local'),
  ADMIN_PASSWORD: optional,

  CURRENCY: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{3}$/, 'CURRENCY must be a three-letter code such as usd')
    .transform((value) => value.toLowerCase())
    .default('usd'),
  DELIVERY_FEE: z
    .string()
    .default('2')
    .transform((value, ctx) => {
      const cents = parsePrice(value);
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'DELIVERY_FEE must be an amount such as 2 or 2.50' });
        return z.NEVER;
      }
      return cents;
    }),

  STRIPE_SECRET_KEY: optional,

  SMTP_HOST: z.string().trim().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: flag.default(true),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  MAIL_FROM: optional,
});

export type MailConfig =
  | { enabled: false }
  | { enabled: true; host: string; port: number; secure: boolean; user: string; pass: string; from: string };

export interface Config {
  env: 'development' | 'production' | 'test';
  port: number;
  dataDir: string;
  databaseFile: string;
  uploadsDir: string;
  clientDir: string;
  publicUrl: string | undefined;
  trustProxy: boolean;
  admin: { email: string; password: string; generatedPasswordFile: string | undefined };
  currency: string;
  deliveryFeeCents: number;
  stripeSecretKey: string | undefined;
  mail: MailConfig;
}

const projectRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Reads the admin password from the data directory, creating it on first start.
 * This way the app runs without any setup and the password survives restarts.
 */
function generatedPassword(file: string): { value: string; created: boolean } {
  if (existsSync(file)) {
    const value = readFileSync(file, 'utf8').trim();
    if (value) return { value, created: false };
  }
  const value = randomBytes(12).toString('base64url');
  writeFileSync(file, `${value}\n`, { mode: 0o600 });
  return { value, created: true };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid configuration:\n${problems.join('\n')}`);
  }
  const vars = parsed.data;

  const dataDir = path.resolve(vars.DATA_DIR);
  const uploadsDir = path.join(dataDir, 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  let adminPassword = vars.ADMIN_PASSWORD;
  let generatedPasswordFile: string | undefined;
  if (!adminPassword) {
    generatedPasswordFile = path.join(dataDir, 'admin-password');
    const generated = generatedPassword(generatedPasswordFile);
    adminPassword = generated.value;
    if (generated.created) console.log(`Generated an admin password: ${adminPassword}`);
  }

  return {
    env: vars.NODE_ENV,
    port: vars.PORT,
    dataDir,
    databaseFile: path.join(dataDir, 'eaternity.db'),
    uploadsDir,
    clientDir: path.join(projectRoot, 'dist'),
    publicUrl: vars.PUBLIC_URL?.replace(/\/+$/, ''),
    trustProxy: vars.TRUST_PROXY,
    admin: { email: vars.ADMIN_EMAIL, password: adminPassword, generatedPasswordFile },
    currency: vars.CURRENCY,
    deliveryFeeCents: vars.DELIVERY_FEE,
    stripeSecretKey: vars.STRIPE_SECRET_KEY,
    mail:
      vars.SMTP_USER && vars.SMTP_PASS
        ? {
            enabled: true,
            host: vars.SMTP_HOST,
            port: vars.SMTP_PORT,
            secure: vars.SMTP_SECURE,
            user: vars.SMTP_USER,
            pass: vars.SMTP_PASS,
            from: vars.MAIL_FROM ?? vars.SMTP_USER,
          }
        : { enabled: false },
  };
}
