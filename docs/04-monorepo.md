---
title: Monorepo Turborepo
---

# Layout del monorepo

| Path | Rol |
|------|-----|
| `apps/web` | PWA Ionic/Angular (output `www/`; `public/` aporta manifest e iconos) |
| `apps/api` | NestJS (`dist/`) consumido por la función Vercel |
| `api/index.js` | Entry serverless: boot Nest + cache warm |
| `e2e/` + `playwright.config.ts` | Tests e2e con Playwright |
| `docs/` | Este caso de estudio |
| `packages/` | Reservado para shared packages |
| `mcp-server/` | MCP Python opcional (FastMCP + uv), fuera de los workspaces pnpm |
| `vercel.json` | Build, functions, rewrites SPA + `/api` |
| `turbo.json` | Tasks, env y remote cache |

## Scripts raíz

| Script | Descripción |
|--------|-------------|
| `pnpm api` | Nest en watch |
| `pnpm start` | Angular + proxy `/api` |
| `pnpm start:full` / `pnpm dev` | API + web vía turbo |
| `pnpm build` | Build de todos los packages |
| `pnpm build:web` / `build:api` | Build selectivo |
| `pnpm lint` / `lint:ci` | ESLint |
| `pnpm test:ci` | Tests unitarios web headless (Karma) |
| `pnpm test:api` | Tests unitarios de la API (Vitest) |
| `pnpm test:integration` | Integración HTTP de la API (Supertest) |
| `pnpm test:e2e` | Playwright (Chromium) |
| `pnpm test:scripts` | Tests de los scripts de `scripts/` |

El smoke contra Neon real es `pnpm --filter @task-cloud/api test:api` (ver [integración](./14-testing-integration.md)).

## Workspaces

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Package manager: pnpm 11. Node ≥ 22.
