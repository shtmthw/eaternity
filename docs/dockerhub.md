# Eaternity

Food ordering web app: a customer shop, an admin panel and the API behind them, in one image. Source code: https://github.com/shtmthw/eaternity

## Quick start

Save this as `docker-compose.yml` and run `docker compose up -d`:

```yaml
services:
  app:
    image: matthew552/eaternity:latest
    restart: unless-stopped
    ports:
      - '8080:8080'
    environment:
      MONGODB_URI: mongodb://mongo:27017/eaternity
    volumes:
      - app-data:/data
    depends_on:
      mongo:
        condition: service_healthy

  mongo:
    image: mongo:8
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ['CMD', 'mongosh', '--quiet', '--eval', "db.adminCommand('ping').ok"]
      interval: 5s
      retries: 20

volumes:
  app-data:
  mongo-data:
```

- Shop: http://localhost:8080
- Admin panel: http://localhost:8080/admin, email `admin@eaternity.local`

The admin password is generated on first start. Read it with:

```sh
docker compose exec app cat /data/admin-password
```

Without a Stripe key, checkout runs in demo mode and orders are marked as paid straight away.

## Without Compose

```sh
docker network create eaternity
docker run -d --name eaternity-mongo --network eaternity -v eaternity-mongo:/data/db mongo:8
docker run -d --name eaternity --network eaternity -p 8080:8080 \
  -e MONGODB_URI=mongodb://eaternity-mongo:27017/eaternity \
  -v eaternity-data:/data \
  matthew552/eaternity
```

## Configuration

Every setting is an optional environment variable.

| Variable                                                                       | Description                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                | Admin panel sign-in. The password is generated when empty.                     |
| `JWT_SECRET`                                                                   | Signs login tokens. Generated when empty.                                      |
| `STRIPE_SECRET_KEY`                                                            | Turns on Stripe Checkout.                                                      |
| `PAYMENT_CURRENCY`, `PAYMENT_EXCHANGE_RATE`                                    | Currency to charge in and its rate from USD. Defaults: `usd` and `1`.          |
| `PUBLIC_URL`                                                                   | Address Stripe sends customers back to, when behind a proxy or on a domain.    |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Order confirmation emails. Sent only when `SMTP_USER` and `SMTP_PASS` are set. |

Uploaded images and generated secrets are stored in `/data`. Mount a volume there to keep them.

## Tags

- `latest`, `1.0.1`, `1.0.0`. Built for `linux/amd64` and `linux/arm64`.
