# Tasks — gl-03-catalogo-fetch

> Alcance: SOLO `frontend/public/js/catalogo.js` + sección `#catalogo` de `index.html` (+ final de `styles.css` si hace falta). No tocar otros módulos, otras secciones ni `backend/`. Verificación: app por el contenedor de GL-01 (`http://127.0.0.1:8080`) contra backend real con seed + pestaña Red (casos G-01).

## 1. Listado y búsqueda

- [x] 1.1 Reemplazar el cuerpo placeholder de `catalogo.js` (conservar IIFE + `L.catalogo = { iniciar }`) con estado `{ filtro, limit, offset, peticionSeq }`, `cargar()` vía `L.api.get("/libros/", { titulo, limit, offset })` y render con `L.util.el` (nunca `innerHTML`); precio con `L.util.importe`, género `null` → «Sin clasificar»; verificar con `node --check frontend/public/js/catalogo.js` y `grep -rin "innerHTML\|localStorage\|fetch(" frontend/public/js/catalogo.js` sin coincidencias (salvo `L.api`); VERIFICAR género null → «Sin clasificar» (llamada real o dato forzado documentado).
- [x] 1.2 Cablear `iniciar()`: Buscar (click + submit con `preventDefault`), cambio de `limit` y `offset=0` al cambiar filtro/limit, primera carga al arrancar; verificar abriendo `http://127.0.0.1:8080/#catalogo` y viendo en Red `GET /api/libros/?limit=20&offset=0` → 200.
- [x] 1.3 VERIFICAR escenario 1 (seed): con backend con seed y sin filtro, la lista muestra los 5 libros (Rayuela, Bestiario, La invención de Morel, Respiración artificial, El túnel); verificar en Red `GET /api/libros/?limit=…&offset=0` → 200 con 5 elementos y captura de la lista.
- [x] 1.4 VERIFICAR escenario 2 (búsqueda): buscar `rayu` muestra solo Rayuela (Red: `GET /api/libros/?titulo=rayu&limit=…&offset=0`); buscar `zzzsinlibrozzz` muestra `#catalogo-sin-resultados` y oculta lista + paginación (Red: 200 con `[]`); verificar con capturas de ambos estados.

## 2. Paginación y detalle

- [x] 2.1 Implementar paginación sin total (siguiente solo si `data.length === limit`, anterior deshabilitado si `offset === 0`, `#catalogo-pagina` informativa) + anti-carreras por `peticionSeq`; verificar con `grep -n "peticionSeq" frontend/public/js/catalogo.js` y revisión del cableado anterior/siguiente.
- [x] 2.2 Implementar detalle `L.api.get("/libros/" + id)` en `#catalogo-detalle` con autores (nombre + rol + orden) y 404 con mensaje del servidor; botón «Ver detalle» por libro con `data-id` y listener delegado; verificar en Red `GET /api/libros/1` → 200. VERIFICAR 404: `GET /api/libros/999` → 404 muestra «Libro no encontrado» en `#catalogo-detalle` con la lista intacta + captura Red.
- [x] 2.3 VERIFICAR escenario 3 (paginación): con `limit=2`, avanzar muestra `offset=2` con otros 2 libros y retroceder vuelve a `offset=0` (Red: tres GET con `offset=0/2/0`); cambiar el filtro desde `offset=2` sale con `offset=0`; verificar con capturas de las tres peticiones.
- [x] 2.4 VERIFICAR escenario 4 (detalle): «Ver detalle» en Rayuela muestra «Julio Cortázar» con rol y orden; verificar en Red `GET /api/libros/1` → 200 y captura del detalle.

## 3. Estados, alcance e integración

- [x] 3.1 Implementar los 5 estados 1:1 con los nodos existentes (`#catalogo-cargando`, `#catalogo-vacio` sin filtro, `#catalogo-sin-resultados` con filtro, `#catalogo-error` + `#catalogo-reintentar` que repite la última petición, lista + paginación en éxito) usando `L.util.mostrar/ocultar/limpiar` y `L.util.mensajeDeError`; ajuste mínimo solo dentro de la sección `#catalogo` si falta marcado + reglas solo al final de `styles.css` si hacen falta; verificar que `git diff --name-only` solo lista archivos del change.
- [x] 3.2 VERIFICAR escenario 5 (error de conexión): con el backend apagado, abrir/buscar muestra `#catalogo-error` con mensaje de conexión y lista oculta (Red: sin respuesta → `esRed=true` (conexión); 502/5xx → mismo nodo de error vía `mensajeDeError`); levantar el backend, pulsar «Reintentar» y ver `GET /api/libros/…` → 200 con la lista de vuelta; verificar con capturas de ambos momentos.
- [x] 3.3 Verificación final de reglas duras 1–10 y G-01: `grep -ri "localhost:8000\|127.0.0.1:8000\|localStorage\|sessionStorage\|indexedDB\|innerHTML" frontend/public/js/catalogo.js` sin coincidencias de datos; `git diff --stat` sin `backend/` ni otros módulos; repasar los 5 escenarios G-01 (casos del Ejercicio 1) con backend con seed y dejar nota de la evidencia observada para el archive.

## Workflow follow-up

- Revisar los 4 artefactos con el checklist de `docs/PROMPTS-OPSX.md` antes de `/opsx:apply`.
- Archivar el change y marcar `[x]` en `CHANGES.md` solo para GL-03 tras evidencia real.
