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
| `npm run api` | Nest en watch |
| `npm start` | Angular + proxy `/api` |
| `npm run start:full` | API + web vía turbo |
| `npm run build` | Build de todos los packages |
| `npm run build:web` / `build:api` | Build selectivo |
| `npm run test:ci` | Tests web headless |
| `npm run test:api` | Smoke HTTP de la API |

## Workspaces

```json
"workspaces": ["apps/*", "packages/*"]
```

Package manager: npm 10. Node ≥ 20.
