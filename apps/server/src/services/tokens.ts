import jwt, { type SignOptions } from 'jsonwebtoken';

export type Role = 'user' | 'admin';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload | null;
}

export function createTokenService(secret: string, expiresIn: string): TokenService {
  return {
    sign(payload) {
      return jwt.sign(payload, secret, {
        algorithm: 'HS256',
        expiresIn: expiresIn as NonNullable<SignOptions['expiresIn']>,
      });
    },
    verify(token) {
      try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        if (typeof decoded !== 'object' || typeof decoded.sub !== 'string') return null;
        const role = (decoded as { role?: unknown }).role;
        if (role !== 'user' && role !== 'admin') return null;
        return { sub: decoded.sub, role };
      } catch {
        return null;
      }
    },
  };
}
