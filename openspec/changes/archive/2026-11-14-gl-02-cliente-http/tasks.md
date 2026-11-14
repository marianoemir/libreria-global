# Tasks

> **Cómo se verifica este change:** no hay framework de tests de frontend. El gate ejecutable es `prueba-api.js` (23 comprobaciones con `node`) y cubre el cliente HTTP y las utilidades; el resto se verifica con comandos (`Select-String`), la pestaña Red y la consola del navegador contra el backend real con seed, según la política del proyecto (`AGENTS.md`). Como el código de partida ya está probado, el ciclo es: correr el gate sobre el kit (línea base) → copiar → volver a correr el gate sobre `frontend/public/js` (debe seguir verde) → verificación de integración.

## 1. Preparación y línea base

- [x] 1.1 Crear la rama de trabajo `feature/gl-02-cliente-http` desde `main` actualizado; verificar con `git branch --show-current` que devuelve `feature/gl-02-cliente-http` (no commitear todavía).
- [x] 1.2 Correr el gate sobre el kit antes de copiar: `node docs/referencia/frontend-js/prueba-api.js`; verificar que imprime `23 OK, 0 fallas` y sale con código 0.
- [x] 1.3 Registrar la línea base del problema: buscar `localstorage|sessionstorage|indexeddb` (sin distinguir mayúsculas) en `frontend/public/` y guardar la salida en las notas del PR; verificar que hoy hay coincidencias en `js/app.js` (prueba de que se elimina persistencia real, no un grep vacío desde el inicio).

## 2. Base compartida: `util.js` y `api.js`

- [x] 2.1 Copiar `docs/referencia/frontend-js/util.js` a `frontend/public/js/util.js` y verificar que el contenido es idéntico al origen (`Compare-Object (Get-Content …) (Get-Content …)` sin diferencias) y que expone `util`, `estado` y `registrarCliente`.
- [x] 2.2 Copiar `docs/referencia/frontend-js/api.js` a `frontend/public/js/api.js` y verificar que el contenido es idéntico al origen y que la base por defecto es `/api`.
- [x] 2.3 Correr el gate sobre lo copiado: `node docs/referencia/frontend-js/prueba-api.js frontend/public/js`; verificar `23 OK, 0 fallas`. Cubre los escenarios de query (con `offset=0` y vacíos omitidos), 409/422 con mensaje del servidor, 404, 502/503 HTML, 204 sin cuerpo y servidor apagado con `esRed = true`.

## 3. Módulos pendientes y arranque

- [x] 3.1 Copiar los cinco placeholders (`catalogo.js`, `libros.js`, `clientes.js`, `ventas.js`, `historial.js`) desde el kit y verificar que cada uno registra `window.Libreria.<modulo> = { iniciar }` y que ninguno llama a la API (`Select-String -Path frontend/public/js/catalogo.js,frontend/public/js/libros.js,frontend/public/js/clientes.js,frontend/public/js/ventas.js,frontend/public/js/historial.js -Pattern "L\.api|fetch\("` sin resultados).
- [x] 3.2 Copiar `app.js` del kit y verificar que solo contiene la lista de módulos y el `DOMContentLoaded` que llama `iniciar()`, sin `fetch` ni `localStorage` (`Select-String -Path frontend/public/js/app.js -Pattern "fetch|localStorage|innerHTML"` sin resultados).
- [x] 3.3 Confirmar que el `app.js` del parcial 1 quedó reemplazado: `Get-Item frontend/public/js/app.js` pesa ~1 KB (no ~35 KB) y `frontend/public/js/` contiene exactamente los 8 archivos acordados.

## 4. `index.html` con las secciones del borrador

