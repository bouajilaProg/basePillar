---
title: Project Structure
sidebar_position: 1
---

# BasePillar Global Structure

This repository is a pnpm monorepo orchestrated with Turbo. The codebase is split by runtime apps and shared packages.

## Top-Level Layout

- `apps/`: deployable applications
- `packages/`: reusable internal libraries
- `infrastructure/`: local infra assets (for example Garage)
- `.plan/specs/`: project specs and implementation constraints
- `turbo.json`: monorepo task graph and dependency ordering

## Applications (`apps/`)

- `apps/api`: NestJS backend
  - Authentication with custom JWT guard (no Passport.js)
  - Cookie-based auth (`HttpOnly`, `Secure`, `SameSite=strict`)
  - Swagger/OpenAPI exposed at `/api/docs` and `/api/docs-json`
  - Centralized database provider singleton under `src/db/providers/`

- `apps/frontend`: Vite + React web app
  - Proxies `/api` to backend
  - Proxies `/docs` to Docusaurus docs app

- `apps/docs`: Docusaurus documentation site
  - Uses `docusaurus-plugin-openapi-docs`
  - Uses `docusaurus-theme-openapi-docs`
  - OpenAPI source synced by `scripts/sync-openapi.mjs`

## Shared Packages (`packages/`)

- `packages/types` (`@repo/types`): shared domain types, errors, DTO contracts
- `packages/logger` (`@repo/logger`): shared logger factory/services (index exports only)
- `packages/ui` (`@repo/ui`): reusable UI components

## Build and Dev Flow

Turbo enforces dependency order:

1. `@repo/types` builds first
2. dependent packages/apps build after types
3. frontend and docs consume API/runtime outputs through proxies

Common commands:

- `pnpm dev`: run monorepo development tasks
- `pnpm build`: build all packages/apps by graph order
- `pnpm --filter api dev`: start API only
- `pnpm --filter frontend dev`: start frontend only
- `pnpm --filter docs dev`: start docs only

## Environment Variables (high-level)

- `FRONTEND_URL`: allowed CORS origins for API
- `VITE_API_PROXY_TARGET`: frontend dev proxy target for API
- `VITE_DOCS_PROXY_TARGET`: frontend dev proxy target for docs
- `OPENAPI_SOURCE_URL`: docs OpenAPI sync source URL
- `JWT_SECRET`, `JWT_EXPIRES_IN`: auth signing configuration

## Deployment Notes

- Dockerfiles are portless (no `EXPOSE`) for Vercel compatibility
- Staging compose includes `api`, `frontend`, and `docs`
