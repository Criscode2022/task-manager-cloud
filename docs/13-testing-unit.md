---
title: Testing · unitarios
---

# Testing · unitarios

Los unitarios instancian la clase **sin** HTTP y **sin** Neon. En la API se usa Vitest (`globals: true`). En la web, Jasmine/Karma.

## PIN (`apps/api/src/auth/pin.util.spec.ts`)

El lookup del PIN es HMAC-SHA256 con `PIN_PEPPER`. El hash persistido es bcrypt, con un fallback SHA-256 de la era anterior.

```ts
it('accepts exactly 8 digits', () => {
  expect(isValidPin('12345678')).toBe(true);
  expect(isValidPin('1234567')).toBe(false);
  expect(isValidPin('1234567a')).toBe(false);
});

it('verifies a bcrypt PIN hash', async () => {
  const hash = await hashPin('87654321');
  expect(await verifyPinHash('87654321', hash)).toBe(true);
  expect(await verifyPinHash('00000000', hash)).toBe(false);
});
```

## JWT (`apps/api/src/auth/auth.service.spec.ts`)

`AuthService` se construye a mano con un `ConfigService` falso. Así se firma y se verifica un token sin Nest.

```ts
const token = await auth.createAccessToken({
  userId: 42,
  sessionId: 'sid-1',
  expiresAt: new Date(Date.now() + 60_000),
});
const claims = await auth.verifyAccessToken(token);
expect(claims.userId).toBe(42);
expect(claims.sessionId).toBe('sid-1');
```

`extractBearerToken` solo acepta el esquema `Bearer`:

```ts
expect(auth.extractBearerToken('Bearer abc.def')).toBe('abc.def');
expect(auth.extractBearerToken('Basic nope')).toBe('');
```

## Ownership (`apps/api/src/users/users.service.spec.ts`)

Si el `actorId` no coincide, el servicio lanza `NotFoundException` (no 403: no se confirma que el recurso existe).

```ts
it('hides another user behind 404', () => {
  expect(() => users.getOwnUser(1, 99)).toThrow(NotFoundException);
});
```

El mismo criterio está en `TasksService.updateTaskForUser` / `deleteTaskForUser`.

## Guard (`apps/api/src/auth/auth.guard.spec.ts`)

El `Reflector` decide si la ruta es `@Public()`. Sin token y sin `@Public()`, el guard responde 401.

```ts
it('lets public handlers through', async () => {
  const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
  const guard = new AuthGuard(auth, reflector);
  await expect(guard.canActivate(ctx())).resolves.toBe(true);
});
```

## Web — filtro de estado (`apps/web/src/app/core/services/task.service.spec.ts`)

Ionic Storage se sustituye por un `Map`. `changeFilter()` recorre `All → Done → Pending`.

```ts
expect(service.filter()).toBe(StatusEnum.All);
service.changeFilter();
expect(service.filter()).toBe(StatusEnum.Done);
```

Al guardar, una tarea sin `priority` queda en `medium` y `tags` en `[]`. Los tags se recortan y pasan a minúsculas (`"  Work "` → `"work"`). El filtro hidrata Ionic Storage:

```ts
store.set('filter', StatusEnum.Done);
await service.init();
expect(service.filter()).toBe(StatusEnum.Done);
```

## Web — lista (`apps/web/src/app/tabs/tab-list/tab-list.page.spec.ts`)

`TabListPage` se monta con los servicios sustituidos por mocks (`TaskService` con signals, `MatSnackBar`, `MatDialog`, `InstallService`). Cubre la búsqueda por título, nota y etiqueta; los contadores de cada estado dentro del filtro activo; la prioridad escrita como palabra en la fila; añadir desde el borrador del campo de captura; la edición en línea; y el borrado con Deshacer.

El test de la tarea tachada comprueba que la fila se queda entre las pendientes mientras se dibuja el trazo y pasa a Hechas a los 650 ms. Usa el reloj de Jasmine y no `fakeAsync`: al final de un `fakeAsync` se vacían todos los temporizadores, incluido el timeout de carga de los chunks que Ionic pide al pintar la fila por primera vez, y Karma registraría `ChunkLoadError`.

```ts
jasmine.clock().install();
taskServiceMock.tasks.set([makeTask({ id: 1, title: 'Water the plants' })]);

component['toggleTaskState'](1);
expect(ids(component['openTasks']())).toEqual([1]);

jasmine.clock().tick(650);
expect(ids(component['doneTasks']())).toEqual([1]);
jasmine.clock().uninstall();
```

El botón de instalar se prueba con los tres métodos de `InstallService`: oculto si no se puede instalar, abre el diálogo del navegador si lo hay, y abre la guía de iOS en otro caso.

## Web — instalación (`apps/web/src/app/core/services/install.service.spec.ts`)

`Platform` de Ionic se sustituye por un objeto que responde `is('ios')` / `is('pwa')`, y el evento de Chromium se simula sobre `window`:

```ts
it('installs through the browser prompt and stops offering it', async () => {
  const service = createService('android');
  const event = offerInstallPrompt('accepted');

  expect(await service.promptInstall()).toBeTrue();
  expect(event.prompt).toHaveBeenCalledTimes(1);
  expect(service.method()).toBe('none');
});
```

También cubre que el banner propio del navegador se retiene (`preventDefault`), que tras rechazar se espera un evento nuevo, que `appinstalled` oculta el botón, que dentro de la app instalada no se ofrece nada y que ocultar el botón se recuerda entre arranques. `InstallGuideComponent` tiene su propio spec: tres pasos en orden, «Entendido» cierra y «Ocultar el botón de instalar» lo oculta y cierra.

## Web — formularios y controles

- `TaskComposerComponent`: los detalles quedan plegados hasta que se escribe algo, no añade un título vacío, entrega un borrador recortado con las etiquetas ya parseadas, y tras añadir se vacía y deja el campo listo.
- `TaskEditorComponent`: parte de la tarea y enfoca su título, guarda los campos editados y se cierra con Escape.
- `SegmentedControlComponent`: `radiogroup` con nombre y una opción marcada, solo la marcada en el orden de tabulación, selección con clic y con flechas (con vuelta al principio) y contador junto a cada etiqueta.
- `TagFieldComponent`: sugiere las etiquetas conocidas, filtra por la que se está escribiendo, no repite las ya escritas y añade la sugerencia lista para la siguiente.
- Helpers de `types/task.ts`: etiquetas en minúsculas, sin duplicados y como máximo seis; prioridades en inglés y español con `medium` por defecto; orden por prioridad y después por fecha.

## Web — tema e idioma

`ThemeService` activa a la vez la paleta oscura de la app y la de Ionic, y ajusta el color de la barra del navegador al de la cabecera. `LanguageService` actualiza `lang` en `<html>` para los lectores de pantalla e ignora idiomas que la app no incluye.
