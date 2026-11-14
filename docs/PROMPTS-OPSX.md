# Prompts para el ciclo OPSX (copiar y pegar)

> Abrí el agente **en la raíz del repo**, en una **sesión nueva por change**, con `git pull` hecho y las dependencias de tu change archivadas y mergeadas (`CHANGES.md`).
> Ciclo: `propose` → **revisar los artefactos tú mismo** → `apply` → verificar → `archive`. `propose` **no** implementa.
> Si tu agente no reconoce `/opsx:propose`, falta el `openspec init` de la raíz (`docs/ARRANQUE.md` §2).

---

## Paso 1 — `/opsx:propose` (uno por change; reemplazá los datos del tuyo)

### GL-01 · `GL-01-monorepo-docker-frontend` (Mariano)

```
/opsx:propose GL-01-monorepo-docker-frontend
Leé primero AGENTS.md y, de CHANGES.md, el change GL-01 y sus archivos de «Leer antes» (solo esos).
Alcance: frontend/Dockerfile, frontend/.dockerignore y frontend/default.conf.template (Dockerfile y plantilla IDÉNTICOS a los del Ejercicio 4 de docs/Consignas_Global.pdf; el .dockerignore con las líneas del PDF más openspec, .opencode y docs) y la prueba local de la imagen contra el backend. Los archivos de partida ya están en frontend/ (si no están, creálos desde el PDF).
La spec debe tener al menos tres escenarios verificables (esperado, error y borde): imagen construida y /api/health/ready = 200 por el puerto 8080; /api/ da 502 si API_UPSTREAM no tiene backend pero la página estática carga; openspec/, .opencode/ y docs/ no están dentro de la imagen.
tasks.md debe indicar cómo se verifica cada escenario (comando y salida esperada).
No inventes nada fuera del PDF; lo ambiguo va como pregunta abierta. Justificá en design.md cada decisión.
No ejecutes /opsx:apply.
```

### GL-02 · `GL-02-cliente-http` (Facundo)

```
/opsx:propose GL-02-cliente-http
Leé primero AGENTS.md y, de CHANGES.md, el change GL-02 y sus archivos de «Leer antes»: docs/ARQUITECTURA-FRONTEND.md, docs/CONTRATO-API.md (sección Errores) y el material de docs/referencia/ (frontend-js/ e index.draft.html).
Alcance: partir el JS del parcial 1 en js/util.js, js/api.js, js/app.js (solo arranque) y los 5 módulos vacíos (catalogo, libros, clientes, ventas, historial); dejar index.html con las secciones e IDs del borrador; ELIMINAR todo uso de localStorage. Usá como base el código de docs/referencia/frontend-js/ (ya probado): revisalo, no lo reescribas desde cero.
La spec debe tener al menos tres escenarios verificables: (1) GET con query arma /api/libros/?titulo=…&limit=…&offset=… y omite los parámetros vacíos; (2) 409 y 422 lanzan ApiError con el mensaje del servidor; (3) servidor apagado → esRed = true; (4) grep de localStorage en frontend/public sin resultados.
tasks.md debe incluir correr `node docs/referencia/frontend-js/prueba-api.js` apuntando a frontend/public/js.
No inventes endpoints (solo docs/CONTRATO-API.md). Lo ambiguo va como pregunta abierta; justificá en design.md cada decisión.
No ejecutes /opsx:apply.
```

### GL-03 · `GL-03-catalogo-fetch` (Andrés)

```
/opsx:propose GL-03-catalogo-fetch
Leé primero AGENTS.md y, de CHANGES.md, el change GL-03 y sus archivos de «Leer antes»: Ejercicio 1 de docs/Consignas_Global.pdf, docs/CONTRATO-API.md (Libro en el listado, Libro en el detalle, Detalles) y docs/ARQUITECTURA-FRONTEND.md (Estados de interfaz).
Alcance: SOLO js/catalogo.js y la sección #catalogo de index.html. GET /libros/ con titulo, limit y offset; offset a 0 al cambiar el filtro; paginación; título, ISBN, precio, editorial y género (nulo → «Sin clasificar»); detalle con autores por GET /libros/{id}; estados cargando / vacío / sin coincidencias / error de conexión con «Reintentar». Usá Libreria.api y Libreria.util (no hagas fetch directo).
La spec debe tener al menos tres escenarios verificables (esperado, error y borde), p. ej.: catálogo con los 5 libros del seed; búsqueda sin coincidencias; backend apagado con «Reintentar»; paginación con limit=2.
tasks.md debe indicar cómo se verifica cada escenario contra el backend real con seed (pestaña Red + caso G-01).
No toques otros módulos. No inventes reglas; lo ambiguo es pregunta abierta; justificá en design.md.
No ejecutes /opsx:apply.
```

