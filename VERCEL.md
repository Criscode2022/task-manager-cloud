# Deploy Task Cloud on Vercel (Turborepo)

This monorepo deploys as **two Vercel projects** (recommended Turborepo pattern):

| Project | Root Directory | Role |
|---------|----------------|------|
| `task-cloud-web` | `apps/web` | Ionic/Angular static PWA |
| `task-cloud-api` | `apps/api` | NestJS API (single Vercel Function) |

## 1. Import the repo twice

1. Open [vercel.com/new](https://vercel.com/new) and import this Git repository.
2. Set **Root Directory** to `apps/api`.
   - Framework: NestJS (auto-detected via `apps/api/vercel.json`)
   - Keep “Include source files outside of the Root Directory in the Build Step” enabled.
3. Add API env vars (Production + Preview):

   | Name | Notes |
   |------|--------|
   | `DATABASE_URL` | Neon connection string |
   | `JWT_SECRET` | `openssl rand -hex 32` |
   | `PIN_PEPPER` | `openssl rand -hex 32` |
   | `ALLOWED_ORIGINS` | Comma-separated web origins (add the web production URL) |
   | `ALLOW_VERCEL_PREVIEWS` | `true` (default) allows `*.vercel.app` |

4. Deploy the API and copy its production URL, e.g. `https://task-cloud-api.vercel.app`.

5. Import the **same repo again** for the web app.
6. Set **Root Directory** to `apps/web`.
7. Add web env vars:

   | Name | Value |
   |------|--------|
   | `API_BASE_URL` | `https://task-cloud-api.vercel.app/api` (your API URL + `/api`) |

8. Deploy the web app. Put its origin into the API project’s `ALLOWED_ORIGINS`, then redeploy the API.

## 2. CLI (optional)

```bash
npm i -g vercel
vercel login
vercel link --repo   # maps apps/web + apps/api
```

Deploy one app:

```bash
cd apps/api && vercel --prod
cd apps/web && vercel --prod
```

Local parity with Vercel’s runtime:

```bash
cd apps/api && vercel dev
```

## 3. Turborepo remote cache

Vercel enables Remote Caching automatically for linked Turborepo repos. Builds use:

- Web: `turbo run build --filter=@task-cloud/web`
- API: `turbo run build --filter=@task-cloud/api`
- Skip unaffected: `npx turbo-ignore` (`ignoreCommand` in each `vercel.json`)

## 4. Smoke checks

- API: `GET https://<api>/api/health` → `{ "ok": true, "service": "task-cloud-nest-api" }`
- Web: open the Vercel URL → Options → register / sync tasks

## Notes

- Nest keeps the global prefix `/api`, so the browser base URL must end with `/api`.
- Rate limiting is in-memory per function instance (same caveat as before on serverless).
- Netlify (`netlify.toml`) remains optional for the static web app; Vercel is the primary target for the Turborepo setup.
