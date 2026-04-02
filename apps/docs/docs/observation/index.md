---
title: Observability (Logging)
sidebar_position: 1
---

# Observability (Logging)

Real-time system monitoring and log streaming.

## Console Service

BasePillar includes a centralized logging console at `apps/console` that aggregates logs from all services.

For UI details, see the dedicated Console page: [Console](/console).

### Accessing the Console

- **Web UI**: http://localhost:4000/
- **Log API**: `GET http://localhost:4000/logs`
- **Submit logs**: `POST http://localhost:4000/logs`

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "api",
  "message": "Request handled",
  "meta": {
    "method": "GET",
    "path": "/auth/me",
    "duration": 12
  }
}
```

### Streaming API

The live terminal uses the Server-Sent Events endpoint below. Each event contains a JSON payload that matches the log format above.

- **Live stream**: `GET http://localhost:4000/logs/stream`

## Live Terminal

import Terminal from '@site/src/components/Terminal';

<Terminal endpoint="http://localhost:4000/logs/stream" />

## Monitoring Endpoints

| Service | Health Check  | Metrics     |
| ------- | ------------- | ----------- |
| API     | `GET /health` | -           |
| Console | `GET /health` | `GET /logs` |

## Filtering Logs

The console API supports query parameters for filtering:

```bash
# Get logs from last 5 minutes
curl "http://localhost:4000/logs?since=5m"

# Filter by service
curl "http://localhost:4000/logs?service=api"

# Filter by level
curl "http://localhost:4000/logs?level=error"
```
