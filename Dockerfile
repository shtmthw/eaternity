# syntax=docker/dockerfile:1

# The client is built once on the build machine. The server is TypeScript that
# Node runs directly, and SQLite is part of Node, so nothing here contains
# native code and the same files work on amd64 and arm64.
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM --platform=$BUILDPLATFORM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# tRPC and Drizzle list TypeScript as a peer, so npm keeps it even with
# --omit=dev. Nothing needs it at runtime.
RUN npm ci --omit=dev --no-audit --no-fund \
  && rm -rf node_modules/typescript node_modules/@types node_modules/undici-types

FROM node:26-alpine
LABEL org.opencontainers.image.title="Eaternity" \
      org.opencontainers.image.description="Food ordering app with a shop, an admin page and an API" \
      org.opencontainers.image.source="https://github.com/shtmthw/eaternity"
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle ./drizzle
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY --from=build /app/dist ./dist
# npm, npx, corepack and yarn are not needed at runtime.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn* \
  && mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health > /dev/null || exit 1
CMD ["node", "src/server/index.ts"]
