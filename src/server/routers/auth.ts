import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { signInSchema, signUpSchema } from '../../shared/schemas.ts';
import { users } from '../db/schema.ts';
import {
  createSession,
  deleteSession,
  hashPassword,
  verifyPassword,
  type SessionUser,
} from '../services/auth.ts';
import { type Context, publicProcedure, router } from '../trpc.ts';

const tooMany = () =>
  new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many attempts. Wait a few minutes and try again.',
  });

function startSession(ctx: Context, user: SessionUser): SessionUser {
  const { token, expiresAt } = createSession(ctx.db, user.id);
  ctx.setSessionCookie(token, expiresAt);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ ctx, input }) => {
    // Keyed by address and email: behind Docker's port forwarding every visitor
    // can share one address, and this way a guesser only locks out the one email.
    const key = `${ctx.clientIp} ${input.email}`;
    if (!ctx.signInLimiter.allow(key)) throw tooMany();

    const user = ctx.db.select().from(users).where(eq(users.email, input.email)).get();
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      ctx.signInLimiter.fail(key);
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Incorrect email or password' });
    }
    return startSession(ctx, user);
  }),

  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const key = ctx.clientIp;
    if (!ctx.signUpLimiter.allow(key)) throw tooMany();
    ctx.signUpLimiter.fail(key);

    const passwordHash = await hashPassword(input.password);
    // The check and the insert run back to back with no await in between, and
    // SQLite calls are synchronous, so two sign-ups cannot race each other.
    const taken = ctx.db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).get();
    if (taken)
      throw new TRPCError({ code: 'CONFLICT', message: 'An account with this email already exists' });

    const user = ctx.db
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash })
      .returning()
      .get();
    return startSession(ctx, user);
  }),

  signOut: publicProcedure.mutation(({ ctx }) => {
    if (ctx.sessionToken) deleteSession(ctx.db, ctx.sessionToken);
    ctx.clearSessionCookie();
    return null;
  }),
});
