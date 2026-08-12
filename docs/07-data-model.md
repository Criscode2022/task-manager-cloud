---
title: Modelo de datos Neon
---

# Modelo de datos (Neon Postgres)

## Tablas

### `users`
- `id` BIGSERIAL PK  
- `pin_hash` TEXT NOT NULL  
- `pin_lookup` TEXT (índice único parcial)  
- `created_at` timestamptz  

### `tasks`
- `id` BIGSERIAL PK  
- `user_id` BIGINT FK → users ON DELETE CASCADE  
- `title` TEXT NOT NULL  
- `description` TEXT  
- `done` BOOLEAN DEFAULT false  
- `priority` TEXT DEFAULT `medium` CHECK (`low`|`medium`|`high`)  
- `tags` TEXT[] DEFAULT `{}`  
- `created_at` / `updated_at` (trigger `handle_updated_at`)  

### `sessions`
- `id` UUID PK  
- `user_id` BIGINT FK  
- `expires_at` / `revoked_at` / `created_at`  

## Índices

- `tasks(user_id)`, `tasks(done)`, `tasks(priority)`  
- GIN en `tasks(tags)`  
- `tasks(created_at DESC)`  
- `sessions(user_id)`, `sessions(expires_at)`  

## Migraciones

SQL versionado en el repo: `neon-migration.sql`, `neon-auth-migration.sql`.
