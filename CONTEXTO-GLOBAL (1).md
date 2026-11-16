# CONTEXTO-GLOBAL — traspaso completo (pegar entero al empezar con otra IA o sesión)

> Actualizado: lunes 16/11/2026, ~18:50. GL-01 a GL-07 archivados y mergeados en `main`; GL-08 (evidencia G-01 a G-06, README, LEEME) commiteado (`082df4f`) y, según Mariano (18:46), mergeado; falta generar el ZIP y subirlo al campus (el merge de GL-08 no fue verificado por la IA). Autocontenido: no hace falta el resto del repo para entenderlo.
> Si algo contradice `docs/Consignas_Global.pdf` (la consigna oficial), **gana el PDF**.

## 0. Instrucciones para la IA que reciba este archivo

- Ayudás a **Mariano** (grupo de 3) con el Global de Programación III. Español rioplatense, **respuestas cortas, un paso por vez**, comandos en bloques de **PowerShell** (Windows) y con la salida esperada.
- **No ves su repo ni corrés sus comandos** salvo que tengas herramientas: pedí solo el archivo puntual que necesites, nunca el repo entero.
- **No repitas lo ya hecho** (sección 3). No propongas rehacer la fundación ni correr `/active-orchestrator:init` en la raíz.
- **No inventes** endpoints, reglas de negocio ni comandos. Los `/opsx:*` confirmados: `explore`, `propose`, `apply`, `archive`, `sync`, `update`. Lo no verificado se dice como no verificado (sección 9).
- **Evidencia = salida real** de la herramienta, no el razonamiento del agente. Nunca pedir ni escribir credenciales.
- Si el usuario pide algo que contradice las reglas de la sección 7, avisarle antes.

## 1. Qué es y cuándo se entrega

- **Materia:** Programación III (TUP, UTN FRM). **Evaluación Global:** integrar el frontend del parcial 1 (HTML/CSS/JS nativos, que guardaba todo en `localStorage`) con el backend FastAPI + PostgreSQL de la librería y **desplegar ambos en Easypanel** (VPS).
- **Grupo (3):** Mariano (el usuario), Facundo y Andrés. Servicio de base ya existente en la VPS: `grupo10_db`.
- **Fechas (campus):** apertura vie 13/11/2026 00:00 · **cierre martes 17/11/2026 00:00**. **Meta interna: entregar el lunes 16/11 antes de las 20:00.**
- **Puntaje (100):** Catálogo y cliente HTTP 20 · Alta de libros y clientes 20 · Ventas e historial 25 · Imagen del frontend (Docker) 15 · Despliegue y verificación 20.
- **Entrega:** ZIP por grupo con `frontend/`, `backend/`, `README.md`, `DEPLOY.md`, `evidencia/` (sin `.env`, `.git`, dependencias ni credenciales), generado desde `main` con `git archive --format=zip -o ..\entrega.zip HEAD frontend backend README.md DEPLOY.md evidencia` (rutas explícitas, para que no entren `docs/`, `openspec/`, `.opencode/`, etc.). La URL desplegada debe seguir operativa durante la corrección.

## 2. Los repos

- **Repo único (monorepo):** `github.com/marianoemir/libreria-global` (público), con `backend/` y `frontend/` unidos por `git subtree` (historial conservado).
- Origen: backend `marianoemir/PRO3-Parcial-la-librer-a-con-despliegue-en-el-VPS`, frontend `marianoemir/Parcial-1-Frontend-de-una-libreria`.
- **Frontend** (`frontend/public/`): `index.html`, `css/styles.css`, `js/app.js` (1099 líneas, usa `localStorage`, sin ningún `fetch`). Tiene `openspec/` con 6 changes archivados (ej1–ej6) y `.opencode/` (comandos `opsx-*` y skills `openspec-*`). **No** tiene `.active-orchestrator-state.json`, `knowledge-base/`, `CHANGES.md` ni `AGENTS.md`.
- **Backend:** FastAPI con módulos `app/modules/{autores,libros,clientes,generos,editoriales,ventas,health}`, `app/seed.py`, `Dockerfile` (python 3.12-alpine, copia solo `app/`, escucha `0.0.0.0:8000`), `knowledge-base/`, `CHANGES.md` (CH-01…CH-17), `AGENTS.md`/`CLAUDE.md`, `.active-orchestrator-state.json`, `test/*.http`. **No tiene Alembic**: crea tablas con `create_all` al arrancar (regla dura propia).

