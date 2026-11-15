# CHANGES.md — Roadmap del Global (integración y despliegue)

> Roadmap **de la raíz del monorepo** (`libreria-global`). Es independiente del de `backend/CHANGES.md` (CH-01…CH-17, ya cerrado) y de los changes del frontend del parcial 1 (`frontend/openspec/changes/archive/`, ej1…ej6). Esos **no se tocan**.
> Prefijo `GL-` para no confundirlo con `CH-xx` ni con los casos `G-01…G-07` de la cátedra.
> **Revisión 1 · 14/11/2026.** Entrega: cierre del campus **martes 17/11/2026 00:00** → entregar antes de las **20:00 del lunes 16/11**.
> Reparto y cronograma: `docs/DIVISION-DEL-EQUIPO.md`. Consigna: `docs/Consignas_Global.pdf`.

**Cómo se usa:** un change = un dueño = una sesión de ~2 a 6 h. Se hace `/opsx:propose GL-0X-nombre` solo cuando las **dependencias están archivadas y mergeadas en `main`** (y hecho `git pull`). Marcá `[x]` solo cuando el change está **archivado**.

---

## Árbol de dependencias

```
GL-01 monorepo-docker-frontend ──┐
                                 ├──► GL-02 cliente-http ──┬──► GL-03 catalogo-fetch ────┐
GL-06 cors-backend (independiente)                         ├──► GL-04 altas-fetch ───────┼──► GL-07 despliegue-easypanel ──► GL-08 evidencia-entrega
                                                           └──► GL-05 ventas-historial ──┘
GL-06 ──────────────────────────────────────────────────────────────────────────────────►(GL-07)
```

**Camino crítico:** GL-01 → GL-02 → GL-05 (el más largo, 25 puntos) → GL-07 → GL-08.

**Gates de paralelismo**
- **Gate A:** GL-02 archivado y en `main` ⇒ GL-03, GL-04 y GL-05 pueden arrancar **a la vez** (cada uno en su archivo JS y su sección del HTML).
- **Gate B:** GL-03, GL-04, GL-05 y GL-06 archivados ⇒ arranca GL-07 (despliegue de lo integrado).
- GL-01 y GL-06 no dependen de nadie: se pueden hacer mientras Facundo hace GL-02.

---

## Changes

### [GL-01] `monorepo-docker-frontend`
- **Estado**: `[x]` archivado (2026-11-14)
- **Dueño**: Mariano · **Revisor**: Andrés · **Governance**: MEDIO
- **Scope**: dejar el frontend listo para construirse como imagen: `frontend/public/` (ya movido), `frontend/Dockerfile`, `frontend/.dockerignore` y `frontend/default.conf.template` (Dockerfile y plantilla idénticos al PDF, Ejercicio 4; el `.dockerignore` lleva las líneas del PDF más `openspec`, `.opencode` y `docs`). Probar la imagen en local contra el backend: `docker build`, `docker run` con `API_UPSTREAM`, y comprobar `http://127.0.0.1:8080/` (200) y `/api/health/ready` (200). **Material listo** en el kit (el apply es copiar y verificar).
- **Dependencias**: ninguna
- **Escenarios mínimos**: (1) la imagen se construye sin error; (2) con el backend corriendo, `/api/health/ready` responde 200 por el puerto 8080; (3) con `API_UPSTREAM` apuntando a un puerto sin backend, `/api/` responde 502 y la página estática igual carga; (4) `openspec/`, `.opencode/` y `docs/` **no** están dentro de la imagen.
- **Leer antes**:
  - `docs/Consignas_Global.pdf` → Ejercicio 4
  - `docs/ARRANQUE.md` §3 (backend local)

### [GL-02] `cliente-http`
- **Estado**: `[x]` archivado (2026-11-14)
- **Dueño**: Facundo · **Revisor**: Mariano · **Governance**: ALTO (todos dependen de él)
- **Scope**: partir el `app.js` del parcial 1 y dejar la base común: `js/util.js`, `js/api.js` (cliente `fetch` único con base `/api`, error uniforme `ApiError`, mensajes de 404/409/422/502 y error de conexión), `js/app.js` (solo arranque) y los 5 módulos vacíos (`catalogo`, `libros`, `clientes`, `ventas`, `historial`). Adoptar `index.html` con las secciones y los IDs de `docs/referencia/index.draft.html`. **Eliminar todo uso de `localStorage`** del parcial 1. **Material listo y probado** en `docs/referencia/frontend-js/` (23 comprobaciones: `node docs/referencia/frontend-js/prueba-api.js`).
- **Dependencias**: GL-01
- **Escenarios mínimos**: (1) `GET` con query arma `/api/libros/?titulo=…&limit=…&offset=…` y omite parámetros vacíos; (2) un 409 y un 422 lanzan `ApiError` con el mensaje del servidor; (3) servidor apagado ⇒ `esRed = true`; (4) `grep -ri localstorage frontend/public` no encuentra nada; (5) `prueba-api.js` pasa completo.
- **Leer antes**:
  - `docs/ARQUITECTURA-FRONTEND.md` (completo)
  - `docs/CONTRATO-API.md` §Errores
  - `docs/referencia/frontend-js/` y `docs/referencia/index.draft.html`
