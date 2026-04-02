---
title: BasePillar Docs
sidebar_position: 1
slug: /
---

# BasePillar Documentation

Welcome to the BasePillar developer control plane. This documentation is organized into three pillars:

## 🔍 Exploration (API Reference)

Interactive API documentation generated from OpenAPI specifications. Browse endpoints, view request/response schemas, and test API calls directly.

[Go to API Reference →](/exploration)

## 📋 Context (System State)

Understand the system's initial state, environment configuration, database schema, and seed data patterns for development and testing.

[Go to System Context →](/context)

## 👁️ Observation (Live Monitoring)

Real-time log streaming and system monitoring. Watch logs from all services in a terminal-like interface.

[Go to Live Observation →](/observation)

---

## Quick Start

```bash
# Start the development environment
pnpm dev

# Access services
# - Frontend: http://localhost:5173
# - API: http://localhost:3000/api
# - Docs: http://localhost:3001
# - Console: http://localhost:4000
```

## Sync API Documentation

When the API changes, sync and regenerate the docs:

```bash
# Ensure API is running, then:
pnpm --filter docs openapi:sync
pnpm --filter docs openapi:generate
```