## 3. Estado actual (qué ya está hecho)

- [x] Monorepo creado y subido; frontend movido a `frontend/public/`.
- [x] Kit de la raíz copiado al repo (`AGENTS.md`, `CLAUDE.md` idénticos, `CHANGES.md`, `docs/`, `.active-orchestrator-state.json` con `step: done`, esqueletos `README.md`/`DEPLOY.md`, `evidencia/`, archivos Docker del frontend y CORS del backend).
- [x] `openspec init` corrido en la raíz: existen `openspec/{changes,specs,config.yaml}` y `.opencode/commands/opsx-*.md`.
- [x] GL-01 a GL-07 archivados y mergeados en `main` (GL-07 = PR #8, merge `0b7ca27`; revisión desplegada `ef9d19c`). Producción: https://libreria.marianochirino.me (API por `/api/...`).
- [x] GL-08: G-01 a G-06 ejecutados desde la URL pública con evidencia en `evidencia/` (G-07 ya estaba de GL-07), `evidencia/LEEME.md` y `README.md` completos, `CHANGES.md` con PA-2 y PA-3 resueltas. Commit `082df4f` en `feature/gl-08-evidencia-entrega`; Mariano informó que ya lo mergeó.
- [ ] Pendiente: ZIP desde `main`, revisión de su contenido y subida al campus (ver sección 11).

## 4. Arquitectura (decisiones tomadas)

```
Navegador ──► Nginx (servicio frontend, dominio HTTPS) ──/api/──► FastAPI (servicio backend, SIN dominio) ──► PostgreSQL (grupo10_db)
              sirve public/                  proxy_pass a API_UPSTREAM                     red interna de Easypanel
```

1. **El JS solo conoce `/api`**: `fetch("/api/libros/")`. Nginx saca el prefijo: `/api/libros/` llega a FastAPI como `/libros/`. **Respetar la barra final exacta** de cada ruta.
2. **`API_UPSTREAM` lo lee Nginx, no el JS**: `proyecto_servicio:puerto` (ej. `grupo10_backend:8000`), sin `http://` ni barra final.
3. **Vía interna elegida** (backend privado). No hace falta CORS para funcionar; se implementa igual porque el profe lo pidió: variable `CORS_ORIGINS` (lista por comas, con esquema, sin barra final; ej. `https://libreria.dominio.me,http://localhost:8080`). Con la vía por internet la plantilla del PDF no sirve directo (asume HTTP).
4. **Monorepo**: Build Path `/backend` y `/frontend` en Easypanel, mismo repo.
5. **Sin migraciones** (`create_all`). El PDF menciona `alembic.ini`/`migrations/` → pregunta abierta PA-1.
6. **Clientes por ID**: la API no tiene `GET /clientes/` (listado) → se buscan por `GET /clientes/{id}` y se recuerdan en memoria. Documentar en el README.
7. **El JS se parte en archivos** para trabajar 3 a la vez: `util.js`, `api.js`, `catalogo.js`, `libros.js`, `clientes.js`, `ventas.js`, `historial.js`, `app.js`; se comunican solo por `window.Libreria` (`api`, `util`, `estado`, `registrarCliente`, evento `libreria:clientes`).
8. **Docker/Nginx** (idénticos al PDF): `FROM nginx:1.30-alpine`, `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`, `COPY public/ /usr/share/nginx/html/`, `COPY default.conf.template /etc/nginx/templates/default.conf.template`, `EXPOSE 80`; plantilla con `location / { try_files $uri $uri/ =404; }` y `location /api/ { proxy_pass http://${API_UPSTREAM}/; }`. Prueba local: `docker build -t libreria-frontend .` y `docker run --rm -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend`.

## 5. Roadmap (SDD con Active Stack / OpenSpec) — `CHANGES.md`, prefijo `GL-`

Fundación **no se rehace** (cada repo tiene la suya). Ciclo por change: `/opsx:propose GL-0X-nombre` → revisar artefactos → `/opsx:apply` → verificar → `/opsx:archive` → `[x]` en `CHANGES.md`. `propose` solo con dependencias archivadas y mergeadas. Rama `feature/gl-0x-nombre`, PR a `main` con «Create a merge commit», revisión cruzada.

| Change | Qué | Dueño | Revisor | Depende de |
|---|---|---|---|---|
| GL-01 monorepo-docker-frontend | Dockerfile + Nginx, prueba local en 8080 (material listo) | Mariano | Andrés | — |
| GL-06 cors-backend | `CORS_ORIGINS` en `main.py`/`config.py`/`env.example` (material listo) | Mariano | Facundo | — |
| GL-02 cliente-http | `api.js`, `util.js`, partir el JS, sin `localStorage`, adoptar `index.draft.html` (material listo y probado) | Facundo | Mariano | GL-01 |
| GL-03 catalogo-fetch (Ej.1) | búsqueda `titulo`, `limit`/`offset`, detalle, estados | Andrés | Facundo | GL-02 |
| GL-04 altas-fetch (Ej.2) | alta de libros (autores por ID) y clientes | Facundo | Andrés | GL-02 |
| GL-05 ventas-historial-fetch (Ej.3) | venta, historial, detalle, errores | Andrés | Mariano | GL-02 |
| GL-07 despliegue-easypanel | dos servicios, variables, seed, `DEPLOY.md` | Mariano | Andrés | GL-01…06 |
| GL-08 evidencia-entrega | G-01…G-07, README, ZIP | todos | cruzado | GL-07 |

Camino crítico: GL-01 → GL-02 → GL-05 → GL-07 → GL-08. **Gate A:** con GL-02 archivado arrancan GL-03/04/05 en paralelo. **Gate B:** GL-03/04/05/06 archivados → GL-07.
Cronograma: sáb 14 raíz + GL-01/06 + GL-02 · sáb tarde/noche GL-03/04/05 · dom 15 integración local + GL-07 · lun 16 GL-08 y entrega antes de las 20:00 (20:00–24:00 colchón). Las horas son estimaciones, no medidas.

**Archivos por dueño (evitar conflictos):** `AGENTS.md`/`CLAUDE.md`/`CHANGES.md`/`docs/` Mariano; Docker/Nginx y `main.py`/`config.py` Mariano; `util.js`/`api.js`/`app.js` Facundo; `libros.js`/`clientes.js` Facundo; `catalogo.js`/`ventas.js`/`historial.js` Andrés; `index.html` cada uno solo su sección; `styles.css` solo agregar al final. Los changes de `backend/` y `frontend/openspec/` archivados **no se tocan**.

## 6. La API en detalle (única lista de endpoints permitida)

| Método y ruta | Notas |
|---|---|
| `GET /health/ready` | 200 `{"estado":"listo"}`; 503 sin base |
| `GET /libros/` | query `titulo` (ILIKE parcial), `limit` 1–100 (def. 20), `offset` ≥ 0; ordena por id; **no trae autores** |
| `GET /libros/{id}` | detalle con `autores[{autor_id, rol, orden, autor{id,nombre}}]` |
| `POST /libros/` | `{isbn, titulo, precio>0 (≤2 dec), stock≥0, editorial_id, genero_id|null, autores:[{autor_id, rol, orden≥1}]}`; ≥1 autor; roles `autor|coautor|traductor|ilustrador`; 201; 409 (ISBN repetido, referencia inexistente, autoría duplicada), 422 |
| `PATCH /libros/{id}` | cambia precio/stock (caso G-05) |
| `GET /editoriales/`, `GET /generos/` | opciones del alta; `limit`/`offset` |
| `GET /autores/{id}` | `{id, nombre, nacionalidad}`; 404 `"Autor no encontrado"` |
| `POST /clientes/` | `{nombre, email}`; 201; email repetido → 409 `"El email ya está registrado."`; el servidor no valida formato de email |
| `GET /clientes/{id}` | 404 `"Cliente no encontrado."` |
| `POST /ventas/` | **solo** `{cliente_id, renglones:[{libro_id, cantidad≥1}]}`; ≥1 renglón; un renglón por libro (repetidos → 422); inexistente → 409 `"El libro indicado no existe"`; 201 |
| `GET /ventas/`, `GET /ventas/{id}` | historial ordenado por id **ascendente** (la más nueva en la última página); sin total de registros: hay página siguiente si llegaron `limit` ítems |

**No existen:** `GET /clientes/`, `GET /autores/`, `DELETE`, `PATCH /ventas/{id}`.
**Venta (respuesta):** `{id, fecha, total:"77000.00", cliente:{id,nombre,email}, renglones:[{libro_id, titulo, cantidad, precio_unitario:"25000.00", subtotal:"50000.00"}]}`. Los importes llegan como **string**: mostrarlos tal cual (`"$"+valor`). El servidor copia precios y calcula; el frontend no manda precios. **Según el PDF y la KB, el alta no descuenta stock; no está verificado en producción, no afirmarlo.**
**Errores:** 404/409 → `{"detail":"texto"}`; 422 → `{"detail":[{"loc":[...],"msg":"...","type":"..."}]}`; 502/503/504 de Nginx → HTML; sin respuesta → error de conexión. Mostrar el mensaje del servidor en 409/422, distinguir error de conexión, **conservar el borrador de la venta** si se rechaza.
**Seed** (`python -m app.seed`, **borra y recarga las 9 tablas**): editoriales 1 Sudamericana, 2 Anagrama · géneros 1 Novela, 2 Cuento · autores 1 Cortázar, 2 Piglia, 3 Bioy Casares, 4 Ocampo, 5 Sabato · libros 1 Rayuela $25000 (stock 10), 2 Bestiario $18000, 3 La invención de Morel $20000, 4 Respiración artificial $27000, 5 El túnel $19500 · clientes 1 Ana Gómez, 2 Tomás Ríos, 3 Carla Fernández · venta 1 (cliente 2, libro 1×2 + libro 4×1, total 77000.00). En una base recién sembrada, una venta nueva igual da `id: 2` y total `77000.00`; en producción ya hay ventas 1, 2 y 3 (pruebas de GL-08).

## 7. Reglas duras (resumen de `AGENTS.md`)

Sin `localStorage`/`sessionStorage` para registros (solo borrador de venta en memoria) · sin URL del backend en el JS · sin frameworks, bundler, TypeScript ni CDN · sin `innerHTML` con datos · importes tal cual los devuelve la API · sin endpoints inventados · POST /ventas/ solo con `cliente_id` y renglones · un change = un dueño, solo sus archivos · no tocar `backend/` salvo GL-06 · sin secretos (`.env` ignorado, `env.example` sin valores reales) · el seed borra las 9 tablas · no commitear ni pushear sin pedirlo · commits convencionales · evidencia = salida real · `AGENTS.md` y `CLAUDE.md` idénticos · no correr `/active-orchestrator:init` en la raíz. Orden de prioridad: **PDF > reglas > KB del backend > skills**.

## 8. Casos de la cátedra (se ejecutan desde la URL pública)

G-01 catálogo (buscar, paginar, sin coincidencias, detalle) · G-02 alta de libro (+ ISBN repetido 409) · G-03 alta de cliente y recuperarlo por ID (+ email repetido 409) · G-04 venta válida con 2 renglones (201) y detalle tras recargar · G-05 `PATCH` de precio y la venta anterior conserva importes · G-06 ID inexistente 409 / renglones repetidos 422 / historial intacto · G-07 imagen construida, URL HTTPS, `/api/health/ready` = 200, datos persisten tras redesplegar.

## 9. Preguntas abiertas y cosas NO verificadas

- **PA-1** Alembic vs `create_all`: **resuelta el 16/11/2026**, la cátedra indicó seguir con `create_all`, sin Alembic (`evidencia/g07-consulta-alembic.png`). · **PA-2** resuelta: el nombre interno del backend es `grupo10_backend:8000`. · **PA-3** resuelta: servicio `grupo10_db`, base `libreria`. · **PA-4** resuelta: sin puerto publicado en el host (vía interna). · **PA-5** la venta no descuenta stock (se mantiene). · **PA-6** historial ascendente (se documenta). · **PA-7** canal de entrega: campus (cierre martes 17/11 00:00).
- **No verificado:** si una venta descuenta stock; el bloqueo del botón de confirmar durante el envío (dura una fracción de segundo); la conservación del borrador ante 409/422 en ventas **por pantalla** (G-06 se probó por `curl.exe`); por qué los clientes quedaron con ID 6 y no 4 (posible consumo de la secuencia por altas rechazadas); el formato de la hora del comprobante (se vio «05:27:14» para 17:27:14, compatible con 12 h sin AM/PM, no revisado en el código). **Ya resueltos:** el `docker build` (se construyó en Easypanel), el nombre interno del servicio y CORS (`Access-Control-Allow-Origin` visto en la evidencia).
- **Sí verificado:** `util.js` y `api.js` (23/23 comprobaciones con un servidor falso, y carga sin errores en Chrome con las 8 piezas JS); Dockerfile y plantilla Nginx coinciden con el PDF; contratos de la API leídos del código del backend.

## 10. Qué se hizo (para no repetirlo)

Se leyó la consigna y ambos repos; se armó el monorepo; se escribió el kit (roadmap, reparto, reglas, contrato de API, arquitectura del frontend, guía de arranque en PowerShell, prompts de `/opsx:propose` por change, esqueletos de README/DEPLOY/evidencia, archivos Docker/Nginx, CORS, base `api.js`/`util.js` + prueba `prueba-api.js`, borrador `index.draft.html`, archivo de estado del orquestador); el usuario lo copió, corrió `openspec init` y verificó `step: done`.

Entre el 14 y el 16/11 se hicieron GL-01 a GL-07 (despliegue en Easypanel con `DEPLOY.md`; el PR #8 de GL-07 tuvo dos revisiones y se resolvió archivando el change con las tareas reconciliadas, ajustando tres frases de `DEPLOY.md` sin respaldo y tapando información privada en la captura de la consulta sobre Alembic) y GL-08 (G-01 a G-06 con evidencia real, LEEME, README y CHANGES.md; commit `082df4f`).

## 11. Próximos pasos inmediatos

1. Mariano: `git checkout main` y `git pull`; comprobar con `git log --oneline -3` que aparece el merge del PR de GL-08.
2. Generar el ZIP: `git archive --format=zip -o ..\entrega.zip HEAD frontend backend README.md DEPLOY.md evidencia`. Revisar que tenga `frontend/`, `backend/`, `README.md`, `DEPLOY.md` y `evidencia/`, y que **no** tenga `.env`, `.git`, `node_modules` ni credenciales.
3. Subir el ZIP al campus antes de las 20:00 (plazo duro: martes 17/11 00:00).
4. Confirmar que la URL sigue operativa: `curl.exe -s https://libreria.marianochirino.me/api/health/ready` (200). No tocar servicios en Easypanel ni volver a correr el seed.
5. Después de entregar, sin apuro: marcar GL-08 `[x]` en `CHANGES.md` (commit aparte); opcionales: cerrar PA-8 y PA-9, revisar la nota de GL-04, actualizar el comando del ZIP en `AGENTS.md` y `CLAUDE.md` (deben quedar idénticos) y las sugerencias no bloqueantes de la revisión de GL-07.

## 12. Mapa de documentos del repo

`docs/Consignas_Global.pdf` (consigna) · `CHANGES.md` (roadmap) · `docs/DIVISION-DEL-EQUIPO.md` · `docs/ARRANQUE.md` (pasos PowerShell) · `docs/PROMPTS-OPSX.md` (prompts por change) · `docs/CONTRATO-API.md` · `docs/ARQUITECTURA-FRONTEND.md` · `docs/openspec-config-context.md` · `docs/referencia/` (`index.draft.html`, `frontend-js/` con `api.js`, `util.js`, `app.js`, módulos vacíos y `prueba-api.js`) · `AGENTS.md`/`CLAUDE.md` · `.active-orchestrator-state.json` · `README.md`/`DEPLOY.md`/`evidencia/LEEME.md` (ya completos, sin `COMPLETAR`).

## 13. Estado de producción y hallazgos de GL-08

- **Datos agregados en pruebas (ficticios; quedan en producción):** libro 6 «Libro de prueba GL-08»; cliente 6 «Cliente Prueba»; venta 2 (cliente 6, total `57000.00`) y venta 3 (Tomás Ríos, total `19500.00`). El historial tiene exactamente las ventas 1, 2 y 3. El precio de Rayuela se cambió a `30000.00` en G-05 y se restauró a `25000.00`: el catálogo del seed quedó como al inicio.
- **No volver a correr el seed en producción** (borra y recarga las 9 tablas y eliminaría lo cargado en las pruebas).
- **Hallazgo en la pantalla de ventas:** con un doble clic en confirmar, el primero registró la venta y el segundo mostró «Agregá al menos un libro antes de confirmar» sin crear otra; el aviso rojo quedó junto al mensaje verde de éxito. Está documentado tal cual en el LEEME; no se corrigió porque sería otro change.
- **Grupo:** Grupo 10 «Lobos Solitarios», Comisión 1 (Mariano Chirino, Andrés Fabre, Facundo Quiroga). El repo es público: no hay secretos ni legajos en el repo.
