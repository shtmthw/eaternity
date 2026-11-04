import { adminLoginSchema, type AdminAuthResult } from '@eaternity/shared';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { AppContext } from '../context';
import { HttpError, parse, send } from '../lib/http';
import { authRateLimit, requireAdmin } from '../middleware/auth';

/** Constant-time comparison that also hides the length of the expected value. */
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function adminRouter({ config, tokens }: AppContext): Router {
  const router = Router();

  router.post('/login', authRateLimit, (req, res) => {
    const { email, password } = parse(adminLoginSchema, req.body);

    const emailMatches = safeEqual(email, config.admin.email);
    const passwordMatches = safeEqual(password, config.admin.password);
    if (!emailMatches || !passwordMatches) {
      throw new HttpError(401, 'Incorrect email or password');
    }

    const result: AdminAuthResult = {
      token: tokens.sign({ sub: config.admin.email, role: 'admin' }),
      email: config.admin.email,
    };
    send(res, result, { message: 'Signed in' });
  });

  router.get('/me', requireAdmin(tokens), (_req, res) => {
    send(res, { email: config.admin.email });
  });

  return router;
}
