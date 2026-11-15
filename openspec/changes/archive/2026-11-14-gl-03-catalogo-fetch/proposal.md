# Proposal — gl-03-catalogo-fetch

## Why

El catálogo es el Ejercicio 1 del Global (20 pts) y la primera pantalla que consume la API real: sin él la librería no muestra ningún libro y los casos G-01 de la cátedra no pueden verificarse. GL-02 ya dejó la base (`L.api`, `L.util`, sección `#catalogo` y placeholder de `catalogo.js`); este change implementa el módulo pendiente antes de que GL-07 despliegue lo integrado.

## What Changes

- Implementa `frontend/public/js/catalogo.js` (reemplaza el placeholder de GL-02, conserva caparazón IIFE + `L.catalogo = { iniciar }`):
  - `GET /libros/` con `titulo` (búsqueda parcial, trim; vacío = sin filtro), `limit` y `offset`; `offset` vuelve a 0 al cambiar filtro/limit.
  - Paginación anterior/siguiente sin total del servidor (siguiente solo si `data.length === limit`; anterior deshabilitado si `offset === 0`); anti-carreras con contador de secuencia (solo vale la última respuesta).
  - Render solo con `L.util.el` (nunca `innerHTML` con datos); precio con `L.util.importe`; género `null` → «Sin clasificar»; botón «Ver detalle» por libro con `data-id`.
  - Detalle por `GET /libros/{id}` con autores (nombre + rol + orden) en `#catalogo-detalle`; 404 muestra el mensaje del servidor.
  - Estados 1:1 con los nodos existentes: `#catalogo-cargando`, `#catalogo-vacio` (sin filtro), `#catalogo-sin-resultados` (con filtro), `#catalogo-error` + `#catalogo-reintentar` (repite la última petición), lista + paginación en éxito.
- Ajusta solo la sección `#catalogo` de `frontend/public/index.html` si falta marcado necesario (sin tocar otras secciones); reglas nuevas solo al final de `frontend/public/css/styles.css` si hacen falta.
- No toca `api.js`, `util.js`, `app.js`, otros módulos JS, otras secciones del HTML ni `backend/`. No usa `L.estado` (es de GL-04/GL-05), ni `fetch` directo, ni URL del backend: solo `L.api` (base `/api`); `GET /libros/` con barra final; `GET /libros/{id}` sin barra agregada (cfr. docs/CONTRATO-API.md:9).

## Capabilities

### New Capabilities

- `frontend-catalogo`: catálogo de libros con búsqueda por título, paginación, detalle con autores y los cinco estados de interfaz (cargando / vacío / sin coincidencias / error con reintento / éxito).

### Modified Capabilities

_(ninguna — `frontend-app-shell` y `frontend-http-client` no cambian; este change solo consume su contrato.)_

## Impact

- Archivos: `frontend/public/js/catalogo.js` (dueño Andrés), sección `#catalogo` de `frontend/public/index.html`, opcionalmente el final de `frontend/public/css/styles.css`.
- Depende de GL-02 archivado y mergeado en `main` (Gate A de `CHANGES.md`); no bloquea a GL-04/GL-05 (corren en paralelo) pero debe estar archivado junto a ellos antes de GL-07.
- Sin cambios de API, backend, despliegue ni dependencias nuevas.
