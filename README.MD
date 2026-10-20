# Task Cloud

Task Cloud is an Ionic + Angular Progressive Web App for a personal task list. It works fully offline, installs to the home screen, and can sync the same list across devices with an 8-digit PIN. The repo is a **Turborepo monorepo** with a NestJS API on Neon Postgres.

## Features

- Write a task in the header's capture field and press Enter. Typing opens an optional note, a priority (High, Medium, Low), and up to six tags with suggestions from the tags you already use.
- Tap a task's ring to complete it: an ink stroke draws through the title before it moves to Done.
- Tap a task to edit it in place. On a phone, swipe right to edit or left to delete. Long-press copies the text.
- Delete at once, with Undo for five seconds.
- Filter by status (All, Open, Done, with counts), priority, and tag, and search titles, notes, and tags.
- Works offline with Ionic Storage. Cloud sync is optional: upload your tasks to get a PIN, then enter it on any device (Nest API + Neon).
- Install as an app: one tap opens the browser's install dialog in Chrome, Edge, and Samsung Internet; on iPhone and iPad, where sites can't trigger an install, the button shows the Add to Home Screen steps.
- English and Spanish, light and dark themes.

The visual system, "Ballpoint Ink", is documented in [`apps/web/DESIGN.md`](./apps/web/DESIGN.md).

## Live App

- Production: [https://task-manager-cristiancode.vercel.app](https://task-manager-cristiancode.vercel.app)
- Health check: `GET /api/health` → `{ "ok": true, "service": "task-cloud-nest-api" }`

## Monorepo layout

```
apps/web     Ionic + Angular PWA (Vercel static)
apps/api     NestJS API (Vercel Function + Neon Postgres)
api/         Vercel serverless entry that boots the compiled Nest app
e2e/         Playwright end-to-end tests
docs/        Product and architecture case study (Spanish)
mcp-server/  Optional Python MCP server (uv), separate from the pnpm workspaces
packages/    Shared packages (reserved)
```

## Tech Stack

- Turborepo + pnpm workspaces
- Angular 22 (Signal Forms, signals) / Ionic 8 with Zone.js
- SCSS design tokens; Angular Material only for the dialog and snackbar
- Angular service worker + web manifest (installable PWA)
- NestJS 11
- Neon Postgres
- Vercel (one project for web and API, Turborepo remote cache)
- Jasmine + Karma (web), Vitest + Supertest (API), Playwright (e2e)
- ESLint

## Getting Started

1. Clone the repository.

```bash
git clone https://github.com/Criscode2022/task-manager-cloud.git
cd task-manager-cloud
```

2. Install dependencies from the repo root (Node 22+, pnpm 11+).

```bash
pnpm install
```

3. Configure Neon (see [`NEON_SETUP.md`](./NEON_SETUP.md)), then copy the env template:

```bash
cp .env.example .env
# set DATABASE_URL, JWT_SECRET, PIN_PEPPER
```

4. Start the API and the web app.

```bash
pnpm api          # terminal 1: Nest API on :3001
pnpm start        # terminal 2: Angular on :4200, proxies /api to Nest
```

Or both through Turborepo:

```bash
pnpm start:full
```

Tasks work without the API; only cloud sync needs it.

## Useful Scripts

| Script | Description |
|--------|-------------|
| `pnpm api` | Nest API (`apps/api`) in watch mode |
| `pnpm start` | Angular/Ionic dev server (`apps/web`) |
| `pnpm start:full` / `pnpm dev` | API + web via Turborepo |
| `pnpm build` | Build all packages |
| `pnpm build:web` / `build:api` | Build one app |
| `pnpm run config` | Generate the web `environment.*.local.ts` files from `.env` |
| `pnpm lint` / `lint:ci` | ESLint |
| `pnpm test` / `test:ci` | Web unit tests (Karma) |
| `pnpm test:api` | API unit tests (Vitest) |
| `pnpm test:integration` | Nest HTTP integration tests (Supertest) |
| `pnpm test:e2e` | Playwright (Chromium) |
| `pnpm test:scripts` | Tests for the repo scripts in `scripts/` |

Testing guide (Spanish): [`docs/12-testing.md`](./docs/12-testing.md).

## Testing and Linting

```bash
pnpm lint
pnpm test:ci
pnpm test:api
pnpm test:integration
pnpm test:e2e
```

## GitHub CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`, in two jobs:

- **quality:** `pnpm install --frozen-lockfile`, `pnpm lint:ci`, `pnpm test:ci`, `pnpm test:api`, `pnpm test:integration`, `pnpm build:api`
- **e2e:** installs Playwright's Chromium and runs `pnpm test:e2e`

## Neon Setup

See [`NEON_SETUP.md`](./NEON_SETUP.md) and `neon-migration.sql` for database setup.

## Deploy (Vercel, single project)

One Vercel project serves both apps: the Angular PWA as static files and the
Nest API as a serverless function behind `/api/*` (same origin, no CORS).
Full steps: **[VERCEL.md](./VERCEL.md)**.

Quick checklist:

1. Import the repo at [vercel.com/new](https://vercel.com/new), keep Root Directory at the repo root
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `PIN_PEPPER`
3. Deploy, then check `https://<project>.vercel.app/api/health` and that `/manifest.webmanifest` returns JSON

## More documentation

- [`docs/`](./docs/README.md): product, architecture, decisions, and testing case study (Spanish)
- [`apps/web/DESIGN.md`](./apps/web/DESIGN.md) and [`apps/web/PRODUCT.md`](./apps/web/PRODUCT.md): design system and product context
- [`apps/api/README.md`](./apps/api/README.md): API routes and development
- [`mcp-server/README.md`](./mcp-server/README.md): MCP server for assistants
- [`APP.md`](./APP.md): rules for coding agents working on this app

## Contributing

Contributions are welcome. Please open an issue or submit a pull request with clear context and testing notes.

## Contact

For questions or suggestions: [cristiancode2023@gmail.com](mailto:cristiancode2023@gmail.com)
