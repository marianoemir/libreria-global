# Design — GL-02 cliente-http

## Context

Ver `proposal.md` — Why. Estado actual relevante para el enfoque:

- `frontend/public/` tiene el `index.html` del parcial 1, `css/styles.css` y un único `js/app.js` de ~35 KB / ~1100 líneas que mezcla DOM, validaciones, estado y `localStorage`.
- GL-01 (archivado) construye la imagen del frontend copiando `frontend/public/` a la raíz web de Nginx y proxea `/api/` → `API_UPSTREAM`. No hay que tocar la imagen.
- `docs/ARQUITECTURA-FRONTEND.md` y `docs/referencia/` ya definen el destino: archivos por responsabilidad, contrato `window.Libreria`, orden de carga y el HTML de todas las secciones con sus `id`.
- El kit `docs/referencia/frontend-js/` (util, api, placeholders, app) y `prueba-api.js` están **probados**: 23 comprobaciones con `node`.
- No hay framework de tests de frontend. La verificación ejecutable es `prueba-api.js`; el resto es navegador contra el backend real con seed (pestaña Red / consola), según la política del proyecto.

## Goals / Non-Goals

**Goals:**

- Dejar la base común mínima y estable: cliente HTTP, utilidades, arranque, 5 placeholders y el HTML con los `id` acordados.
- Que GL-03, GL-04 y GL-05 puedan trabajar en paralelo sin tocar los archivos de otro dueño.
- Que el contrato `window.Libreria` del código coincida exactamente con el documentado, para que los módulos escritos contra el doc funcionen sin ajustes.

**Non-Goals:**

- Implementar catálogo, altas, ventas o historial (son GL-03/04/05, con sus propias specs y escenarios).
- Estados de interfaz de cada pantalla (cargando / vacío / sin coincidencias / error / éxito): los usan los módulos; GL-02 solo deja el marcado y los contenedores.
- Tocar CSS, `Dockerfile`, `default.conf.template`, `backend/` o el despliegue.
- Agregar dependencias, bundler o tests nuevos.

## Decisions

### D1 — Copiar el kit probado, no reescribirlo

`util.js`, `api.js`, `app.js` y los 5 placeholders se copian **tal cual** desde `docs/referencia/frontend-js/` a `frontend/public/js/`.

- **Por qué**: el kit ya pasa las 23 comprobaciones y su contrato es el que documenta `ARQUITECTURA-FRONTEND.md`. Reescribirlo introduce divergencia entre doc, código y pruebas.
- **Alternativa descartada**: partir del `app.js` del parcial 1 y refactorizarlo en vivo → más tiempo, más riesgo de arrastrar `localStorage` y de romper comportamiento que igual se va a reimplementar.
- **Verificación**: comparar el contenido copiado con el origen (`Compare-Object`/hash); debe ser idéntico.

### D2 — `ApiError` como función constructora, no `class`

Se mantiene la función con `prototype = Object.create(Error.prototype)` del kit.

- **Por qué**: `prueba-api.js` verifica `instanceof` y `e.status/e.mensaje/e.esRed`; el kit ya funciona en el entorno de `node` sin transpilar. `class` sería equivalente pero obliga a reescribir un archivo ya verificado.
- **Alternativa descartada**: `class ApiError extends Error` → sin beneficio funcional y rompe la copia literal.

### D3 — La query omite solo `""`, `null` y `undefined`

- **Por qué**: `offset=0` es un valor válido y debe viajar; un `if (!valor) return` lo descartaría y rompería la paginación de GL-03. Los valores se codifican con `encodeURIComponent` para títulos con espacios y acentos.
- **Alternativa descartada**: filtrar por “truthy” → bug silencioso con `0` y `false`.

### D4 — 422 se convierte en un texto legible

La lista de `detail` se aplana a `Datos inválidos — campo: mensaje; …`, quitando `body`/`query`/`path` de `loc`.

- **Por qué**: el contrato pide que `api.js` convierta la lista; incluir el campo permite que el dueño del formulario marque el input. Es el comportamiento ya probado.
- **Trade-off**: los `msg` de Pydantic vienen en inglés. Se acepta: el requisito es mostrar el mensaje del servidor, y el 409/422 de negocio ya es texto en español. Queda como pregunta abierta si conviene humanizarlos más adelante.

### D5 — 502/503/504 no son “error de conexión”

