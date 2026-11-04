# Eaternity

Food ordering web app: a shop where customers order and pay, and an admin page where staff manage the menu and confirm orders. One container, with SQLite for storage. Source code: https://github.com/shtmthw/eaternity

## Quick start

```sh
docker run -d --name eaternity -p 8080:8080 -v eaternity:/data matthew552/eaternity
```

Then open http://localhost:8080 for the shop and http://localhost:8080/admin for the admin page. Sign in as `admin@eaternity.local` with the password from the logs:

```sh
docker logs eaternity
docker exec eaternity cat /data/admin-password
```

The menu starts out empty. Add dishes on the admin page and they appear in the shop right away.

Without a Stripe key the app runs in demo mode: checkout skips the payment page and orders count as paid.

## Configuration

Every setting is optional. Pass them with `-e NAME=value`.

| Variable                 | Default                 | Description                                                             |
| ------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| `PUBLIC_URL`             | the requested address   | Address Stripe sends customers back to.                                 |
| `TRUST_PROXY`            | `false`                 | Trust `X-Forwarded-*` headers. Turn it on behind a reverse proxy.       |
| `ADMIN_EMAIL`            | `admin@eaternity.local` | Email of the admin account.                                             |
| `ADMIN_PASSWORD`         | generated               | Password of the admin account. Generated and saved in `/data` if empty. |
| `CURRENCY`               | `usd`                   | Currency prices are entered, shown and charged in.                      |
| `DELIVERY_FEE`           | `2`                     | Flat delivery fee per order.                                            |
| `STRIPE_SECRET_KEY`      |                         | Turns on Stripe Checkout.                                               |
| `SMTP_HOST`, `SMTP_PORT` | `smtp.gmail.com`, `465` | Mail server for order confirmation emails.                              |
| `SMTP_SECURE`            | `true`                  | Set to `false` for port 587.                                            |
| `SMTP_USER`, `SMTP_PASS` |                         | Emails are sent only when both are set.                                 |
| `MAIL_FROM`              | `SMTP_USER`             | Sender address.                                                         |

## Data

Everything the app stores is in `/data`: the SQLite database, uploaded photos and the generated admin password. Mount a volume there to keep it.

## Tags

`latest` and `2.0.0`. Built for `linux/amd64` and `linux/arm64`.
