FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/console/package.json ./apps/console/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/console ./apps/console

WORKDIR /app/apps/console

RUN pnpm build

CMD ["pnpm", "start"]
