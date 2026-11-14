# Proposal — GL-02 cliente-http

## Why

El `app.js` del parcial 1 concentra en un archivo de ~1100 líneas el DOM, las validaciones, el estado y la persistencia en `localStorage`. Con tres personas trabajando en paralelo eso garantiza conflictos de merge, y `localStorage` contradice la integración: los datos deben venir de la API.

GL-02 es el **Gate A** de `CHANGES.md`: GL-03, GL-04 y GL-05 no arrancan hasta tener una base común, probada y estable sobre la que cada dueño escriba su módulo.

## What Changes

- Se reemplaza `frontend/public/js/app.js` (parcial 1) por ocho archivos con responsabilidad única, cargados en el orden fijado en `docs/ARQUITECTURA-FRONTEND.md`: `util.js`, `api.js`, los cinco módulos y `app.js` de arranque.
- `js/util.js`: utilidades de DOM (`el`, `porId`, `limpiar`, `mostrar`, `ocultar`), formatos (`importe`, `multiplicarImporte`, `fechaLocal`), validaciones de formulario y estado compartido de clientes **en memoria** (`L.estado.clientes`, `L.registrarCliente`, evento `libreria:clientes`).
- `js/api.js`: cliente HTTP único (`L.api`) con base `/api`; arma la query omitiendo parámetros vacíos; error uniforme `ApiError` (`status`, `mensaje`, `esRed`, `cuerpo`) que traduce 404/409/422 y los 502/503/504 de Nginx, y distingue la caída de red.
- `js/app.js`: solo arranque; en `DOMContentLoaded` llama a `iniciar()` de los cinco módulos e ignora los que no existen.
- Cinco módulos **vacíos** (`catalogo`, `libros`, `clientes`, `ventas`, `historial`) que registran `window.Libreria.<modulo> = { iniciar }`, para que cada dueño los implemente en su change.
- `frontend/public/index.html` adopta las secciones, los `id` y el orden de `<script defer>` de `docs/referencia/index.draft.html`.
- **BREAKING (interno)**: se elimina todo uso de `localStorage`, `sessionStorage` e `indexedDB` del código servido. Mientras GL-03/04/05 no estén archivados las secciones se ven vacías: es el estado esperado de GL-02.
- Sin cambios en `css/styles.css` (las clases del borrador ya existen), en `frontend/Dockerfile` / `frontend/default.conf.template` ni en `backend/`.

## Capabilities

### New Capabilities

- `frontend-http-client`: contrato del cliente HTTP único del navegador — base `/api`, rutas con su barra final exacta, armado de query, `ApiError` y distinción entre error del servidor y error de conexión.
- `frontend-app-shell`: estructura de la página y contrato entre módulos — archivos y orden de carga, `window.Libreria`, arranque, estado de clientes en memoria y prohibición de persistir datos en el navegador.

### Modified Capabilities

- Ninguna. `frontend-container-image` (GL-01) no cambia: la imagen sigue copiando `frontend/public/` sin modificaciones.

## Impact

- **Código**: `frontend/public/index.html` y `frontend/public/js/*` (8 archivos nuevos; el `app.js` del parcial 1 se elimina). Nada más.
- **Dependencias**: ninguna nueva. El material de partida está en `docs/referencia/frontend-js/` y se verifica con `node docs/referencia/frontend-js/prueba-api.js` (23 comprobaciones).
- **Consumidores**: GL-03, GL-04 y GL-05 usan `L.api`, `L.util`, `L.estado` y los `id` del HTML tal como quedan acá; cualquier cambio posterior del contrato debe coordinarse con ellos.
- **Despliegue**: sin impacto (misma imagen, mismos archivos estáticos). Verificación local por el contenedor de GL-01 en `http://127.0.0.1:8080`.
