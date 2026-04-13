FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
RUN apk add --no-cache libc6-compat

# Improve pnpm resilience on unstable networks
RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-mintimeout 20000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set fetch-timeout 120000 \
  && pnpm config set network-timeout 120000

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/console/package.json ./apps/console/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/console ./apps/console

WORKDIR /app/apps/console

RUN rm -f tsconfig.server.tsbuildinfo

RUN pnpm build

CMD ["pnpm", "start"]
