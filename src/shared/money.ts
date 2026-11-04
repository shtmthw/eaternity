// Amounts are stored and passed around as integer hundredths of the currency
// unit (cents for USD), so they can be added up without rounding errors.

export interface PricedLine {
  priceCents: number;
  quantity: number;
}

export interface Totals {
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
}

export function orderTotals(lines: readonly PricedLine[], deliveryFeeCents: number): Totals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const deliveryCents = subtotalCents > 0 ? deliveryFeeCents : 0;
  return { subtotalCents, deliveryCents, totalCents: subtotalCents + deliveryCents };
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(cents: number, currency: string, locale?: string): string {
  const key = `${locale ?? ''}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() });
    formatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}

/** Parses a price typed by a person, such as "12", "12.5" or "1,200.00". */
export function parsePrice(input: string): number | null {
  const normalized = input.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** The reverse of parsePrice, for filling in a form field. */
export function priceInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