- **Nota**: hasta que GL-03/04/05 se archiven la interfaz muestra las secciones sin datos (los módulos son placeholders). Es esperado.
- **Verificación**: 5.1 y 5.4(a) se verificaron con un proxy local de Node equivalente al Nginx del contenedor (sirve `frontend/public` y reenvía `/api/`; responde 502 si el backend no está), porque Docker no está disponible en el equipo; 5.3 contra el backend real con seed y 5.4(b) con el destino cerrado.

### [GL-03] `catalogo-fetch` (Ejercicio 1 · 20 pts)
- **Estado**: `[x]` archivado (2026-11-14)
- **Dueño**: Andrés · **Revisor**: Facundo · **Governance**: MEDIO
- **Scope**: `js/catalogo.js` + sección `#catalogo`. `GET /libros/` con `titulo` (búsqueda parcial), `limit` (1–100) y `offset` (≥0); reiniciar `offset` al cambiar el filtro; paginación anterior/siguiente; cada libro con título, ISBN, precio, editorial y género (nulo → «Sin clasificar»); detalle con autores por `GET /libros/{id}`; estados cargando / vacío / sin coincidencias / error de conexión con «Reintentar». Casos **G-01**.
- **Dependencias**: GL-02
- **Escenarios mínimos**: (1) el catálogo muestra los 5 libros del seed; (2) buscar `rayu` muestra solo Rayuela, y una búsqueda sin coincidencias muestra el mensaje correspondiente; (3) con `limit=2` se avanza y retrocede de página y al buscar vuelve a la primera; (4) el detalle de un libro muestra su autor; (5) con el backend apagado se muestra el error de conexión y «Reintentar» funciona al volver.
- **Leer antes**:
  - `docs/Consignas_Global.pdf` → Ejercicio 1
  - `docs/CONTRATO-API.md` §Libro en el listado, §Libro en el detalle, §Detalles
  - `docs/ARQUITECTURA-FRONTEND.md` §Estados de interfaz

### [GL-04] `altas-fetch` (Ejercicio 2 · 20 pts)
- **Estado**: `[ ]` pendiente
- **Dueño**: Facundo · **Revisor**: Andrés · **Governance**: MEDIO
- **Scope**: `js/libros.js`, `js/clientes.js` + secciones `#libros` y `#clientes`. Alta de libro (`POST /libros/`: título, ISBN, precio > 0, stock entero ≥ 0, editorial y género desde `GET /editoriales/` y `GET /generos/`, ≥ 1 autoría `{autor_id, rol, orden}` verificando cada autor con `GET /autores/{id}` y mostrando su nombre antes de agregarlo). Alta de cliente (`POST /clientes/`) y **búsqueda por ID** (`GET /clientes/{id}`) mostrando el nombre. Validar en el cliente, mostrar el mensaje del servidor en 409/422, usar el registro devuelto (201) para actualizar vistas y `L.registrarCliente`. Casos **G-02** y **G-03**.
- **Dependencias**: GL-02
- **Escenarios mínimos**: (1) alta válida de libro con 2 autorías ⇒ 201 y aparece en el catálogo y en el listado; (2) repetir el ISBN ⇒ 409 con el mensaje del servidor y el formulario conserva lo escrito; (3) precio 0 o stock −1 ⇒ rechazado en el cliente sin llamar a la API; (4) autor inexistente (ej. ID 999) ⇒ mensaje de no encontrado y no se agrega; (5) alta de cliente ⇒ 201, aparece en la tabla; repetir el email ⇒ 409; (6) buscar el cliente 1 muestra «Ana Gómez».
- **Leer antes**:
  - `docs/Consignas_Global.pdf` → Ejercicio 2
  - `docs/CONTRATO-API.md` §Alta de libro, §Cliente, §Autor/editorial/género
  - `docs/ARQUITECTURA-FRONTEND.md` §Clientes compartidos

