import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError, z } from 'zod';
import type { Config } from './config.ts';
import type { Database } from './db/client.ts';
import type { SessionUser } from './services/auth.ts';
import type { Mailer } from './services/mail.ts';
import type { Payments } from './services/payments.ts';
import type { RateLimiter } from './services/rate-limit.ts';

/** Long-lived objects shared by every request. */
export interface Services {
  config: Config;
  db: Database;
  payments: Payments;
  mailer: Mailer;
  signInLimiter: RateLimiter;
  signUpLimiter: RateLimiter;
}

export interface Context extends Services {
  user: SessionUser | null;
  sessionToken: string | undefined;
  clientIp: string;
  /** Origin of the site as the browser sees it, used for Stripe return links. */
  baseUrl: string;
  setSessionCookie(token: string, expiresAt: Date): void;
  clearSessionCookie(): void;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? error.cause : null;
    return {
      ...shape,
      // Show the first validation problem instead of a JSON dump of all of them.
      message: zodError
        ? (zodError.issues[0]?.message ?? 'Invalid input')
        : error.code === 'INTERNAL_SERVER_ERROR'
          ? 'Something went wrong. Please try again.'
          : shape.message,
      data: {
        ...shape.data,
        fieldErrors: zodError
          ? (z.flattenError(zodError).fieldErrors as Record<string, string[] | undefined>)
          : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please sign in first' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'This needs an admin account' });
  }
  return next();
});
