# P0 Technical Baseline

**Status:** P0 incomplete / blocked.

## Toolchain observed in this session

| Tool | Observed value | Evidence |
|---|---|---|
| Node.js | `v24.11.0` | `node --version` |
| npm | `11.6.1` | `npm --version` |
| pnpm | `10.21.0` | `pnpm --version` |
| PostgreSQL client | `psql` was not found on PATH | `where psql` returned no matching executable |
| Docker | Docker executable was found, but `docker compose ps` from the repository root reported no configuration file | command output; no active project database was established |

No PostgreSQL server connection, database name, credentials, or query results were available. Do not infer a PostgreSQL server version from the SQL files.

## Repository baseline

- `backend/` and `frontend/` contain mostly empty JavaScript skeleton files.
- `backend/database/schema.sql` and `backend/database/seed_updated.sql` are present and were statically inspected.
- The master plan targets TypeScript, but no working TypeScript package foundation exists yet.
- Existing repository changes observed before documentation edits included deleted tracked infrastructure files (`backend/.gitignore`, `backend/database/database.sql`, `docker-compose.yml`, and legacy docs) plus untracked database/doc files. These changes were preserved; no reset, restore, commit, or staging operation was performed.
- The root `.gitignore` originally ignored `docs/`; that rule was removed so the plan and P0 artifacts are visible to Git status. `WATCHDOG.yml` remains ignored.

## Checks not run / blocked

- Backend/frontend build and typecheck: not meaningful before a foundation exists.
- Runtime health check: blocked because there is no bootstrapped application or reachable PostgreSQL database.
- Schema-vs-database comparison: blocked.
- One `SELECT` per scoped table: blocked.
- Seed load and relational-linkage verification: blocked.
- P0 ownership/policy stakeholder confirmation: not supplied.

## Safe next action

Do not promote P0 or implement unresolved financial/cross-module side effects. Obtain a fresh disposable development PostgreSQL database and approved policy-owner answers, then run `docs/database/seed-checklist.md` and record the results before P1 acceptance.
