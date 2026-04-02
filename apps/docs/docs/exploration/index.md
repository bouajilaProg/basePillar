---
title: API Reference
sidebar_position: 1
---

# API Reference

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

- `POST /filebases` - Create a new filebase
- `GET /filebases/mine` - Get the current user's filebase
- `GET /filebases/:filebaseId` - Get filebase details
- `PATCH /filebases/:filebaseId` - Update filebase name
- `DELETE /filebases/:filebaseId` - Delete a filebase
- `GET /filebases/:filebaseId/root` - Get root folder

### Folders

- `GET /filebases/:filebaseId/folders/:folderId/children` - List child folders
- `GET /filebases/:filebaseId/folders/:folderId` - Get folder
- `POST /filebases/:filebaseId/folders` - Create folder
- `PATCH /filebases/:filebaseId/folders/:folderId` - Rename folder
- `PATCH /filebases/:filebaseId/folders/:folderId/move` - Move folder
- `DELETE /filebases/:filebaseId/folders/:folderId` - Delete folder
- `GET /filebases/:filebaseId/folders/:folderId/path` - Get folder path

### Files

- `GET /filebases/:filebaseId/files/folder/:folderId` - List files in folder
- `GET /filebases/:filebaseId/files/:pointerId` - Get file pointer details
- `GET /filebases/:filebaseId/files/:pointerId/download` - Get signed download URL
- `POST /filebases/:filebaseId/files` - Upload file
- `POST /filebases/:filebaseId/files/:pointerId/shortcut` - Create file shortcut
- `PATCH /filebases/:filebaseId/files/:pointerId` - Rename file pointer
- `PATCH /filebases/:filebaseId/files/:pointerId/move` - Move file pointer
- `DELETE /filebases/:filebaseId/files/:pointerId` - Delete file pointer
