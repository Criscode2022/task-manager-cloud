# This app

Rules and context for this app only. Agents read this file after [PROJECT.md](PROJECT.md), and where the two differ, this file wins, except that it can't loosen the rules on secrets and Neon. PROJECT.md comes from the template, and `npm run update-from-template` brings in its newer versions. That update never changes this file, so keep everything specific to this app here.

## What the app is

Task Cloud is a personal task list. People create, edit, complete, delete, and filter tasks on this device, including with no network. Signing in with an 8-digit PIN optionally syncs that list through the Nest API to Neon Postgres.

## Decisions

- The app type is `ionic-pwa`. The web client stays an installable Ionic app in `apps/web`. Do not replace Ionic Storage, the service worker, or the tab shell.
- This repository is a pnpm and Turborepo monorepo. `apps/web` is the Angular client. `apps/api` is the NestJS API. `mcp-server/` is a separate Python server and is not part of the pnpm workspaces.
- Tasks work without the API. Cloud sync is the only feature that needs it.
- The visual system is "Ballpoint Ink" (replaced the teal, stone, and Literata look on 2026-10-19 at the user's request). A ballpoint-blue header holds the capture field over a pale ink ground, tasks sit in white groups, and completing a task draws an ink stroke through it. Bricolage Grotesque (self-hosted) is for the words you read and write; the platform sans is for controls. Tokens live in `apps/web/src/theme/variables.scss`; the system is documented in `apps/web/DESIGN.md`. Priority stays red, amber, and green, written as a word, so it is not the brand color.
- Shared controls live in `apps/web/src/app/core/components/` (segmented control, tag field, PIN dialog, install guide). Reuse them instead of adding Angular Material form fields; Material is kept only for `MatDialog` and `MatSnackBar`.
- Install goes through `InstallService`: the header button opens the browser's install dialog where the browser offers one (Chromium's `beforeinstallprompt`) and the install guide on iOS and iPadOS, and hides once the app is installed. The manifest and icons live in `apps/web/public/`, which must stay in the `assets` of `apps/web/angular.json`; without it the build ships no manifest and the app can't be installed.
- Keep English and Spanish. User-facing copy goes through the existing translation keys.

## Rules

- Run commands from the repository root with pnpm: `pnpm start` for the web app, `pnpm api` for Nest, `pnpm start:full` for both, `pnpm test:ci` for the web unit tests, `pnpm lint:ci` for web lint.
- A root `.env` (from `.env.example`) holds `DATABASE_URL`, auth secrets, and `API_BASE_URL`. Do not commit it. `pnpm start` and the web build run `apps/web/scripts/set-env.js`, which writes the gitignored `environment.local.ts` and `environment.prod.local.ts`.
- Locally, `API_BASE_URL=/api` and `apps/web/proxy.conf.json` proxies to Nest on `API_PORT` (default `3001`). Production is one Vercel project: static web plus `/api/*` from `api/index.js`. See `VERCEL.md`.
- Nest changes follow `.claude/skills/nestjs/`. Environment is validated at boot. Auth is a global guard; public routes use `@Public()`. Ownership checks live in services.
- Web unit tests: don't wrap the first render of Ionic components in `fakeAsync`. Ionic loads each component's code on first use, and the timer flush at the end of `fakeAsync` cuts that load short (`ChunkLoadError` in the Karma log). Use Jasmine's clock for timers instead.
- The web unit tests and `e2e/home.spec.ts` describe the task flows. A redesign keeps those flows: create, filter, search, complete, edit, delete, sync, language, and theme.
