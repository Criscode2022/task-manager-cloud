---
title: Producto y features
---

# Producto y features

## Problema

Las apps de tareas suelen exigir registro completo, fallan sin red o acoplan el cliente a un BaaS monolítico. El objetivo era una PWA instalable, usable 100% offline, con sync opcional controlada por una API propia sobre Postgres serverless (Nest + Neon + Vercel).

## Solución

Cliente offline-first con **Ionic Storage**. Con sesión activa, sube y baja tareas vía Nest. Auth ligera por **PIN de 8 dígitos** (hash + pepper) y sesiones **JWT**. Deploy unificado en Vercel.

## Características

### Captura en la cabecera
El campo de captura vive en la cabecera de tinta: se escribe el título y se pulsa Intro. Al escribir se despliega una nota opcional, la prioridad y las etiquetas; tras añadir, el campo se vacía y conserva el foco para la siguiente tarea. Escape con un borrador pide confirmación antes de descartarlo.

### Prioridad y etiquetas
Campos `priority` (`low` / `medium` / `high`) y `tags[]` en Postgres, con índices GIN. En la UI la prioridad se escribe como palabra (Alta, Media, Baja) junto a su color, nunca solo por color. Hasta seis etiquetas por tarea, en minúsculas y sin duplicados, con sugerencias de las que ya existen.

### Completar, editar y borrar
Tocar el anillo completa la tarea: un trazo de tinta tacha el título y la fila espera 650 ms antes de pasar a Hechas. Tocar el texto abre el editor en su sitio. En el móvil, deslizar a la derecha edita y a la izquierda borra; una pulsación larga copia el texto. Borrar es inmediato y ofrece Deshacer durante cinco segundos.

### Filtros y búsqueda
Un control segmentado Todas / Pendientes / Hechas con contadores, chips de prioridad y de etiqueta, y una búsqueda en la cabecera sobre título, nota y etiquetas.

### Offline-first
Ionic Storage mantiene la lista usable sin red; la nube no es SPOF de la UI.

### Sync unitario y bulk
API REST: `POST /tasks`, `POST /tasks/bulk`, `PUT`, `DELETE` protegidos por JWT.

### Auth PIN + sesión
Registro/login con PIN, JWT (`sub` + `sid`), tabla `sessions` y rate-limit en auth. El PIN se muestra una sola vez, en dos grupos de cuatro, con botón de copiar.

### PWA instalable
Service worker Angular y manifest con iconos propios. El botón de instalar de la cabecera abre el diálogo de instalación del navegador en Chrome, Edge y Samsung Internet. En iPhone y iPad, donde una web no puede lanzar la instalación, muestra los pasos de Compartir → Añadir a pantalla de inicio. Se oculta cuando la app ya está instalada.

### i18n y temas
ngx-translate con idiomas EN/ES en el cliente, y modo claro y oscuro.

### Diseño «Ballpoint Ink»
Cabecera azul bolígrafo con el campo de captura, tareas en grupos blancos sobre un fondo de tinta pálida y Bricolage Grotesque para las palabras que se leen y escriben. Sistema completo en [`apps/web/DESIGN.md`](../apps/web/DESIGN.md).
