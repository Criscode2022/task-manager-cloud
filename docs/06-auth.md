---
title: Autenticación PIN + JWT
---

# Modelo de autenticación

## Flujo

1. En **Ajustes** (Settings) de la PWA, el usuario elige «Subir tareas y obtener un PIN»: se crea la cuenta y la app muestra el **PIN de 8 dígitos** una sola vez.
2. El servidor hashea el PIN (`bcryptjs` + `PIN_PEPPER`) y guarda `pin_hash` / `pin_lookup`.
3. Se crea una fila en `sessions` (UUID) y se emite un **JWT** (`jose`, HS256) con claims `sub` (userId) y `sid` (sessionId).
4. El cliente guarda el token y lo envía en `Authorization: Bearer …`.
5. Logout revoca la sesión; TTL configurable (`SESSION_TTL_SECONDS`, default 24h).

## Seguridad

- Rate-limit en registro y login: 10 intentos cada 15 minutos por IP, en memoria por instancia de función. El límite está fijado en el código: `AUTH_RATE_LIMIT` y `AUTH_RATE_WINDOW_MS` pasan la validación del entorno, pero hoy no se leen.
- `DATABASE_URL` nunca se expone al browser.
- PIN no se almacena en claro.

## Por qué PIN y no email/password

Onboarding en segundos para uso personal multi-dispositivo, sin buzones ni reset de contraseña, manteniendo hash + pepper + rate-limit.