Un 502/503/504 (aunque el cuerpo sea HTML de Nginx) conserva su `status`, deja `esRed = false` y muestra “El servidor no está disponible (código)”.

- **Por qué**: `esRed` está reservado para “no hubo respuesta”. La UI decide con `esRed` si dice “revisá tu conexión”; culpar a la red cuando Nginx está vivo y el backend caído es engañoso. Además, la spec exige poder distinguirlos.
- **Alternativa descartada**: tratar 502 como red caída → mensaje incorrecto y escenario (3) ambiguo.

### D6 — Se conserva `base` con getter/setter

`L.api.base` vale `"/api"` y el setter solo existe para que `prueba-api.js` apunte a un servidor falso local.

- **Por qué**: es la única forma de probar el cliente fuera del navegador sin duplicar código; en la aplicación nadie lo cambia y el valor por defecto es el prefijo relativo.
- **Alternativa descartada**: `if (window.__TEST__)` o variables de build → requieren bundler/entorno, prohibido por el stack.

### D7 — `L.util.mostrar` no cambia; los bloques de error con botón se manejan aparte

El borrador tiene `<p id="…-error">` con un `<span id="…-error-texto">` y un botón «Reintentar» adentro. `mostrar(nodo, texto)` escribe `textContent`, así que llamarlo sobre el contenedor **borraría el botón**. Convención para los módulos: escribir el texto en el `span` y alternar `hidden` en el contenedor; `mostrar`/`ocultar` quedan para mensajes `<p>` sin hijos.

- **Por qué**: preserva el contrato de util documentado (que GL-03/04/05 ya asumen) y los `id` del borrador, sin que GL-02 invente una API nueva.
- **Alternativa descartada**: cambiar `mostrar` para que escriba en el primer hijo → rompe la semántica documentada y el kit probado.

### D8 — Cinco módulos vacíos con `iniciar()` y un TODO del dueño

- **Por qué**: el alcance de GL-02 es la base. Implementar acá el catálogo o las ventas duplicaría el trabajo de GL-03/04/05 y generaría conflictos en los mismos archivos. El arranque ya ignora módulos ausentes, así que la página funciona igual.
- **Consecuencia asumida**: hasta que esos changes se archiven, las secciones se ven sin datos (lo anticipa `CHANGES.md`). La lógica del parcial 1 queda en el historial de git como referencia de marcado y validaciones.

### D9 — `index.html` se reemplaza por el borrador

- **Por qué**: el HTML actual está acoplado al `app.js` monolítico; el borrador ya tiene las secciones, `aria`, estados y los `id` que los tres dueños van a usar. Se conservan el título, el `h1` y el parámetro de caché `?v=5` en los `<script>`.
- **CSS**: no se toca. Se verificó que las clases del borrador ya existen en `styles.css` (`tabla-scroll`, `mensaje`, `mensaje-error`, `mensaje-exito`, `boton-primario`, `campo`).
- **Alternativa descartada**: fusionar el HTML viejo con el borrador → deja `id` y campos huérfanos del parcial 1.

### D10 — `prueba-api.js` queda en `docs/referencia` y se corre apuntando a `frontend/public/js`

Uso: `node docs/referencia/frontend-js/prueba-api.js frontend/public/js` (el script resuelve rutas relativas al directorio actual y agrega la barra final).

- **Por qué**: no se copia código de prueba al sitio servido ni a la imagen; el kit sigue siendo el dueño de su prueba y la misma prueba valida lo copiado.
- **Alternativa descartada**: mover la prueba a `frontend/` → la imagen de GL-01 no la necesita y agrega ruido al entregable.

### D11 — Clientes compartidos en memoria con `Map` y evento

`L.estado.clientes` es un `Map<id, {id, nombre, email}>`; se escribe solo con `L.registrarCliente`, que valida `id` numérico, descarta campos extra y emite `libreria:clientes` en `document`.

- **Por qué**: no existe `GET /clientes/`; el `Map` da búsqueda por `id` en O(1) y el evento desacopla la tabla de clientes del selector de ventas sin que un módulo lea variables del otro (regla 10).
- **Alternativa descartada**: array compartido y redibujado manual → acoplamiento y errores de orden de carga.

### D12 — El `app.js` del parcial 1 se elimina en este change

- **Por qué**: es el único archivo que usa `localStorage`; el escenario de `grep` solo pasa si desaparece. No se conserva una copia en `frontend/public/`, porque el Dockerfile copia todo ese directorio.
- **Rollback**: el archivo sigue en el historial de git; revertir el commit de GL-02 lo restaura.

