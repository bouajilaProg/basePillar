---
title: System Context
sidebar_position: 1
---

# System Context

Understanding the initial state, environment configuration, and data structures.

## Purpose

This section provides essential context for developers working with BasePillar:

- **Environment Setup** - How to configure and run the system locally
- **Database Schema** - Current table structures and relationships
- **Seed Data** - Initial data state for testing and development
- **Test Fixtures** - Standard test data patterns

## Quick Reference

### Environment Variables

| Variable         | Description                    | Default                 |
| ---------------- | ------------------------------ | ----------------------- |
| `DATABASE_URL`   | PostgreSQL connection string   | -                       |
| `JWT_SECRET`     | JWT signing secret             | -                       |
| `JWT_EXPIRES_IN` | Token expiration               | `7d`                    |
| `FRONTEND_URL`   | CORS allowed origins           | `http://localhost:5173` |
| `S3_ENDPOINT`    | S3-compatible storage endpoint | -                       |
| `S3_ACCESS_KEY`  | S3 access key                  | -                       |
| `S3_SECRET_KEY`  | S3 secret key                  | -                       |
| `S3_BUCKET`      | Default bucket name            | `basepillar`            |

### Running Locally

```bash
# Start all services
pnpm dev

# Start specific apps
pnpm --filter api dev
pnpm --filter frontend dev
pnpm --filter docs dev
pnpm --filter console dev
```

### Database Commands

```bash
# Generate migration from schema changes
pnpm --filter api db:generate

# Push schema to database
pnpm --filter api db:push

# Open Drizzle Studio
pnpm --filter api db:studio
```
