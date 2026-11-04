import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type Context as HonoContext, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { generateCookie, getCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { MAX_IMAGE_BYTES } from '../shared/constants.ts';
import { appRouter } from './routers/index.ts';
import { findSessionUser, SESSION_COOKIE } from './services/auth.ts';
import { ImageError, saveImage } from './services/images.ts';
import type { Context, Services } from './trpc.ts';

const immutable = (_path: string, c: HonoContext) => {
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
};

export function createApp(services: Services): Hono {
  const { config, db } = services;
  const app = new Hono();

  const clientIp = (c: HonoContext): string => {
    const forwarded = config.trustProxy ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined;
    if (forwarded) return forwarded;
    try {
      return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const baseUrl = (c: HonoContext): string => {
    if (config.publicUrl) return config.publicUrl;
    const url = new URL(c.req.url);
    const proto =
      (config.trustProxy && c.req.header('x-forwarded-proto')?.split(',')[0]) || url.protocol.slice(0, -1);
    const host = (config.trustProxy && c.req.header('x-forwarded-host')) || url.host;
    return `${proto}://${host}`;
  };

  const createContext = (c: HonoContext, resHeaders: Headers): Context => {
    const sessionToken = getCookie(c, SESSION_COOKIE);
    const origin = baseUrl(c);
    const secure = origin.startsWith('https://');
    const cookie = { path: '/', httpOnly: true, sameSite: 'Lax', secure } as const;

    return {
      ...services,
      user: findSessionUser(db, sessionToken),
      sessionToken,
      clientIp: clientIp(c),
      baseUrl: origin,
      setSessionCookie(token, expiresAt) {
        resHeaders.append(
          'Set-Cookie',
          generateCookie(SESSION_COOKIE, token, { ...cookie, expires: expiresAt }),
        );
      },
      clearSessionCookie() {
        resHeaders.append('Set-Cookie', generateCookie(SESSION_COOKIE, '', { ...cookie, maxAge: 0 }));
      },
    };
  };

  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
      // Leave HTTPS policy to whatever terminates TLS, so plain HTTP keeps working on a LAN.
      strictTransportSecurity: false,
    }),
  );
  // Rejects form posts from other sites. tRPC calls are JSON, which browsers
  // never send to another origin without a CORS preflight.
  app.use(
    '/api/*',
    csrf({ origin: (origin, c) => origin === baseUrl(c) || origin === new URL(c.req.url).origin }),
  );

  app.get('/api/health', (c) => {
    db.$client.prepare('SELECT 1').get();
    return c.json({ status: 'ok' });
  });

  app.all('/api/trpc/*', (c) =>
    fetchRequestHandler({
      endpoint: '/api/trpc',
      req: c.req.raw,
      router: appRouter,
      createContext: ({ resHeaders }) => createContext(c, resHeaders),
      onError: ({ error, path: procedure }) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') console.error(`Error in ${procedure ?? 'tRPC'}:`, error);
      },
    }),
  );

  app.post(
    '/api/images',
    bodyLimit({
      maxSize: MAX_IMAGE_BYTES + 64 * 1024,
      onError: (c) => c.json({ message: 'Images must be 5 MB or smaller' }, 413),
    }),
    async (c) => {
      const user = findSessionUser(db, getCookie(c, SESSION_COOKIE));
      if (!user) return c.json({ message: 'Please sign in first' }, 401);
      if (user.role !== 'admin') return c.json({ message: 'This needs an admin account' }, 403);

      const { image } = await c.req.parseBody();
      if (!(image instanceof File)) return c.json({ message: 'Choose an image' }, 400);
      try {
        return c.json({ image: await saveImage(config.uploadsDir, image) }, 201);
      } catch (error) {
        if (error instanceof ImageError) return c.json({ message: error.message }, 400);
        throw error;
      }
    },
  );

  app.all('/api/*', (c) => c.json({ message: 'Not found' }, 404));

  app.use(
    '/images/*',
    serveStatic({
      root: config.uploadsDir,
      rewriteRequestPath: (requestPath) => requestPath.replace(/^\/images/, ''),
      onFound: immutable,
    }),
  );
  app.get('/images/*', (c) => c.text('Not found', 404));

  // The built client. During development Vite serves it instead.
  const indexFile = path.join(config.clientDir, 'index.html');
  if (existsSync(indexFile)) {
    const indexHtml = readFileSync(indexFile, 'utf8');
    app.use('/assets/*', serveStatic({ root: config.clientDir, onFound: immutable }));
    app.use(
      '*',
      serveStatic({
        root: config.clientDir,
        onFound: (file, c) => {
          if (file.endsWith('.html')) c.header('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get('*', (c) => {
      c.header('Cache-Control', 'no-cache');
      return c.html(indexHtml);
    });
  }

  app.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.json({ message: 'Something went wrong' }, 500);
  });

  return app;
}
