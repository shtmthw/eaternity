import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt, lt, ne } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { sessions, users, type User } from '../db/schema.ts';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'eaternity_session';
export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Hashes are stored as "scrypt$<salt>$<hash>", both base64url encoded. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFKC'), salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(
    password.normalize('NFKC'),
    Buffer.from(salt, 'base64url'),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}

const sessionId = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(db: Database, userId: number): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_MS);
  db.insert(sessions)
    .values({ id: sessionId(token), userId, expiresAt })
    .run();
  return { token, expiresAt };
}

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role'>;

export function findSessionUser(db: Database, token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId(token)), gt(sessions.expiresAt, new Date())))
    .get();
  return row ?? null;
}

export function deleteSession(db: Database, token: string): void {
  db.delete(sessions)
    .where(eq(sessions.id, sessionId(token)))
    .run();
}

export function deleteExpiredSessions(db: Database): void {
  db.delete(sessions).where(lt(sessions.expiresAt, new Date())).run();
}

/**
 * Makes sure the account named by ADMIN_EMAIL exists, has the admin role and
 * signs in with the configured password. Any other account that used to be
 * the admin goes back to being a customer.
 */
export async function ensureAdmin(db: Database, email: string, password: string): Promise<void> {
  const existing = db.select().from(users).where(eq(users.email, email)).get();

  if (!existing) {
    db.insert(users)
      .values({ name: 'Admin', email, passwordHash: await hashPassword(password), role: 'admin' })
      .run();
  } else {
    const passwordMatches = await verifyPassword(password, existing.passwordHash);
    const passwordHash = passwordMatches ? existing.passwordHash : await hashPassword(password);
    db.update(users).set({ role: 'admin', passwordHash }).where(eq(users.id, existing.id)).run();
    // Signing out everywhere after a password change keeps old sessions from lingering.
    if (!passwordMatches) db.delete(sessions).where(eq(sessions.userId, existing.id)).run();
  }

  db.update(users)
    .set({ role: 'customer' })
    .where(and(eq(users.role, 'admin'), ne(users.email, email)))
    .run();
}