- [x] 4.1 Reemplazar `frontend/public/index.html` por el contenido de `docs/referencia/index.draft.html` y verificar que declara los ocho `<script defer>` en el orden util, api, catalogo, libros, clientes, ventas, historial, app (revisión del bloque `<head>`).
- [x] 4.2 Verificar secciones, menú y prefijos de `id`: existen `#catalogo`, `#libros`, `#clientes`, `#ventas`, `#historial`, cada enlace del menú apunta a su sección y aparecen los prefijos `catalogo-`, `libro-`, `libros-`, `cliente-`, `clientes-`, `venta-`, `ventas-`, `renglon-` e `historial-` (`Select-String -Path frontend/public/index.html -Pattern "…"`).
- [x] 4.3 Verificar que no quedó persistencia en el navegador: `Get-ChildItem -Recurse frontend/public | Select-String -Pattern "localstorage|sessionstorage|indexeddb" -CaseSensitive:$false` no devuelve nada (escenario 4 de la spec). Si aparece algo, eliminarlo antes de seguir.
- [x] 4.4 Confirmar que `css/styles.css` no necesita cambios: las clases del borrador (`tabla-scroll`, `mensaje`, `mensaje-error`, `mensaje-exito`, `boton-primario`, `campo`) ya existen (`Select-String -Path frontend/public/css/styles.css -Pattern "\.tabla-scroll|\.mensaje-error|\.mensaje-exito|\.boton-primario|\.campo"` devuelve coincidencias).

## 5. Verificación integrada contra el backend real

- [x] 5.1 Con el backend corriendo con seed y el contenedor de GL-01 publicado en `http://127.0.0.1:8080`, abrir la página y verificar: carga sin errores en consola, no hay peticiones a `/api/` en la pestaña Red y las cinco secciones se alcanzan desde el menú (con los módulos pendientes, el contenido está vacío: es lo esperado).
- [x] 5.2 Verificar el armado de la URL real desde la consola del navegador: `await L.api.get('/libros/', {titulo:'rayu', limit:2, offset:0, vacio:''})` y comprobar en la pestaña Red que la petición es `GET /api/libros/?titulo=rayu&limit=2&offset=0` (sin `vacio`, con `offset=0`, ruta relativa al mismo origen).
- [x] 5.3 Verificar 409 y 422 reales desde la consola: `await L.api.post('/libros/', {isbn:'978-950-00-0001-1', titulo:'x', precio:1, stock:0, editorial_id:1, autores:[{autor_id:1, rol:'autor', orden:1}]})` debe lanzar `ApiError` con `status 409` y el `detail` del servidor; `await L.api.get('/libros/', {limit:0})` debe lanzar `status 422`, `esRed false` y un mensaje que nombre `limit`. Guardar la salida real de la consola.
- [x] 5.4 Verificar la distinción de errores: (a) con el frontend arriba y el backend caído, `await L.api.get('/health/ready')` debe lanzar `status 502` con `esRed false` y el mensaje «el servidor no está disponible (502)»; (b) con el contenedor del frontend detenido y la pestaña ya cargada, la misma llamada debe lanzar `status 0` con `esRed true`. Guardar ambas salidas.
- [x] 5.5 Repetir el gate completo al final: `node docs/referencia/frontend-js/prueba-api.js frontend/public/js` → `23 OK, 0 fallas`, y confirmar que `git diff --stat` no toca `backend/`, `css/`, `Dockerfile` ni `default.conf.template`.

## 6. Cierre y traspaso

- [ ] 6.1 Armar la descripción del PR con la evidencia real: salida del gate, salida del grep sin coincidencias, capturas/consola de 5.1–5.4 y la nota de que las secciones quedan vacías hasta GL-03/04/05 (no inventar resultados; pegar salidas).
- [ ] 6.2 Incluir en el PR la convención para los bloques de error con «Reintentar» (escribir en `…-error-texto` y alternar `hidden` del contenedor; no llamar `mostrar()` sobre el contenedor) y el uso del kit para los tres dueños.
- [x] 6.3 Llevar a la tabla «Preguntas abiertas» de `CHANGES.md` solo las OQ que el dueño acepte (OQ-1 a OQ-4 de `design.md`), sin tocar el roadmap ni la revisión; verificar con `git diff CHANGES.md`.
- [ ] 6.4 Confirmar con Facundo si se commitea y pushea (regla 16): no ejecutar `git commit`/`git push` sin pedido explícito.

## Workflow follow-up

- Revisión del PR por Mariano (revisor de GL-02) con el checklist de `AGENTS.md` antes de `/opsx:apply` ya cumplido acá.
- Archivar el change (`/opsx:archive gl-02-cliente-http`) recién con los escenarios verificados y mergeado en `main`; recién entonces marcar `[x]` en `CHANGES.md`.
- Avisar a Andrés (GL-03/04/05) que el Gate A quedó abierto y que `L.api`, `L.util`, `L.estado` y los `id` del HTML ya son el contrato vigente.
