---
title: Decisiones de producto y tech
---

# Decisiones

## Neon + Nest en lugar de Supabase client

La nube es Postgres en Neon y una API Nest propia: SQL y esquema controlados, secretos solo en servidor, mismo patrón que el resto del portfolio. Se dejó el acoplamiento a Supabase Auth/Realtime porque el producto solo necesita PIN, sesiones y tareas.

## Turborepo monorepo + un deploy

Web y API comparten lockfile, turbo cache y un solo pipeline Vercel. Evita dos proyectos desincronizados y simplifica same-origin `/api`.

## Offline primero, sync opcional

Las features core de tareas no requieren API; la nube es continuidad multi-dispositivo, no el camino crítico de cada tap.

## PIN en vez de email/password

Onboarding en segundos para uso personal, sin buzones ni flujos de reset, manteniendo hash + pepper + rate-limit.

## Angular 22 con Zone (no zoneless) por Ionic

La skill Angular 22 pide zoneless, `[formField]` en todos los controles y View Transitions del router. **Ionic 8.8 no lo permite del todo:** sigue pidiendo `zone.js`, sus `ion-*` no implementan `FormValueControl` y la navegación va por `ion-router-outlet`. Se mantiene Zone y se usan Signal Forms + `httpResource`. Los formularios de tareas ya no dependen de controles Ionic: usan inputs nativos y controles propios que implementan `FormValueControl`, así que `[formField]` cubre todos sus campos. El techo está en `11-angular-skill.md`.

## Rediseño «Ballpoint Ink» (2026-10-19)

Sustituye el look de teal, piedra y Literata. La captura sube a la cabecera porque añadir una tarea es lo más frecuente; completar dibuja un trazo de tinta para que el gesto principal tenga respuesta visible. La prioridad sigue en rojo, ámbar y verde escrita como palabra, separada del azul de la marca. Sistema en [`apps/web/DESIGN.md`](../apps/web/DESIGN.md).

## Controles propios en vez de campos de Angular Material

El control segmentado (estado, prioridad, idioma) y el campo de etiquetas son componentes propios con `FormValueControl`, teclado y ARIA de radiogroup. Material queda solo para `MatDialog` y `MatSnackBar`. Así los formularios funcionan con `[formField]` y el aspecto no depende de los temas de Material.

## Deshacer en vez de confirmar

Borrar una tarea es inmediato y ofrece Deshacer durante cinco segundos. Una confirmación en cada borrado frena el uso diario; Deshacer protege del error sin interrumpir. Los borrados masivos de Ajustes sí piden confirmación y dicen qué se borra y dónde.

## Instalar con el diálogo del navegador

En Chrome, Edge y Samsung Internet la app guarda el evento `beforeinstallprompt` y el botón de la cabecera abre el diálogo de instalación del navegador en un toque. iOS no ofrece ninguna API de instalación, así que en iPhone y iPad el mismo botón muestra los pasos de Compartir → Añadir a pantalla de inicio. Donde no hay forma de instalar (Firefox, Safari de escritorio) o la app ya está instalada, el botón no aparece.
