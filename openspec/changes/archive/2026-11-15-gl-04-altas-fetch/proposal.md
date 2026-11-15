# Proposal — GL-04 altas-fetch

## Why

La consigna (`docs/Consignas_Global.pdf`, **Ejercicio 2 · Alta de libros y clientes**, 20 puntos) pide que las pantallas de alta del parcial 1 escriban en PostgreSQL a través de la API, en vez de simular el alta en el navegador. Hoy `frontend/public/js/libros.js` y `frontend/public/js/clientes.js` son **placeholders vacíos** que dejó GL-02: las secciones `#libros` y `#clientes` ya existen con su marcado y sus `id`, pero no piden ni envían nada.

Es el change `[GL-04] altas-fetch` de `CHANGES.md`. Arranca con el **Gate A** abierto (GL-02 archivado) y es el que produce la lista compartida de clientes (`L.estado.clientes` / `L.registrarCliente`) que consume GL-05 para armar una venta.

## What Changes

- **`js/libros.js` — alta de libro** (`POST /libros/`): título, ISBN, precio, stock, editorial y género; opciones de editorial y género cargadas de `GET /editoriales/` y `GET /generos/`; lista de autorías construida de a una, verificando cada autor con `GET /autores/{id}` y **mostrando su nombre antes de agregarlo**; `rol` desde el conjunto cerrado del contrato y `orden` entero ≥ 1.
- **`js/libros.js` — listado de libros registrados**: `GET /libros/` (`limit=100`, `offset=0`) con estados cargando / vacío / error con «Reintentar»; precio mostrado tal cual llega y «Sin clasificar» cuando el género es nulo.
- **`js/clientes.js` — alta de cliente** (`POST /clientes/`) con nombre y email, y **búsqueda por ID** (`GET /clientes/{id}`) que muestra el nombre del cliente encontrado y lo registra en la memoria compartida.
- **`js/clientes.js` — tabla de clientes de la sesión** alimentada por `L.estado.clientes` y redibujada con el evento `libreria:clientes`, con su estado vacío.
- **Validación en el cliente** antes de llamar a la API: campos obligatorios, formato de email, precio > 0 con hasta 2 decimales, stock entero ≥ 0, editorial elegida, al menos una autoría, ID de búsqueda entero ≥ 1. Un alta inválida **no genera petición**.
- **Mensajes del servidor**: en 409 y 422 se muestra el `detail` (aplanado por `L.api` para 422) junto al formulario, **conservando lo escrito**; se distingue el error de conexión / servidor no disponible, con «Reintentar» en las operaciones de lectura.
- **Uso del registro devuelto (201)**: el libro creado se agrega al listado y el cliente creado se registra con `L.registrarCliente` y aparece en la tabla, sin recargar la página.
- **Botones deshabilitados mientras se envía** una alta (libro y cliente), con el estado `cargando` donde corresponde.
- **`#clientes` de `index.html`**: se agrega un botón «Reintentar» para la búsqueda por ID (la única lectura de esa sección que no lo tenía). **No** se cambia nada más del HTML: el marcado de `#libros` y `#clientes` ya alcanza.
- **Sin cambios** en `api.js`, `util.js`, `app.js`, `catalogo.js`, `ventas.js`, `historial.js`, `css/styles.css`, `index.html` fuera de `#clientes`, ni en `backend/`. Sin dependencias nuevas, sin frameworks, sin `localStorage`.

## Capabilities

### New Capabilities

- `frontend-book-registration`: alta de libros contra `POST /libros/` — opciones de referencia desde la API, verificación de autores por ID, armado de autorías, validación en el cliente, mensajes del servidor, uso del 201 y listado de libros registrados con sus estados.
- `frontend-client-registration`: alta y consulta de clientes contra `POST /clientes/` y `GET /clientes/{id}` — validación en el cliente, mensajes del servidor, registro del 201 en la memoria compartida y tabla de clientes de la sesión.

### Modified Capabilities

- Ninguna. `frontend-app-shell` (GL-02) ya define el estado de clientes en memoria, el evento `libreria:clientes`, el contrato `window.Libreria` y la prohibición de persistir registros: este change **los usa**, no cambia su comportamiento. `frontend-http-client` tampoco cambia.

## Impact

