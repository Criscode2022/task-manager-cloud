---
title: Autenticación PIN + JWT
---

# Modelo de autenticación

## Flujo

1. El usuario crea cuenta con un **PIN de 8 dígitos** (Options en la PWA).
2. El servidor hashea el PIN (`bcryptjs` + `PIN_PEPPER`) y guarda `pin_hash` / `pin_lookup`.
3. Se crea una fila en `sessions` (UUID) y se emite un **JWT** (`jose`, HS256) con claims `sub` (userId) y `sid` (sessionId).
4. El cliente guarda el token y lo envía en `Authorization: Bearer …`.
5. Logout revoca la sesión; TTL configurable (`SESSION_TTL_SECONDS`, default 24h).

## Seguridad

- Rate-limit en endpoints de auth (por IP, en memoria por instancia de función).
- `DATABASE_URL` nunca se expone al browser.
- PIN no se almacena en claro.

## Por qué PIN y no email/password

Onboarding en segundos para uso personal multi-dispositivo, sin buzones ni reset de contraseña, manteniendo hash + pepper + rate-limit.
