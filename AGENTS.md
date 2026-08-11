# AGENTS.md

## Cursor Cloud specific instructions

Task Cloud is an Angular 19 + Ionic 8 PWA for personal task management. Tasks work
fully offline via Ionic Storage (create / edit / complete / delete / filter). Supabase
is only used for **optional** cloud sync (PIN-based user + upload/download of tasks); the
core task features do not need it.

There is also an optional, auxiliary Python MCP server under `mcp-server/` (FastMCP + `uv`)
that talks to the same Supabase database. It is not part of the frontend dev loop and is not
required to run or test the app.

### Environment config (important, non-obvious)

- `npm start` and `npm run build` first run `node scripts/set-env.js`, which generates the
  gitignored `src/environments/environment.local.ts` and `environment.prod.local.ts` from a
  `.env` file (or from `process.env` in CI). Angular's `fileReplacements` swaps
  `environment.ts` for these generated files.
- A `.env` file is **required** for local dev. If it is missing, `set-env.js` copies
  `.env.example` to `.env` and then exits with code 1, so the very first `npm start` after a
  fresh checkout will fail — just run it again (or `npm run config`) once `.env` exists.
  Both `.env` and the generated `*.local.ts` files are gitignored.
- The `SUPABASE_ANON_KEY` in `.env.example` is a placeholder. That is fine for the core
  app (offline task CRUD works). Only cloud sync features need a real anon key.

### Running / testing / linting

Standard scripts are in `package.json` and documented in `README.MD`. Key caveats:

- Dev server: `npm start` (serves at `http://localhost:4200`, dev configuration).
- Unit tests: `npm run test:ci` requires Chrome. Set `CHROME_BIN=/usr/local/bin/google-chrome`
  before running; headless Chrome works without a `--no-sandbox` flag in this environment.
- There is one **pre-existing** unit-test failure: `TabListPage > should create` fails with
  `NG05105: Unexpected synthetic property @transitionMessages found` because that spec does not
  provide an animations module (`provideAnimations()` / `NoopAnimationsModule`). This is a test
  defect in the repo, unrelated to environment setup (26/27 specs pass).
- Lint: `npm run lint:ci` (ESLint via `ng lint`).

### Dependencies

- Use `npm install`. The committed `package-lock.json` was previously out of sync with
  `package.json` (missing `chokidar` / `readdirp`), which made `npm ci` fail locally and in CI.
  This branch regenerates the lockfile; if it drifts again, prefer `npm install`.
