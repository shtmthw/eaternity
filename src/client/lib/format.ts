const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const formatDateTime = (date: Date) => dateTime.format(date);

/** "Just now", "12 minutes ago", "Today, 4:05 PM" or a full date for anything older. */
export function formatWhen(date: Date, now = Date.now()): string {
  const minutes = Math.round((now - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (new Date(now).toDateString() === date.toDateString()) return `Today, ${time.format(date)}`;
  return dateTime.format(date);
}

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