### D13 — Sin cambios fuera de `frontend/public/`

No se toca `backend/`, `frontend/Dockerfile`, `frontend/default.conf.template`, `css/` ni `docs/`.

- **Por qué**: regla 11 (un change = un dueño) y GL-01 ya sirve `frontend/public/` sin distinción. Cualquier necesidad de CSS o de proxy se coordina, no se resuelve acá.

## Notas para GL-03, GL-04 y GL-05

- Rutas: pasar la ruta del backend **con su barra final exacta** (`/libros/`, `/libros/3`, `/ventas/`); el prefijo `/api` lo agrega `api.js`.
- Errores: `catch (e)` → `e.esRed` para “error de conexión” con «Reintentar»; `e.mensaje` siempre es mostrable (incluye el `detail` de 404/409 y el texto aplanado de 422).
- Mensajes: `L.util.mostrar`/`ocultar` para `<p>` sin hijos; para los bloques `…-error` con botón, escribir en `…-error-texto` y alternar `hidden` del contenedor (D7).
- Clientes: leer `L.estado.clientes` y escuchar `libreria:clientes`; escribir **solo** con `L.registrarCliente`.
- Importes: `L.util.importe` acepta string o número; los importes confirmados se muestran tal cual llegan.

## Risks / Trade-offs

- **La interfaz se ve vacía hasta GL-03/04/05** → está previsto en `CHANGES.md`; se avisa en el PR y en el resumen del change. No es un defecto de GL-02.
- **Los dueños llaman `mostrar()` sobre el contenedor de error y pierden el botón** → convención D7 documentada acá y en la descripción del PR; los placeholders apuntan a `ARQUITECTURA-FRONTEND.md`.
- **Divergencia entre el kit y lo copiado** → tarea de comparación (`Compare-Object`) y `prueba-api.js` como gate.
- **Caché del navegador con el `app.js` viejo** → los `<script>` llevan `?v=5`; ante duda, recarga forzada (Ctrl+F5) al verificar. Quién sube el número queda como pregunta abierta.
- **Conflictos de merge en `index.html`** entre los tres dueños → prefijos de `id` por sección y la regla ya acordada: se conservan ambas partes.
- **`L.api.base` modificable desde consola** → riesgo aceptado en un proyecto de cátedra; el valor por defecto es relativo y no hay dirección del backend en el código.

## Migration Plan

1. Copiar `util.js`, `api.js`, los 5 placeholders y `app.js` del kit a `frontend/public/js/` (reemplaza el `app.js` monolítico).
2. Reemplazar `frontend/public/index.html` por el borrador.
3. Gate ejecutable: `node docs/referencia/frontend-js/prueba-api.js frontend/public/js` → 23 OK, 0 fallas.
4. Smoke test con el backend con seed y el contenedor de GL-01 en `http://127.0.0.1:8080`: página sin errores de consola, sin llamadas a `/api/`, menú navegable.
5. Rollback: `git revert`/`git checkout` del commit de GL-02; no hay migración de datos ni cambios de infraestructura.

## UI Mockups

- Design system revision: n/a — `.active-orchestrator-state.json` tiene `visual_design.mode: "off"` y no existe `design-system/`.
- Decision: no (project policy)
- Date: 2026-11-14
- Preview: n/a
- Visual verify: n/a — el change no cambia la apariencia: reusa las clases existentes de `styles.css` y el marcado del borrador ya acordado.

## Open Questions

- **OQ-1**: ¿Quién sube el `?v=` de los `<script>` en cada change? Propuesta: cada dueño sube el número al tocar su archivo; GL-02 deja `5` como el borrador. No cambia specs ni tareas.
- **OQ-2**: ¿Se traducen/humanizan los `msg` en inglés de los 422 de Pydantic? Propuesta: no en GL-02; si molesta en la demostración, se trata en un change posterior. La spec solo exige mostrar campo + texto del servidor.
- **OQ-3**: ¿GL-03/04/05 parten solo del kit y los docs, o reutilizan fragmentos del `app.js` del parcial 1? Propuesta: kit + docs como base; el `app.js` viejo queda en git solo como referencia. Es una decisión del equipo, no del agente.
- **OQ-4**: ¿`prueba-api.js` se mantiene como chequeo de regresión de los changes siguientes o queda solo como referencia del kit? Propuesta: mantenerlo y correrlo al menos en GL-02 y GL-05.
