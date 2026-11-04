import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { TRPCError } from '@trpc/server';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDatabase } from './db/client.ts';
import { createCaller } from './routers/index.ts';
import { ensureAdmin, findSessionUser } from './services/auth.ts';
import { detectImageType } from './services/images.ts';
import { createMailer } from './services/mail.ts';
import { createPayments } from './services/payments.ts';
import { createRateLimiter } from './services/rate-limit.ts';
import type { Context, Services } from './trpc.ts';

const dataDir = mkdtempSync(path.join(tmpdir(), 'eaternity-test-'));
const config = loadConfig({
  NODE_ENV: 'test',
  DATA_DIR: dataDir,
  ADMIN_PASSWORD: 'admin-password',
  DELIVERY_FEE: '2.50',
});
const db = openDatabase(':memory:');
const services: Services = {
  config,
  db,
  payments: createPayments(undefined),
  mailer: createMailer({ enabled: false }),
  signInLimiter: createRateLimiter({ limit: 3, windowMs: 60_000 }),
  signUpLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
};

/** A tRPC caller that remembers its session cookie, like a browser would. */
function client(ip = '127.0.0.1', using: Services = services) {
  let token: string | undefined;
  const context = (): Context => ({
    ...using,
    user: findSessionUser(db, token),
    sessionToken: token,
    clientIp: ip,
    baseUrl: 'http://localhost:8080',
    setSessionCookie: (value) => {
      token = value;
    },
    clearSessionCookie: () => {
      token = undefined;
    },
  });
  return () => createCaller(context());
}

async function rejectsWith(promise: Promise<unknown>, code: TRPCError['code']) {
  await assert.rejects(promise, (error) => error instanceof TRPCError && error.code === code);
}

const delivery = {
  name: 'Ava',
  email: 'ava@example.com',
  phone: '+1 555 010 0199',
  address: '221 Baker Street',
};

describe('api', () => {
  const admin = client();
  const ava = client();
  const ben = client();
  let steak: number;
  let salad: number;

  before(async () => {
    await ensureAdmin(db, config.admin.email, config.admin.password);
    await admin().auth.signIn({ email: config.admin.email, password: 'admin-password' });
    await ava().auth.signUp({ name: 'Ava', email: 'Ava@Example.com', password: 'correct-horse' });
    await ben().auth.signUp({ name: 'Ben', email: 'ben@example.com', password: 'battery-staple' });

    const base = { description: '', category: 'Meats', image: null } as const;
    steak = (await admin().admin.createDish({ ...base, name: 'Steak', priceCents: 1450 })).id;
    salad = (await admin().admin.createDish({ ...base, name: 'Salad', priceCents: 800, category: 'Veggies' }))
      .id;
  });

  after(() => rmSync(dataDir, { recursive: true, force: true }));

  it('stores emails in lower case and refuses duplicates', async () => {
    assert.equal((await ava().auth.me())?.email, 'ava@example.com');
    await rejectsWith(
      client()().auth.signUp({ name: 'X', email: 'ava@example.com', password: '12345678' }),
      'CONFLICT',
    );
  });

  it('rejects a wrong password and limits repeated attempts', async () => {
    const stranger = client('10.0.0.9');
    for (let attempt = 0; attempt < 3; attempt++) {
      await rejectsWith(
        stranger().auth.signIn({ email: 'ava@example.com', password: 'wrong' }),
        'UNAUTHORIZED',
      );
    }
    await rejectsWith(
      stranger().auth.signIn({ email: 'ava@example.com', password: 'correct-horse' }),
      'TOO_MANY_REQUESTS',
    );
    // Other accounts behind the same address can still sign in.
    assert.equal(
      (await stranger().auth.signIn({ email: 'ben@example.com', password: 'battery-staple' })).name,
      'Ben',
    );
  });

  it('keeps admin procedures away from customers', async () => {
    await rejectsWith(ava().admin.orders({ status: 'all' }), 'FORBIDDEN');
    await rejectsWith(client()().orders.list(), 'UNAUTHORIZED');
  });

  it('prices orders from the menu and merges repeated lines', async () => {
    const { orderId, checkoutUrl } = await ava().orders.place({
      items: [
        { dishId: steak, quantity: 1 },
        { dishId: salad, quantity: 2 },
        { dishId: steak, quantity: 1 },
      ],
      delivery,
    });
    assert.equal(checkoutUrl, null);

    const order = await ava().orders.get({ id: orderId });
    assert.equal(order.status, 'paid');
    assert.equal(order.subtotalCents, 2 * 1450 + 2 * 800);
    assert.equal(order.deliveryCents, 250);
    assert.equal(order.totalCents, 4500 + 250);
    assert.deepEqual(
      order.items.map((item) => [item.name, item.quantity]),
      [
        ['Steak', 2],
        ['Salad', 2],
      ],
    );
  });

  it('hides orders from other customers', async () => {
    const { orderId } = await ava().orders.place({ items: [{ dishId: salad, quantity: 1 }], delivery });
    await rejectsWith(ben().orders.get({ id: orderId }), 'NOT_FOUND');
    assert.ok((await ben().orders.list()).every((order) => order.id !== orderId));
  });

  it('refuses dishes that are no longer on the menu', async () => {
    const { id } = await admin().admin.createDish({
      name: 'Special',
      description: '',
      priceCents: 999,
      category: 'Mixed',
      image: null,
    });
    await admin().admin.deleteDish({ id });
    await rejectsWith(ava().orders.place({ items: [{ dishId: id, quantity: 1 }], delivery }), 'CONFLICT');
  });

  it('lets the admin confirm paid orders once', async () => {
    const { orderId } = await ben().orders.place({ items: [{ dishId: steak, quantity: 3 }], delivery });
    assert.ok((await admin().admin.orders({ status: 'paid' })).some((order) => order.id === orderId));

    await admin().admin.confirmOrder({ id: orderId });
    assert.equal((await ben().orders.get({ id: orderId })).status, 'confirmed');
    await admin().admin.confirmOrder({ id: orderId });
    await rejectsWith(admin().admin.confirmOrder({ id: 999_999 }), 'NOT_FOUND');
  });

  it('signs out by deleting the session', async () => {
    const carl = client();
    await carl().auth.signUp({ name: 'Carl', email: 'carl@example.com', password: 'abcdefgh' });
    assert.ok(await carl().auth.me());
    await carl().auth.signOut();
    assert.equal(await carl().auth.me(), null);
  });
});