### GL-04 · `GL-04-altas-fetch` (Facundo)

```
/opsx:propose GL-04-altas-fetch
Leé primero AGENTS.md y, de CHANGES.md, el change GL-04 y sus archivos de «Leer antes»: Ejercicio 2 de docs/Consignas_Global.pdf, docs/CONTRATO-API.md (Alta de libro, Cliente, Autor/editorial/género) y docs/ARQUITECTURA-FRONTEND.md (Clientes compartidos).
Alcance: SOLO js/libros.js, js/clientes.js y las secciones #libros y #clientes. Alta de libro (POST /libros/): título, ISBN, precio > 0, stock entero ≥ 0, editorial y género desde GET /editoriales/ y GET /generos/, ≥ 1 autoría {autor_id, rol, orden} verificando cada autor con GET /autores/{id} y mostrando su nombre antes de agregarlo. Alta de cliente (POST /clientes/) y búsqueda por ID (GET /clientes/{id}). Validar en el cliente; mostrar el mensaje del servidor en 409/422; usar el registro devuelto (201) para actualizar las vistas y Libreria.registrarCliente. Documentar en design.md que los clientes se buscan por ID porque la API no los lista.
La spec debe tener al menos tres escenarios verificables: alta válida (201); ISBN repetido (409, formulario conserva lo escrito); precio 0 o stock −1 rechazados sin llamar a la API; autor inexistente; email de cliente repetido (409).
tasks.md debe indicar cómo se verifica cada escenario (pestaña Red + casos G-02 y G-03).
No toques otros módulos. No inventes reglas; lo ambiguo es pregunta abierta; justificá en design.md.
No ejecutes /opsx:apply.
```

### GL-05 · `GL-05-ventas-historial-fetch` (Andrés)

```
/opsx:propose GL-05-ventas-historial-fetch
Leé primero AGENTS.md y, de CHANGES.md, el change GL-05 y sus archivos de «Leer antes»: Ejercicio 3 de docs/Consignas_Global.pdf, docs/CONTRATO-API.md (Venta, Errores, Importes, Detalles) y docs/ARQUITECTURA-FRONTEND.md; mirá los casos de backend/test/ch07-ventas-*.http.
Alcance: SOLO js/ventas.js, js/historial.js y las secciones #ventas e #historial. Elegir cliente (selector de Libreria.estado.clientes + búsqueda por ID), agregar libros del catálogo (un renglón por libro, sumar cantidades), quitar renglones, confirmar con POST /ventas/ enviando SOLO cliente_id y renglones[{libro_id, cantidad}]. Con el 201 mostrar precios unitarios, subtotales y total de la RESPUESTA (strings tal cual), limpiar el formulario, actualizar el historial y deshabilitar el botón mientras se envía. 409 y 422: mensaje del servidor y CONSERVAR el borrador. Historial con GET /ventas/ (limit/offset) y detalle con GET /ventas/{id}. Documentar en design.md que el historial viene ordenado por ID ascendente.
La spec debe tener al menos tres escenarios verificables: venta del cliente 2 con libro 1 ×2 y libro 4 ×1 → 201 y total 77000.00; tras recargar, el detalle muestra los mismos importes; PATCH del precio de un libro no altera la venta ya registrada; cliente inexistente (409) y renglones repetidos (422) no cambian el historial ni pierden el borrador.
tasks.md debe indicar cómo se verifica cada escenario (pestaña Red + casos G-04, G-05 y G-06).
No toques otros módulos. No inventes reglas; lo ambiguo es pregunta abierta; justificá en design.md.
No ejecutes /opsx:apply.
```

### GL-06 · `GL-06-cors-backend` (Mariano)

```
/opsx:propose GL-06-cors-backend
Leé primero AGENTS.md, backend/AGENTS.md y, de CHANGES.md, el change GL-06. Este es el ÚNICO change que modifica código de backend/.
Alcance: CORSMiddleware en backend/app/main.py (después de crear app y antes de los include_router) con orígenes tomados de la variable CORS_ORIGINS (lista separada por comas, con esquema, sin barra final), leída por get_cors_origins() en backend/app/core/config.py; sin la variable no se habilita ningún origen; documentar la variable en backend/env.example. Los archivos de partida ya están hechos en el repo; revisalos en vez de reescribirlos.
La spec debe tener al menos tres escenarios verificables: origen listado recibe access-control-allow-origin; origen no listado no lo recibe; sin la variable la API arranca y funciona.
tasks.md debe indicar cómo se verifica cada escenario (curl con encabezado Origin, incluida una petición OPTIONS de preflight) y que la suite del backend sigue en verde.
No cambies nada más del backend. Lo ambiguo es pregunta abierta; justificá en design.md.
No ejecutes /opsx:apply.
```

