---
name: nestjs
description: >-
  NestJS backend development (v11 baseline) — modules, dependency injection,
  REST/validation, auth guards, configuration, microservices, and testing.
  Use when writing or reviewing NestJS controllers, providers, modules,
  pipes, guards, interceptors, or Nest test suites.
---

# NestJS (v11 baseline)

References:

- [architecture.md](architecture.md) — modules, DI, configuration, lifecycle
- [api-security.md](api-security.md) — DTO validation, guards, auth, errors
- [testing-nest.md](testing-nest.md) — unit and e2e testing patterns

## Version notes (v11, current major — v12 expected ~Q3 2026)

- SWC compiler and Vitest are the default dev toolchain for new projects —
  don't add ts-jest to fresh apps.
- `ConsoleLogger` supports structured **JSON logging** out of the box
  (`new ConsoleLogger({ json: true })`) — use it in production instead of
  bolting on a logger for basic needs.
- Tiny services can skip the root module: `NestFactory.create(AppController)`
  is valid for micro-deployments; full apps still use a module tree.
- `IntrinsicException` throws without framework auto-logging (for expected
  control-flow errors); `ParseDatePipe` exists — don't hand-parse date params.
- Microservice transporters (Kafka/NATS/Redis) expose the raw client via
  `unwrap()` when you need provider-specific features.

## Defaults for new code

- One **feature module** per domain concept (`orders/`, `users/`), each with
  controller (HTTP mapping only), service (business logic), and its own DTOs.
  No business logic in controllers; no HTTP types (Request/Response) in
  services.
- Global `ValidationPipe` with `whitelist: true, transform: true` — every
  input crosses a validated DTO boundary (see api-security.md).
- Configuration via `@nestjs/config` with a validated schema — the app must
  crash at boot on missing env, not at first request.
- Every async job/queue/microservice handler is idempotent or explicitly
  documented as not.
- Health check endpoint (`@nestjs/terminus`) and graceful shutdown hooks
  (`app.enableShutdownHooks()`) from day one.