- **Código**: `frontend/public/js/libros.js`, `frontend/public/js/clientes.js` (hoy placeholders) y el bloque `#clientes` de `frontend/public/index.html`. Nada más.
- **API consumida** (solo rutas de `docs/CONTRATO-API.md`, con su barra final exacta): `GET /editoriales/`, `GET /generos/`, `GET /autores/{id}`, `POST /libros/`, `GET /libros/`, `POST /clientes/`, `GET /clientes/{id}`.
- **Consumidores**: GL-05 lee `L.estado.clientes` y escucha `libreria:clientes`; GL-07/GL-08 verifican los casos **G-02** y **G-03** desde la URL pública. Si GL-05 no está implementado todavía, el selector de clientes funciona con la búsqueda por ID (lo prevé `CHANGES.md`).
- **Dependencias**: GL-02 archivado (`L.api`, `L.util`, `L.estado`, `L.registrarCliente` y los `id` del HTML). Sin librerías nuevas.
- **Despliegue**: sin impacto en la imagen (mismos archivos estáticos); verificación local por el contenedor de GL-01 en `http://127.0.0.1:8080`.
- **Riesgo principal**: el cacheo del navegador puede servir los JS viejos; ver la pregunta abierta **OQ-GL04-1** (`?v=`, PA-8).

## Preguntas abiertas

> Van acá y no como decisión silenciosa (`AGENTS.md` regla 12). Lo que ya está resuelto por el contrato o el PDF **no** figura en esta lista: los valores de `rol` (`autor`, `coautor`, `traductor`, `ilustrador`) y la obligatoriedad de al menos una autoría salen del PDF (Ejercicio 2) y de `docs/CONTRATO-API.md` §Alta de libro.

| # | Pregunta | Estado / propuesta |
|---|---|---|
| **OQ-GL04-1** | **PA-8** de `CHANGES.md`: ¿quién sube el parámetro `?v=` de los `<script>` de `index.html` en cada change? | Sin resolver por el equipo. **Este change no toca `?v=`**: la verificación se hace con recarga forzada (Ctrl+F5) y se avisa en el PR. Si el equipo decide que cada dueño lo sube, es un cambio de una línea en `#libros`/`#clientes` (fuera del alcance actual). |
| **OQ-GL04-2** | **PA-9** de `CHANGES.md`: ¿GL-04 parte solo del kit (`docs/referencia/frontend-js/`) y los docs, o reutiliza fragmentos del `app.js` del parcial 1? | **Propuesta:** kit + docs; el `app.js` viejo queda en el historial de git solo como referencia de marcado y validaciones (misma decisión que GL-02, D1). Decisión del equipo. |
| **OQ-GL04-3** | ¿`orden` de las autorías debe ser contiguo desde 1, o tiene otro significado (orden de mención, por ejemplo)? El PDF y el contrato solo dicen «entero ≥ 1». | **Propuesta provisoria (design D6):** `orden` = posición en la lista (1…n), reasignado al quitar una autoría, sin campo editable. Si la cátedra espera otro criterio, se ajusta solo esa función. |
| **OQ-GL04-4** | ¿El stock es obligatorio en el formulario o se puede omitir y asumir 0? El HTML del borrador lo precarga en `0`, y el contrato exige el campo. | **Propuesta:** si el campo queda vacío se rechaza en el cliente con un mensaje («ingresá un entero ≥ 0»), sin asumir 0 en silencio. Confirmar con el equipo. |
| **OQ-GL04-5** | ¿El libro nuevo debe aparecer en `#catalogo` sin recargar la página? Eso exigiría que GL-03 escuche un evento nuevo que hoy no está en el contrato de `window.Libreria`. | **Propuesta:** no en GL-04. El libro se agrega al **listado de `#libros`** con el registro devuelto; en el catálogo aparece cuando el catálogo vuelve a consultar `GET /libros/` (Buscar o recargar). Si el equipo quiere refresco en vivo, se coordina con Andrés (GL-03) como evento compartido, no se improvisa acá. |
| **OQ-GL04-6** | Los `msg` de los 422 de Pydantic vienen en inglés (heredado de GL-02, OQ-2). | **Propuesta:** mostrarlos tal cual llegan (el requisito es «mostrar el mensaje del servidor»). Si molestan en la demostración, se tratan en un change posterior. |
