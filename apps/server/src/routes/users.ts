import { loginSchema, registerSchema, type AuthResult, type PublicUser } from '@eaternity/shared';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { AppContext } from '../context';
import { HttpError, parse, send } from '../lib/http';
import { authRateLimit, currentUserId, requireUser } from '../middleware/auth';
import { UserModel, toPublicUser } from '../models/user';

export function usersRouter({ tokens }: AppContext): Router {
  const router = Router();

  router.post('/register', authRateLimit, async (req, res) => {
    const { name, email, password } = parse(registerSchema, req.body);

    if (await UserModel.exists({ email })) {
      throw new HttpError(409, 'An account with this email already exists');
    }

    const user = await UserModel.create({ name, email, password: await bcrypt.hash(password, 10) });
    const result: AuthResult = {
      token: tokens.sign({ sub: user._id.toString(), role: 'user' }),
      user: toPublicUser(user),
    };
    send(res, result, { message: 'Account created', status: 201 });
  });

  router.post('/login', authRateLimit, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);

    const user = await UserModel.findOne({ email }).lean();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, 'Incorrect email or password');
    }

    const result: AuthResult = {
      token: tokens.sign({ sub: user._id.toString(), role: 'user' }),
      user: toPublicUser(user),
    };
    send(res, result, { message: 'Signed in' });
  });

  router.get('/me', requireUser(tokens), async (req, res) => {
    const user = await UserModel.findById(currentUserId(req), { name: 1, email: 1 }).lean();
    if (!user) throw new HttpError(401, 'Your account no longer exists');
    send<PublicUser>(res, toPublicUser(user));
  });

  return router;
}