### [GL-05] `ventas-historial-fetch` (Ejercicio 3 · 25 pts)
- **Estado**: `[ ]` pendiente
- **Dueño**: Andrés · **Revisor**: Mariano · **Governance**: ALTO
- **Scope**: `js/ventas.js`, `js/historial.js` + secciones `#ventas` e `#historial`. Elegir cliente (selector de `L.estado.clientes` + búsqueda por ID), agregar libros del catálogo (un renglón por libro, sumar cantidades), quitar renglones, confirmar con `POST /ventas/` enviando **solo** `cliente_id` y `renglones[{libro_id, cantidad}]`. Con el 201: mostrar precios unitarios, subtotales y total **de la respuesta**, limpiar el formulario, actualizar el historial, deshabilitar el botón durante el envío. Errores: 409 y 422 muestran el mensaje del servidor y **conservan el borrador**. Historial con `GET /ventas/` (`limit`/`offset`) y detalle con `GET /ventas/{id}` (fecha, cliente, renglones, importes) mostrando los importes del servidor tal cual. Casos **G-04, G-05 y G-06**.
- **Dependencias**: GL-02 (y GL-04 para la lista compartida de clientes; si no está, el selector funciona con la búsqueda por ID)
- **Escenarios mínimos**: (1) venta del cliente 2 con libro 1 ×2 y libro 4 ×1 ⇒ 201 y total `77000.00` en el comprobante; (2) tras recargar la página, el detalle de esa venta muestra los mismos importes; (3) cambiar el precio del libro con `PATCH /libros/1` no altera los importes de la venta ya registrada (G-05); (4) cliente inexistente ⇒ 409, y libro repetido en dos renglones ⇒ 422: ambos muestran el mensaje y el historial **no** cambia ni se pierde el borrador (G-06); (5) sin renglones el botón no envía; (6) el botón queda deshabilitado mientras se envía.
- **Leer antes**:
  - `docs/Consignas_Global.pdf` → Ejercicio 3
  - `docs/CONTRATO-API.md` §Venta, §Errores, §Importes, §Detalles (orden del historial)
  - `docs/ARQUITECTURA-FRONTEND.md` §Clientes compartidos, §Estados de interfaz
  - `backend/test/` casos `.http` de ventas (ejemplos reales)

### [GL-06] `cors-backend`
- **Estado**: `[x]` archivado (2026-11-14)
- **Dueño**: Mariano · **Revisor**: Facundo · **Governance**: BAJO
- **Scope**: `CORSMiddleware` en `backend/app/main.py` con los orígenes tomados de la variable `CORS_ORIGINS` (lista separada por comas, con esquema, sin barra final) leída por `get_cors_origins()` en `backend/app/core/config.py`; sin la variable no se habilita ningún origen. Documentar la variable en `backend/env.example`. **Material listo** en el kit. Pedido por el profe en la clase del 12/11. Con la vía interna de Nginx no hace falta para funcionar, pero queda implementado y documentado.
- **Dependencias**: ninguna
- **Escenarios mínimos**: (1) con `CORS_ORIGINS=http://localhost:8080` una petición con `Origin: http://localhost:8080` recibe `access-control-allow-origin`; (2) con un origen no listado la respuesta no incluye ese encabezado; (3) sin la variable la API arranca igual y funciona; (4) regresión manual de salud y catálogo con curl.exe.
- **Leer antes**:
  - `backend/AGENTS.md` (reglas duras del backend; rigen dentro de `backend/`)
  - `backend/app/main.py`, `backend/app/core/config.py`
- **Nota**: es el único change que toca código de `backend/`.

### [GL-07] `despliegue-easypanel` (Ejercicio 5 · 20 pts)
- **Estado**: `[ ]` pendiente
- **Dueño**: Mariano · **Revisor**: Andrés · **Governance**: CRITICO (producción, credenciales)
- **Scope**: dos servicios App en el proyecto de Easypanel. Backend: Build Path `/backend`, `DATABASE_URL`, `CORS_ORIGINS`, **sin dominio público**; carga inicial del seed (**antes** revisar que no borre datos que se quieran conservar). Frontend: Build Path `/frontend`, `API_UPSTREAM=<proyecto>_<servicio>:8000`, dominio HTTPS apuntando al puerto 80. Verificar desde la URL pública. Redactar `DEPLOY.md` (URL, revisión, rutas de build, puertos, proxy, nombres de variables, carga inicial, actualización). Sin credenciales reales en el repo.
- **Dependencias**: GL-01, GL-02, GL-03, GL-04, GL-05, GL-06
- **Escenarios mínimos**: (1) la imagen del frontend se construye en Easypanel; (2) `https://<dominio>/api/health/ready` responde 200; (3) el catálogo carga datos reales desde la URL pública; (4) tras redesplegar el backend los datos persisten (G-07); (5) el backend no es accesible desde internet.
- **Leer antes**:
  - `docs/Consignas_Global.pdf` → Ejercicio 5 y «Diagnóstico»
  - `backend/DEPLOY.md` (despliegue anterior con `docker run`) y `docs/ARRANQUE.md` §5

