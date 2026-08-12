---
title: Superficie API Nest
---

# Superficie API (Nest)

Prefijo global: `/api`. Rutas de tareas y sesión protegidas con `Authorization: Bearer <jwt>`.

## Rutas públicas

| Método | Path | Notas |
|--------|------|--------|
| `GET` | `/api/health` | Healthcheck del servicio Nest |
| `POST` | `/api/users` | Registro con PIN → sesión JWT |
| `POST` | `/api/auth/login` | Login por PIN → token + `expires_at` |

## Auth (protegidas)

| Método | Path | Notas |
|--------|------|--------|
| `POST` | `/api/auth/logout` | Revoca sesión |
| `GET` | `/api/auth/me` | Usuario actual |

## Tareas (protegidas)

| Método | Path | Notas |
|--------|------|--------|
| `GET` | `/api/tasks` | Lista del usuario autenticado |
| `POST` | `/api/tasks` | Crear tarea |
| `POST` | `/api/tasks/bulk` | Carga masiva |
| `PUT` | `/api/tasks/:id` | Actualizar (ownership) |
| `DELETE` | `/api/tasks/:id` | Borrar una |
| `DELETE` | `/api/tasks` | Borrar todas del usuario |

## Ownership

Las mutaciones validan `user_id === auth.userId`. No hay multi-tenant organizacional: cada PIN/usuario es un namespace de tareas.
