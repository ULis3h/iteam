# Contributing

Thanks for helping improve iTeam. The codebase is small on purpose; please keep it that way.

## Setup

```bash
npm install          # installs server, client and runner (npm workspaces)
npm run dev          # server :3000 + web UI :5173 (hot reload)
npm run typecheck    # tsc for server and client
npm test             # vitest (server) + node:test (runner)
npm run build        # production build
```

## Where things live

| Area | Path | Notes |
|---|---|---|
| Scheduler & executors | `server/src/engine/` | `run-manager.ts` (DAG scheduling, retries, cancel), `local-executor.ts`, `adapters.ts` (CLI argv per provider), `parsers.ts` (event streams) |
| API & sockets | `server/src/routes/`, `server/src/ws/` | zod schemas in `server/src/workflow/schema.ts` |
| Remote runner | `runner/src/` | `exec.js` must stay a faithful mirror of `local-executor.ts` |
| Web UI | `client/src/` | pages, components, `lib/i18n.tsx` (both languages required for every key) |
| Docs & examples | `docs/`, `examples/` | examples are also the in-app template gallery; keep them valid |

## Rules of thumb

- Every behaviour change to the engine needs a test in `server/test/` (the integration tests use a temporary SQLite database and shell commands as agents, no real CLI required).
- Changing what the executor does? Change `runner/src/exec.js` the same way.
- New UI strings go into both dictionaries in `client/src/lib/i18n.tsx`.
- Schema changes: edit `server/prisma/schema.prisma`, then `cd server && DATABASE_URL=file:./tmp.db npx prisma migrate dev --name <change>` and commit the migration.
- Keep dependencies minimal; prefer a small function over a new package.

## Pull requests

Describe the user-visible change, list the tests you ran, and update `CHANGELOG.md` under *Unreleased*.
