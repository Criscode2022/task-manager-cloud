# Task Cloud

Task Cloud is an Ionic + Angular Progressive Web App for personal task management with offline support and cloud sync. The repo is a **Turborepo monorepo** with a NestJS API on Neon Postgres.

## Features

- Create, edit, complete, and delete tasks
- Filter tasks by status
- Offline support with Ionic Storage
- Cloud synchronization across devices (Nest API + Neon)
- Responsive UI built with Ionic and Tailwind CSS

## Live App

- Production URL: [https://task-cloud.netlify.app](https://task-cloud.netlify.app)

## Monorepo layout

```
apps/web     Ionic + Angular PWA (Vercel static)
apps/api     NestJS API (Vercel Function + Neon Postgres)
mcp-server/  Optional Python MCP tools (uv)
packages/    Shared packages (reserved)
```

## Tech Stack

- Turborepo + npm workspaces
- Angular 19 / Ionic 8
- NestJS 11
- Vercel (Turborepo remote cache)
- Tailwind CSS
- Neon Postgres
- Jasmine + Karma (web)
- ESLint

## Getting Started

1. Clone the repository.

```bash
git clone https://github.com/Criscode2022/task-manager-ionic.git
cd task-manager-ionic
```

2. Install dependencies (from repo root).

```bash
npm install
```

3. Configure Neon (see `NEON_SETUP.md`), then copy env template:

```bash
cp .env.example .env
# set DATABASE_URL, JWT_SECRET, PIN_PEPPER
```

4. Start the API and development server.

```bash
npm run api    # terminal 1 — Nest API on :3001
npm start      # terminal 2 — Angular with /api proxy
```

Or both via Turborepo:

```bash
npm run start:full
```

## Useful Scripts

| Script | Description |
|--------|-------------|
| `npm run api` | Nest API (`apps/api`) in watch mode |
| `npm start` | Angular/Ionic dev server (`apps/web`) |
| `npm run start:full` | API + web via turbo |
| `npm run build` | Build all packages |
| `npm run build:web` / `build:api` | Build one app |
| `npm run config` | Generate web `environment.*.local.ts` |
| `npm run lint` / `lint:ci` | ESLint |
| `npm run test` / `test:ci` | Web unit tests |
| `npm run test:api` | API HTTP smoke test |

## Testing and Linting

```bash
npm run lint
CHROME_BIN=/usr/local/bin/google-chrome npm run test:ci
```

## GitHub CI

`.github/workflows/ci.yml` runs on push/PR to `main`:

- `npm ci`
- `npm run lint:ci`
- `npm run test:ci`
- `npm run build:api`

## Neon Setup

See `NEON_SETUP.md` and `neon-migration.sql` for database setup.

## Deploy (Vercel, single project)

One Vercel project serves both apps: the Angular PWA as static files and the
Nest API as a serverless function behind `/api/*` (same origin, no CORS).
Full steps: **[VERCEL.md](./VERCEL.md)**.

Quick checklist:

1. Import the repo at [vercel.com/new](https://vercel.com/new), keep Root Directory at the repo root
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `PIN_PEPPER`
3. Deploy — verify `https://<project>.vercel.app/api/health`

## Contributing

Contributions are welcome. Please open an issue or submit a pull request with clear context and testing notes.

## Contact

For questions or suggestions: [cristiancode2023@gmail.com](mailto:cristiancode2023@gmail.com)
