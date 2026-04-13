# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
RUN apk add --no-cache libc6-compat

# Improve pnpm resilience on unstable networks
RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-mintimeout 20000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set fetch-timeout 120000 \
  && pnpm config set network-timeout 120000

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/docs/package.json ./apps/docs/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/docs ./apps/docs

# Build
WORKDIR /app/apps/docs
RUN pnpm build

# Production stage - Nginx
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/apps/docs/build /usr/share/nginx/html

# Copy nginx config
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
