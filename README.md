# BasePillar

## Frontend Drive and Docker Watch

The frontend now exposes a Drive-like workspace at `/drive` and uses backend filebase/folder/file APIs.

### Staging env setup

1. Copy staging env and customize:

```bash
cp .env.staging.example .env.staging
```

2. Start staging stack:

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yaml up -d --build
```

3. Access services:

- Frontend: `http://localhost:8080/drive`
- API docs: `http://localhost:3005/api/docs`
- Console: `http://localhost:4005`

### Dev watch mode (rebuild on changes)

Runs all services (api, frontend, docs, console, postgres, garage) and rebuilds on file changes.

```bash
docker compose --env-file .env.staging -f docker-compose.dev-watch.yaml up --watch
```

Use `Ctrl+C` to stop, then cleanup with:

```bash
docker compose --env-file .env.staging -f docker-compose.dev-watch.yaml down
```

### Frontend tests

```bash
pnpm --filter frontend test
```
