# Design — gl-03-catalogo-fetch

## Context

Ver `proposal.md` (Why). Estado actual: `catalogo.js` es el placeholder de GL-02 (caparazón IIFE + `L.catalogo = { iniciar }`, `iniciar` vacío); la sección `#catalogo` ya trae el marcado necesario (buscador, `select limit` 5/10/20/50/100, nodos `#catalogo-cargando`, `#catalogo-error` + `#catalogo-reintentar`, `#catalogo-sin-resultados`, `#catalogo-vacio`, `#catalogo-lista`, `#catalogo-paginacion` con anterior/siguiente, `#catalogo-pagina`, `#catalogo-detalle`). Contrato a consumir sin modificar: `L.api.get` (base `/api`, omite `""`/`null`/`undefined`, conserva `offset: 0`, lanza `ApiError` con `esRed`) y `L.util` (`el`, `porId`, `limpiar`, `mostrar`/`ocultar`, `importe`, `mensajeDeError`). Datos según `docs/CONTRATO-API.md`: listado sin autores, detalle con `autores[{autor_id, rol, orden, autor:{id, nombre}}]`, `genero` nullable, precio decimal (string o número según versión), orden por id ascendente, sin total.

## Goals / Non-Goals

**Goals:** catálogo funcional del Ejercicio 1 con los 5 escenarios de `CHANGES.md` verificables contra el backend real; cero regresiones en otros módulos.

**Non-Goals:** no se toca `api.js`, `util.js`, `app.js`, otros módulos JS, otras secciones del HTML ni `backend/`; no se usa `L.estado`/`L.registrarCliente` (GL-04/GL-05); no hay listado de clientes/autores; no se persiste nada en el navegador.

## Decisions

1. **Estado local `{ filtro, limit, offset, peticionSeq }` + anti-carreras por secuencia.** Cada `cargar()` incrementa `peticionSeq` y solo la respuesta con el número vigente pinta. Alternativa descartada: `AbortController` por petición — más código para el mismo efecto y el contrato `L.api` no expone cancelación.
2. **`titulo` con `trim`; vacío = sin filtro (se pasa `""` y `api.js` lo omite).** `offset: 0` sí se envía siempre (api.js conserva el `0`). Reset de `offset` a 0 ante cambio de filtro o de `limit`. Alternativa descartada: no enviar `titulo` vacío explícitamente — equivalente, pero pasar `""` documenta la intención y delega en el contrato probado.
3. **Paginación sin total: siguiente visible/habilitado solo si `data.length === limit`; anterior deshabilitado si `offset === 0`.** Es lo que permite el contrato (`docs/CONTRATO-API.md` §Detalles). `#catalogo-pagina` muestra texto informativo derivado (`«Página N (desde el registro M)»` o similar; el texto exacto queda abierto — pregunta abierta abajo). Alternativa descartada: pedir `limit+1` para detectar fin — llamada extra de lógica no pedida.
4. **Render solo con `L.util.el` + `textContent`; precio con `L.util.importe`; género `null` → «Sin clasificar».** Cumple reglas duras 4 y 7 (importes tal cual, nunca `innerHTML` con datos). Botón «Ver detalle» por libro con `data-id` y un solo listener delegado en `#catalogo-lista`.
5. **Detalle `GET /libros/{id}` (sin barra final agregada) en `#catalogo-detalle`; autores como `nombre — rol (orden N)`; 404 muestra el mensaje del servidor vía `L.util.mensajeDeError`.** Sin reflotar la lista al abrir el detalle (el detalle vive en su propio nodo `aria-live`).
6. **Estados 1:1 con nodos existentes; `#catalogo-reintentar` repite la última petición con los mismos parámetros.** Errores de red (`esRed`) y de servidor (5xx) comparten el nodo de error con el mensaje ya listo de `ApiError`; 422 de query inválida también cae al nodo de error (no hay formulario que validar más allá del `select` acotado 1–100).
7. **`iniciar()` cablea eventos una vez (Buscar click + submit del form con `preventDefault`, cambio de `limit`, anterior/siguiente, reintentar, delegación del detalle) y dispara la primera carga.** Sin lecturas a otros módulos; sin `fetch` directo; `GET /libros/` con barra final y `GET /libros/{id}` sin barra agregada (cfr. docs/CONTRATO-API.md:9).

## Risks / Trade-offs

- [Respuesta vieja pinta sobre la nueva] → contador `peticionSeq`; solo la última vale (`docs/ARQUITECTURA-FRONTEND.md` lo exige).
- [`precio` llega string o number según versión] → `L.util.importe` acepta ambos; se verifica con llamada real en tasks (pregunta abierta, no se asume).
- [`#catalogo-pagina` sin total puede confundir] → texto informativo honesto (desde/registros mostrados), sin inventar totales.
- [Regresión en `index.html` por editar sección ajena] → mitigación: tocar solo `#catalogo`; si falta marcado, ajuste mínimo dentro de la sección; CSS solo al final de `styles.css`.
- [Detalle 404 tras borrar el libro entre lista y click] → muestra el mensaje del servidor, no rompe la lista.

## Migration Plan

Sin migración: cambio de frontend puro. Rollback = revertir el commit del change. Despliegue real en GL-07; este change solo debe verificarse local contra el contenedor de GL-01 + backend con seed.

## Open Questions

Llevadas a «Preguntas abiertas» (NO se deciden en silencio; no cambian specs, enfoque ni tasks):

- **Editorial `null`:** ¿puede llegar `editorial: null` como el género? El contrato solo documenta género nullable. Comportamiento propuesto si aparece: texto «Sin editorial» (a confirmar con llamada real; si nunca es null, no se necesita).
- **Tipo real de `precio` en lectura:** ¿string o número en esta versión del backend? Se verifica con llamada real y se usa `L.util.importe` en ambos casos.
- **Texto exacto de `#catalogo-pagina`:** informativo sin total (p. ej. «Mostrando N libros (desde el registro M)»). Redacción final al implementar.
- **Detalle inline vs. reemplazo de lista:** resuelto en Decisión 5 — inline en `#catalogo-detalle` manteniendo la lista visible (menos sorpresas, `aria-live` ya previsto); alternativa descartada: reemplazo de lista.
- **PA-8 (`?v=` de los `<script>`):** si al tocar `catalogo.js` corresponde subir su `?v=5`, se hace solo en esa línea en el apply, previa confirmación del equipo.