describe('stripe checkout', () => {
  // Stands in for Stripe. Tests decide which sessions count as paid.
  const sessions = new Map<number, string>();
  const paid = new Set<string>();
  let failNext = false;
  const stripe: Services = {
    ...services,
    payments: {
      mode: 'stripe',
      async createCheckout(order) {
        if (failNext) {
          failNext = false;
          throw new Error('Stripe is down');
        }
        const sessionId = `cs_test_${order.id}`;
        sessions.set(order.id, sessionId);
        return { url: `https://checkout.stripe.test/${sessionId}`, sessionId };
      },
      async isPaid(sessionId) {
        return paid.has(sessionId);
      },
    },
  };
  const dana = client('127.0.0.2', stripe);
  const admin = client('127.0.0.3', stripe);
  let dishId: number;

  before(async () => {
    await dana().auth.signUp({ name: 'Dana', email: 'dana@example.com', password: 'dana-password' });
    await admin().auth.signIn({ email: config.admin.email, password: 'admin-password' });
    dishId = (
      await admin().admin.createDish({
        name: 'Soup',
        description: '',
        priceCents: 600,
        category: 'Veggies',
        image: null,
      })
    ).id;
  });

  const place = () => dana().orders.place({ items: [{ dishId, quantity: 1 }], delivery });

  it('waits for Stripe before an order counts as paid', async () => {
    const { orderId, checkoutUrl } = await place();
    assert.equal(checkoutUrl, `https://checkout.stripe.test/cs_test_${orderId}`);
    assert.equal((await dana().orders.get({ id: orderId })).status, 'pending');
    assert.ok((await admin().admin.orders({ status: 'all' })).every((order) => order.id !== orderId));

    // Coming back before Stripe has the payment changes nothing.
    assert.equal((await dana().orders.completeCheckout({ id: orderId })).status, 'pending');

    paid.add(sessions.get(orderId) ?? '');
    assert.equal((await dana().orders.completeCheckout({ id: orderId })).status, 'paid');
    assert.ok((await admin().admin.orders({ status: 'paid' })).some((order) => order.id === orderId));
  });

  it('cancels unpaid orders but keeps ones Stripe was paid for', async () => {
    const unpaid = await place();
    assert.deepEqual(await dana().orders.cancelCheckout({ id: unpaid.orderId }), { status: 'cancelled' });
    await rejectsWith(dana().orders.get({ id: unpaid.orderId }), 'NOT_FOUND');
    // Stripe can send the customer back twice.
    assert.deepEqual(await dana().orders.cancelCheckout({ id: unpaid.orderId }), { status: 'cancelled' });

    const settled = await place();
    paid.add(sessions.get(settled.orderId) ?? '');
    assert.deepEqual(await dana().orders.cancelCheckout({ id: settled.orderId }), { status: 'paid' });
  });

  it('drops the order when Stripe cannot start a checkout', async () => {
    const before = (await dana().orders.list()).length;
    failNext = true;
    await rejectsWith(place(), 'BAD_GATEWAY');
    assert.equal((await dana().orders.list()).length, before);
  });
});

describe('http', () => {
  const app = createApp(services);

  it('reports health', async () => {
    const response = await app.request('/api/health');
    assert.equal(response.status, 200);
  });

  it('serves tRPC queries', async () => {
    const response = await app.request('/api/trpc/shop.config');
    const body = (await response.json()) as { result: { data: { json: { deliveryFeeCents: number } } } };
    assert.equal(body.result.data.json.deliveryFeeCents, 250);
  });

  it('requires an admin session to upload images', async () => {
    const form = new FormData();
    form.set('image', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'a.jpg', { type: 'image/jpeg' }));
    const upload = (origin: string) =>
      app.request('/api/images', { method: 'POST', body: form, headers: { origin } });
    assert.equal((await upload('http://localhost')).status, 401);
    // Form posts from another site are turned away before anything else runs.
    assert.equal((await upload('https://elsewhere.example')).status, 403);
  });

  it('answers unknown API paths with 404', async () => {
    assert.equal((await app.request('/api/nope')).status, 404);
  });
});

describe('detectImageType', () => {
  it('reads the file signature', () => {
    const bytes = (text: string) => new Uint8Array([...text].map((char) => char.charCodeAt(0)));
    assert.equal(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpg');
    assert.equal(detectImageType(bytes('\x89PNG\r\n\x1a\n....')), 'png');
    assert.equal(detectImageType(bytes('RIFF....WEBPVP8 ')), 'webp');
    assert.equal(detectImageType(bytes('....ftypavif')), 'avif');
    assert.equal(detectImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  });
});
