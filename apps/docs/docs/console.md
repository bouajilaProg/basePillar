---
title: Console
sidebar_position: 2
---

# Console

The BasePillar Console is the centralized log viewer for local and deployed services. It exposes a lightweight API for log ingestion and a web UI for browsing, filtering, and expanding metadata.

## Access

- Local UI: `http://localhost:4000`
- Health: `http://localhost:4000/health`
- Logs API: `http://localhost:4000/logs`

## Log Ingestion

Send logs to the Console using the `POST /logs` endpoint.

```json
{
  "appName": "api",
  "message": "File upload completed",
  "level": "info",
  "timestamp": "2026-04-02T18:00:00.000Z",
  "metadata": {
    "requestId": "req_123",
    "userId": "user_456",
    "fileId": "file_789"
  }
}
```

## Filters

Use the UI filters to narrow results by:

- **App** (service name)
- **Level** (`debug`, `info`, `warn`, `error`)

## Persistence

Each incoming log is appended to `apps/console/logs/console.md` with `---` separators.