### GL-07 · `GL-07-despliegue-easypanel` (Mariano)

```
/opsx:propose GL-07-despliegue-easypanel
Leé primero AGENTS.md y, de CHANGES.md, el change GL-07 y sus archivos de «Leer antes»: Ejercicio 5 y Diagnóstico de docs/Consignas_Global.pdf, backend/DEPLOY.md y docs/ARRANQUE.md §5.
Alcance: documentar y verificar el despliegue de los dos servicios en Easypanel (Build Path /backend y /frontend, variables DATABASE_URL, CORS_ORIGINS y API_UPSTREAM, dominio solo para el frontend, backend sin dominio público) y redactar DEPLOY.md en la raíz (URL, revisión, rutas de build, puertos, proxy, nombres de variables sin valores, carga inicial, actualización). Nunca escribas credenciales reales.
La spec debe tener al menos tres escenarios verificables: /api/health/ready = 200 desde la URL pública; el catálogo carga datos desde la URL pública; los datos persisten tras redesplegar el backend (G-07); el backend no es accesible desde internet.
tasks.md debe indicar cómo se verifica cada escenario. Esto toca producción: no ejecutes nada destructivo (como el seed) sin que la persona lo confirme.
No ejecutes /opsx:apply.
```

### GL-08 · `GL-08-evidencia-entrega` (todos)

```
/opsx:propose GL-08-evidencia-entrega
Leé primero AGENTS.md y, de CHANGES.md, el change GL-08, la sección Entrega y Demostración mínima de docs/Consignas_Global.pdf y evidencia/LEEME.md.
Alcance: ejecutar G-01 a G-07 desde la URL pública y registrar la evidencia en evidencia/ (pasos, resultado observado, capturas sin contraseñas); completar README.md y revisar DEPLOY.md; generar el ZIP con git archive y comprobar su contenido (sin .env, .git ni credenciales).
La spec debe tener al menos tres escenarios verificables: los 7 casos con evidencia; el ZIP contiene frontend/, backend/, README.md, DEPLOY.md y evidencia/; el ZIP no contiene secretos.
No inventes resultados: cada evidencia es lo realmente observado. No ejecutes /opsx:apply.
```

---

## Paso 2 — Revisar los artefactos (vos, no el agente)

Abrí `openspec/changes/<tu-change>/` y verificá con este checklist **antes** de aplicar:

- [ ] ¿Las dependencias de tu change están archivadas y mergeadas?
- [ ] ¿Cada regla o endpoint que cita existe en el PDF, en `docs/CONTRATO-API.md` o en la KB? ¿No hay invento?
- [ ] ¿Lo ambiguo quedó como **pregunta abierta** y no como decisión silenciosa?
- [ ] ¿Hay al menos 3 escenarios verificables y una task de verificación por escenario?
- [ ] ¿Los supuestos de diseño están justificados en `design.md`?
- [ ] ¿Solo toca los archivos de **tu** change?

Si algo falla, pedile al agente que lo corrija con `/opsx:update` (o editá el archivo) y volvé a revisar.

---

## Paso 3 — `/opsx:apply`

```
/opsx:apply GL-0X-nombre
Implementá las tasks en orden. Trabajá solo en los archivos de este change. Usá Libreria.api y Libreria.util (sin fetch directo, sin localStorage, sin innerHTML con datos). Al terminar de cada task mostrame la verificación real (comando o captura de la pestaña Red), no una explicación. Corré todas las verificaciones al final. No commitees.
```

## Paso 4 — Verificar (vos)

Con el backend local con seed y la imagen del frontend corriendo (`docs/ARRANQUE.md` §3 y §4), ejecutá **cada escenario** de la spec a mano y anotá lo que ves. Un escenario sin evidencia real no está verificado.

## Paso 5 — `/opsx:archive` y cierre

```
/opsx:archive GL-0X-nombre
Archivá el change, sincronizá las specs y marcá [x] en CHANGES.md solo para este change, sin tocar otros changes ni los ya archivados.
```

Después: commit (`feat(gl-0x): …`), push de tu rama `feature/gl-0x-nombre`, PR a `main` con **«Create a merge commit»**, y que lo revise quien figura como revisor en `docs/DIVISION-DEL-EQUIPO.md`.

---

## Si algo se traba

- **El agente quiere hacer commit o push sin que se lo pidas:** frenalo; la regla 16 de `AGENTS.md` lo prohíbe.
- **El agente propone usar un framework, `localStorage` o la URL del backend:** recordale las reglas 1, 2 y 8 de `AGENTS.md`.
- **Se acabó el cupo de tokens:** el estado queda en el repo (`openspec/changes/`); abrí una sesión nueva y pedí «continuá el change GL-0X desde las tasks pendientes de tasks.md».
