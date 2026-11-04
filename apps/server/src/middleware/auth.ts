import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../lib/http';
import type { Role, TokenService } from '../services/tokens';

function bearerToken(req: Request): string | undefined {
  const header = req.get('authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

function requireRole(tokens: TokenService, role: Role): RequestHandler {
  return (req, _res, next) => {
    const token = bearerToken(req);
    if (!token) throw new HttpError(401, 'Please sign in to continue');

    const payload = tokens.verify(token);
    if (!payload) throw new HttpError(401, 'Your session has expired. Please sign in again');
    if (payload.role !== role) throw new HttpError(403, 'You do not have access to this resource');

    if (role === 'user') req.userId = payload.sub;
    next();
  };
}

export const requireUser = (tokens: TokenService) => requireRole(tokens, 'user');
export const requireAdmin = (tokens: TokenService) => requireRole(tokens, 'admin');

export function currentUserId(req: Request): string {
  if (!req.userId) throw new HttpError(401, 'Please sign in to continue');
  return req.userId;
}

/** Slows down password guessing. Successful sign-ins are not counted. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});
