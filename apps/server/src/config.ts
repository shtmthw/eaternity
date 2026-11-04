import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Treats unset and empty variables the same, so `FOO=` in a compose file means "not configured". */
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const booleanString = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((value) => ['true', '1', 'yes'].includes(value));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  MONGODB_URI: z.string().trim().min(1).default('mongodb://127.0.0.1:27017/eaternity'),
  DATA_DIR: z.string().trim().min(1).default('./data'),
  PUBLIC_URL: optionalString,
  JWT_SECRET: optionalString,
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhdwy]$/, 'JWT_EXPIRES_IN must look like 30m, 12h or 7d')
    .default('7d'),
  ADMIN_EMAIL: z.string().trim().toLowerCase().default('admin@eaternity.local'),
  ADMIN_PASSWORD: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  PAYMENT_CURRENCY: z.string().trim().toLowerCase().length(3).default('usd'),
  PAYMENT_EXCHANGE_RATE: z.coerce.number().positive().default(1),
  SMTP_HOST: z.string().trim().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: booleanString.default(true),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: optionalString,
  WEB_DIR: optionalString,
  ADMIN_DIR: optionalString,
});

export interface Config {
  env: 'development' | 'production' | 'test';
  port: number;
  mongoUri: string;
  dataDir: string;
  uploadsDir: string;
  publicUrl: string | undefined;
  jwt: { secret: string; expiresIn: string };
  admin: { email: string; password: string; passwordFile: string | undefined };
  payments: { stripeSecretKey: string | undefined; currency: string; exchangeRate: number };
  mail:
    | { enabled: false }
    | {
        enabled: true;
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        from: string;
      };
  webDir: string;
  adminDir: string;
}

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Built frontends live in ./public inside the Docker image and in apps/<name>/dist in the repo. */
function defaultFrontendDir(name: 'web' | 'admin'): string {
  const bundled = path.join(serverRoot, 'public', name);
  return existsSync(bundled) ? bundled : path.resolve(serverRoot, '..', name, 'dist');
}

/**
 * Reads a secret from the data directory, creating it on first start.
 * This keeps tokens and the admin password stable across restarts without
 * forcing anyone to configure them before the app will run.
 */
function persistedSecret(file: string, generate: () => string): { value: string; created: boolean } {
  if (existsSync(file)) {
    const value = readFileSync(file, 'utf8').trim();
    if (value) return { value, created: false };
  }
  const value = generate();
  writeFileSync(file, `${value}\n`, { mode: 0o600 });
  return { value, created: true };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join('\n')}`);
  }
  const vars = parsed.data;

  const dataDir = path.resolve(vars.DATA_DIR);
  const uploadsDir = path.join(dataDir, 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  const jwtSecret =
    vars.JWT_SECRET ??
    persistedSecret(path.join(dataDir, 'jwt-secret'), () => randomBytes(48).toString('base64url')).value;

  let adminPassword = vars.ADMIN_PASSWORD;
  let adminPasswordFile: string | undefined;
  if (!adminPassword) {
    adminPasswordFile = path.join(dataDir, 'admin-password');
    const secret = persistedSecret(adminPasswordFile, () => randomBytes(12).toString('base64url'));
    adminPassword = secret.value;
    if (secret.created) {
      console.log(`Generated an admin password: ${adminPassword}`);
      console.log(`It is saved in ${adminPasswordFile}. Set ADMIN_PASSWORD to choose your own.`);
    }
  }

  const mail: Config['mail'] =
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
      : { enabled: false };

  return {
    env: vars.NODE_ENV,
    port: vars.PORT,
    mongoUri: vars.MONGODB_URI,
    dataDir,
    uploadsDir,
    publicUrl: vars.PUBLIC_URL?.replace(/\/+$/, ''),
    jwt: { secret: jwtSecret, expiresIn: vars.JWT_EXPIRES_IN },
    admin: { email: vars.ADMIN_EMAIL, password: adminPassword, passwordFile: adminPasswordFile },
    payments: {
      stripeSecretKey: vars.STRIPE_SECRET_KEY,
      currency: vars.PAYMENT_CURRENCY,
      exchangeRate: vars.PAYMENT_EXCHANGE_RATE,
    },
    mail,
    webDir: vars.WEB_DIR ? path.resolve(vars.WEB_DIR) : defaultFrontendDir('web'),
    adminDir: vars.ADMIN_DIR ? path.resolve(vars.ADMIN_DIR) : defaultFrontendDir('admin'),
  };
}
