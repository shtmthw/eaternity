import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stripeAmount } from '../server/services/payments.ts';
import { formatMoney, orderTotals, parsePrice, priceInput } from './money.ts';

describe('money', () => {
  it('adds delivery only when there is something to deliver', () => {
    assert.deepEqual(orderTotals([{ priceCents: 1450, quantity: 2 }], 200), {
      subtotalCents: 2900,
      deliveryCents: 200,
      totalCents: 3100,
    });
    assert.deepEqual(orderTotals([], 200), { subtotalCents: 0, deliveryCents: 0, totalCents: 0 });
  });

  it('parses prices typed by people', () => {
    assert.equal(parsePrice('12'), 1200);
    assert.equal(parsePrice(' 12.5 '), 1250);
    assert.equal(parsePrice('1,200.99'), 120_099);
    assert.equal(parsePrice('0.1'), 10);
    assert.equal(parsePrice('12.345'), null);
    assert.equal(parsePrice('-3'), null);
    assert.equal(parsePrice('abc'), null);
  });

  it('turns cents back into form input', () => {
    assert.equal(priceInput(1200), '12');
    assert.equal(priceInput(1250), '12.50');
  });

  it('formats amounts in the configured currency', () => {
    assert.equal(formatMoney(1450, 'usd', 'en-US'), '$14.50');
    assert.equal(formatMoney(120_000, 'eur', 'de-DE'), '1.200,00\u00a0€');
  });

  it('sends zero-decimal currencies to Stripe in whole units', () => {
    assert.equal(stripeAmount(1450, 'usd'), 1450);
    assert.equal(stripeAmount(120_000, 'jpy'), 1200);
  });
});
