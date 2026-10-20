---
title: Superficie API Nest
---

# Superficie API (Nest)

Prefijo global: `/api`. Todo lo que no es público exige `Authorization: Bearer <jwt>` (guard global; las rutas públicas llevan `@Public()`).

## Rutas públicas

| Método | Path | Notas |
|--------|------|--------|
| `GET` | `/api`, `/api/health` | Healthcheck del servicio Nest |
| `POST` | `/api/users` | Registro con PIN → sesión JWT |
| `POST` | `/api/auth/login` | Login por PIN → token + `expires_at` |
| `GET` | `/api/users/by-pin/:hash` | Ruta antigua: responde **410 Gone** y remite a `POST /api/auth/login` |

## Auth (protegidas)

| Método | Path | Notas |
|--------|------|--------|
| `POST` | `/api/auth/logout` | Revoca sesión |
| `GET` | `/api/auth/me` | Usuario actual |

## Usuarios (protegidas)

| Método | Path | Notas |
|--------|------|--------|
| `GET` | `/api/users/:id` | Solo el propio usuario |
| `DELETE` | `/api/users/:id` | Revoca sus sesiones y borra el propio usuario con sus tareas en la nube |

## Tareas (protegidas)

| Método | Path | Notas |
|--------|------|--------|
| `GET` | `/api/tasks` | Lista del usuario autenticado |
| `POST` | `/api/tasks` | Crear tarea |
| `POST` | `/api/tasks/bulk` | Carga masiva |
| `PUT` | `/api/tasks/:id` | Actualizar (ownership) |
| `DELETE` | `/api/tasks/:id` | Borrar una |
| `DELETE` | `/api/tasks` | Borrar todas del usuario |

## Rate limit

`@nestjs/throttler` en memoria, por instancia de función: 100 peticiones por minuto en general, y 10 cada 15 minutos por IP en `POST /api/users` y `POST /api/auth/login`.

## Ownership

Las mutaciones validan `user_id === auth.userId`. No hay multi-tenant organizacional: cada PIN/usuario es un namespace de tareas.
