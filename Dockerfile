# syntax=docker/dockerfile:1

# Everything is compiled on the build machine. The output is plain JavaScript and
# static files, and no dependency has native code, so the same files work on
# amd64 and arm64.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Runtime dependencies of the server only.
FROM --platform=$BUILDPLATFORM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN npm ci --omit=dev --no-audit --no-fund --workspace @eaternity/server \
  && find node_modules -maxdepth 2 -type l -delete

FROM node:24-alpine
LABEL org.opencontainers.image.title="Eaternity" \
      org.opencontainers.image.description="Food ordering app with a storefront, admin panel and API" \
      org.opencontainers.image.source="https://github.com/shtmthw/eaternity"
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/web/dist ./public/web
COPY --from=build /app/apps/admin/dist ./public/admin
# npm and yarn are not needed at runtime.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/bin/corepack /usr/local/lib/node_modules/corepack /opt/yarn* /usr/local/bin/yarn* \
  && mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health > /dev/null || exit 1
CMD ["node", "dist/index.js"]