### [GL-08] `evidencia-entrega` (parte de «Demostración mínima»)
- **Estado**: `[ ]` pendiente
- **Dueño**: todos · **Revisor**: cruzado (cada uno revisa lo que no hizo) · **Governance**: MEDIO
- **Scope**: ejecutar G-01 a G-07 **desde la URL pública** y guardar la evidencia en `evidencia/` (pasos, resultado observado, capturas sin contraseñas); completar `README.md` (grupo, cómo ejecutar en local, carga de datos de prueba, decisión sobre clientes por ID); revisar `DEPLOY.md`; generar el ZIP con `git archive` y comprobar su contenido; entregar.
- **Dependencias**: GL-07
- **Escenarios mínimos**: (1) los 7 casos tienen evidencia; (2) el ZIP contiene `frontend/`, `backend/`, `README.md`, `DEPLOY.md`, `evidencia/`; (3) el ZIP **no** contiene `.env`, `.git`, `node_modules` ni credenciales; (4) la URL pública sigue operativa.
- **Leer antes**:
  - `docs/Consignas_Global.pdf` → «Entrega» y «Demostración mínima»
  - `evidencia/LEEME.md`

---

## Preguntas abiertas (no se resuelven por cuenta del agente)

| # | Pregunta | Estado / propuesta |
|---|---|---|
| PA-1 | El PDF lista `alembic.ini` y `migrations/` dentro de `backend/`, pero el backend (regla dura de `backend/AGENTS.md`) crea las tablas con `create_all`, sin migraciones. | **Propuesta:** mantener `create_all`, explicarlo en `DEPLOY.md` («las tablas se crean al iniciar; no hay migraciones») y **consultárselo al profe** antes de entregar. Agregar Alembic solo si lo exige. |
| PA-2 | Conexión frontend→backend: interna o por internet. | **Decidido:** interna (`API_UPSTREAM=<proyecto>_<servicio>:8000`). Confirmar el nombre interno real en Easypanel. |
| PA-3 | ¿Se usa la base `grupo10_db` ya existente o una nueva en Easypanel? ¿Mismo servidor del backend actual? | Mariano confirma antes de GL-07. |
| PA-4 | Puerto del backend: cada grupo debe usar uno distinto si lo publica (8000, 8001…). | Con la vía interna no hay puerto publicado en el host; si se publica, coordinar con el profe. |
| PA-5 | El alta de venta no descuenta stock (duda abierta heredada de `backend/knowledge-base`). | No se cambia: el PDF lo describe así. |
| PA-6 | Historial ordenado por ID ascendente (la venta más nueva queda en la última página). | Aceptado; se documenta. No se toca el backend. |
| PA-7 | La fecha límite exacta y el canal de entrega. | Campus: cierre martes 17/11 00:00. Confirmar canal. |
| PA-8 | ¿Quién sube el parámetro `?v=` de los `<script>` de `index.html` en cada change? | **Propuesta:** cada dueño sube el número al tocar su archivo; GL-02 deja `?v=5` (el del borrador). Confirmar si se mantiene el parámetro. |
| PA-9 | ¿GL-03/04/05 parten solo del kit `docs/referencia/frontend-js/` y los docs, o reutilizan fragmentos del `app.js` del parcial 1? | **Propuesta:** kit + docs como base; el `app.js` viejo queda en el historial de git solo como referencia de marcado y validaciones. Decisión del equipo. |

---

## Estado del orquestador

`.active-orchestrator-state.json` (raíz): `step: done`, `roadmap.changes = GL-01…GL-08`, `roadmap.revision = 1`. Cada vez que se **rectifique** este roadmap (changes nuevos), subir `roadmap.revision` y actualizar `roadmap.changes` en ese archivo, en el mismo commit.

---

## Notas de rectificación

_(vacío — si hay que corregir este roadmap, agregar changes nuevos y una nota con fecha acá; no reescribir changes ya archivados.)_
