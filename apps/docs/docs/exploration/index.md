---
title: API Exploration
sidebar_position: 1
---

# API Exploration

Interactive API reference generated from OpenAPI specification.

## Live API Docs

The API documentation is served directly from the running API server at:

- **Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **OpenAPI JSON**: [http://localhost:3000/api/docs-json](http://localhost:3000/api/docs-json)

## Development Mode

When running in development mode (`pnpm dev`), you can also generate local API docs:

```bash
# Sync OpenAPI spec from running API
pnpm --filter docs openapi:sync

# Generate docs from spec (works with dev server)
pnpm --filter docs openapi:generate

# Start docs dev server
pnpm --filter docs dev
```

> **Note**: The generated API docs are currently only available in dev mode due to a known SSG compatibility issue with `docusaurus-theme-openapi-docs` and Docusaurus 3.9.x. For production, use the Swagger UI directly at `/api/docs`.

## Authentication

Most endpoints require authentication. The API uses cookie-based JWT authentication:

1. Call `POST /auth/register` to create an account
2. Call `POST /auth/login` to authenticate
3. Subsequent requests automatically include the auth cookie

## Available Endpoints

### Auth

- `POST /auth/register` - Create a new user account
- `POST /auth/login` - Authenticate and receive auth cookie
- `POST /auth/logout` - Clear auth cookie
- `GET /auth/me` - Get current authenticated user

### Filebases

- `GET /filebases` - List filebases the user has access to
- `POST /filebases` - Create a new filebase (one per user max)
- `GET /filebases/:id` - Get filebase details
- `DELETE /filebases/:id` - Delete a filebase

### Filebase Members

- `GET /filebases/:id/members` - List members
- `POST /filebases/:id/members` - Invite a member
- `PATCH /filebases/:id/members/:memberId` - Update member role
- `DELETE /filebases/:id/members/:memberId` - Remove member

### Folders

- `GET /filebases/:id/folders` - List folders
- `POST /filebases/:id/folders` - Create folder
- `PATCH /filebases/:id/folders/:folderId` - Update folder
- `DELETE /filebases/:id/folders/:folderId` - Delete folder

### Files

- `GET /filebases/:id/files` - List files
- `POST /filebases/:id/files` - Upload file
- `GET /filebases/:id/files/:fileId` - Get file details
- `DELETE /filebases/:id/files/:fileId` - Delete file
