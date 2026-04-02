---
title: Manual Testing
sidebar_position: 99
---

# Manual Testing

This section is for manual verification of key flows while developing.

## Prerequisites

- Start services: `pnpm dev`
- Frontend: `http://localhost:5173`
- API Swagger UI: `http://localhost:3000/api/docs`
- Console: `http://localhost:4000`

## Auth

1. Register a new user in the UI.
2. Log out.
3. Log back in.
4. Confirm `GET /auth/me` returns the logged-in user.

## Files (Happy Path)

1. Create or open your filebase.
2. Create a folder.
3. Upload a file into that folder.
4. Download the file.
5. Rename the file.
6. Move the file to another folder.
7. Delete the file.

## Observability (Logging)

1. Open the Console UI: `http://localhost:4000`.
2. Trigger a few API and frontend actions (login, upload, etc.).
3. Confirm logs appear with the correct `level` and `appName`.
4. Expand a row to confirm metadata is present and readable.
5. Use filters to narrow by app and level.
