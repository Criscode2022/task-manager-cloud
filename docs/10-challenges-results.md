---
title: Retos y resultados
---

# Retos y aprendizajes

## Serverless Nest en Vercel

Adapter Express, cold start, `maxDuration` y reutilizar la app entre invocaciones warm (`api/index.js`).

## Convergencia local ↔ nube

Mapear ids locales tras upload, bulk sync y no pisar ownership entre usuarios.

## Env dual (web + api)

`set-env.js` genera `environment.*.local.ts` desde el `.env` raíz; secretos nunca van al bundle del browser.

## Una PWA que no se podía instalar

El manifest y los iconos viven en `apps/web/public/`, pero el builder `browser` de Angular solo copia las carpetas que `angular.json` lista en `assets`, y `public/` no estaba. El build salía sin manifest y Vercel respondía a `/manifest.webmanifest` con el `index.html`, así que Chrome nunca ofrecía instalar. Se arregló añadiendo `public/` a los assets, y las comprobaciones tras cada deploy (`VERCEL.md`, `08-deploy-vercel.md`) incluyen que el manifest devuelva JSON.

## Instalar en cada plataforma

Solo los navegadores Chromium exponen `beforeinstallprompt`. El evento puede llegar antes de que cargue la página de la lista, así que `InstallService` se crea al arrancar con `provideAppInitializer`. En iOS no hay API: la app muestra los pasos, que en iOS 26 cambiaron (Compartir puede estar dentro del botón •••).

## `fakeAsync` y la carga perezosa de Ionic

Ionic carga el código de cada componente la primera vez que aparece. Si eso ocurre dentro de un test `fakeAsync`, el vaciado de temporizadores al final del test dispara el timeout de carga del chunk y Karma registra `ChunkLoadError`, aunque el test pase. El test de la tarea tachada usa el reloj de Jasmine, que solo avanza los temporizadores que el test pide.

# Resultados

- Monorepo operativo con CI en GitHub Actions: lint, unitarios web (77 tests) y API, integración HTTP de la API, build de la API y e2e con Playwright.
- PWA en producción en Vercel (estáticos + API Nest en `/api`) sobre Neon.
- API con health, auth PIN/JWT, CRUD/bulk de tareas y esquema Neon versionado en SQL.
- Rediseño «Ballpoint Ink» con captura en la cabecera, edición en línea, Deshacer e instalación en un toque.
- Código abierto como referencia Angular/Ionic + Nest + Neon + Turborepo + Vercel.
