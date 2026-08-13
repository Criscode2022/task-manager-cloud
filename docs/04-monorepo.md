---
title: Monorepo Turborepo
---

# Layout del monorepo

| Path | Rol |
|------|-----|
| `apps/web` | PWA Ionic/Angular (output `www/`) |
| `apps/api` | NestJS (`dist/`) consumido por la función Vercel |
| `api/index.js` | Entry serverless: boot Nest + cache warm |
| `packages/` | Reservado para shared packages |
| `mcp-server/` | MCP Python opcional (FastMCP + uv) |
| `vercel.json` | Build, functions, rewrites SPA + `/api` |
| `turbo.json` | Tasks, env y remote cache |

## Scripts raíz

| Script | Descripción |
|--------|-------------|
| `pnpm api` | Nest en watch |
| `pnpm start` | Angular + proxy `/api` |
| `pnpm start:full` | API + web vía turbo |
| `pnpm build` | Build de todos los packages |
| `pnpm build:web` / `build:api` | Build selectivo |
| `pnpm test:ci` | Tests web headless |
| `pnpm test:api` | Smoke HTTP de la API |

## Workspaces

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Package manager: pnpm 11. Node ≥ 22.
