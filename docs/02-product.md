---
title: Producto y features
---

# Producto y features

## Problema

Las apps de tareas suelen exigir registro completo, fallan sin red o acoplan el cliente a un BaaS monolítico. El objetivo era una PWA instalable, usable 100% offline, con sync opcional controlada por una API propia sobre Postgres serverless (Nest + Neon + Vercel).

## Solución

Cliente offline-first con **Ionic Storage**. Con sesión activa, sube y baja tareas vía Nest. Auth ligera por **PIN de 8 dígitos** (hash + pepper) y sesiones **JWT**. Deploy unificado en Vercel.

## Características

### CRUD de tareas
Crear, editar, completar y eliminar con feedback inmediato en la UI Ionic.

### Prioridad y tags
Campos `priority` (`low` / `medium` / `high`) y `tags[]` en Postgres, con índices GIN.

### Filtros por estado
Vistas de pendientes, completadas o todas, orientadas al uso diario en móvil.

### Offline-first
Ionic Storage mantiene la lista usable sin red; la nube no es SPOF de la UI.

### Sync unitario y bulk
API REST: `POST /tasks`, `POST /tasks/bulk`, `PUT`, `DELETE` protegidos por JWT.

### Auth PIN + sesión
Registro/login con PIN, JWT (`sub` + `sid`), tabla `sessions` y rate-limit en auth.

### PWA instalable
Service worker Angular y layout app-like en móvil y escritorio.

### i18n
ngx-translate con idiomas EN/ES en el cliente.
