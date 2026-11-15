# Design — GL-04 altas-fetch

## Context

Ver `proposal.md` — Why. Estado actual que condiciona el enfoque:

- GL-02 (archivado) dejó `frontend/public/js/libros.js` y `clientes.js` como **placeholders** que solo registran `window.Libreria.<modulo> = { iniciar }`. `util.js` y `api.js` son el contrato vigente: `L.api.get/post/patch`, `L.api.ApiError` (`status`, `mensaje`, `esRed`, `cuerpo`), `L.util.*` (incluye `el`, `mostrar`, `importe`, `enteroPositivo`, `enteroNoNegativo`, `precioValido`, `mensajeDeError`), y `L.estado.clientes` + `L.registrarCliente` + evento `libreria:clientes`.
- `frontend/public/index.html` ya trae el marcado completo de `#libros` y `#clientes` con sus `id` (`libros-form`, `libro-titulo`, `libro-isbn`, `libro-precio`, `libro-stock`, `libro-editorial`, `libro-genero`, `libro-autor-id`, `libro-autor-rol`, `libro-autor-agregar-boton`, `libro-autor-mensaje`, `libro-autores-lista`, `libro-autores-vacio`, `libros-agregar-boton`, `libros-exito`, `libros-error`, `libros-lista`, `libros-vacio`, `libros-cargando`, `libros-tabla-error`, `libros-reintentar`, `libros-opciones-error`, `libros-opciones-reintentar`; `clientes-form`, `cliente-nombre`, `cliente-email`, `clientes-agregar-boton`, `clientes-exito`, `clientes-error`, `cliente-buscar-id`, `clientes-buscar-boton`, `clientes-buscar-mensaje`, `clientes-lista`, `clientes-vacio`). Las clases CSS necesarias ya existen en `styles.css`.
- La API solo ofrece listados de editoriales y géneros. **No existen** `GET /clientes/` ni `GET /autores/` (`docs/CONTRATO-API.md`, `AGENTS.md` regla 3).
- No hay framework de tests de frontend: la verificación es el backend real con seed por el contenedor de GL-01 (`http://127.0.0.1:8080`), la pestaña Red y los casos **G-02** / **G-03**; la lógica pura puede probarse con `node`.

## Goals / Non-Goals

**Goals:**

- Implementar el Ejercicio 2 completo en los dos módulos del change, sin tocar ningún otro archivo JS.
- Que cada rechazo del servidor (409/422/404) se vea con su texto y sin perder lo escrito.
- Que el registro devuelto por el 201 alimente las vistas propias **y** el estado compartido que consume GL-05.
- Que el plan de tareas sea verificable a mano contra el backend con seed, escenario por escenario.

**Non-Goals (de diseño, además del alcance del proposal):**

- Paginación del listado de libros en `#libros`: la paginación del catálogo es GL-03; acá el listado pide `limit=100` como dice el `caption` del marcado.
- Un evento nuevo para refrescar `#catalogo` desde `#libros` (ver OQ-GL04-5 y D14).
- Cambiar `api.js`/`util.js`, aunque falte un helper: se resuelve dentro de los dos módulos.
- Reglas de negocio nuevas (por ejemplo descontar stock, validar ISBN con dígito verificador o validar el rango `INT4` en el cliente): no están en el PDF ni en el contrato.

## Decisions

### D1 — Clientes y autores se buscan por ID porque la API no expone listados

La API de la librería **no tiene** `GET /clientes/` ni `GET /autores/` (`docs/CONTRATO-API.md` §«NO existen», `AGENTS.md` regla 3). Solo hay consultas individuales `GET /clientes/{id}` y `GET /autores/{id}`, y listados únicamente de `editoriales` y `generos`.

- **Consecuencia de diseño**: la pantalla de clientes ofrece **búsqueda por ID** y la de libros **verifica un autor por ID** antes de agregarlo; no hay selector con todos los clientes ni con todos los autores.
- **Por qué es correcto y no una limitación del frontend**: el PDF lo autoriza expresamente — «Si el backend solo expone la consulta individual, usá `GET /clientes/{id}` para buscar clientes y mostrar su nombre antes de seleccionarlos para una venta» y «podés verificar cada ID con `GET /autores/{id}` y mostrar su nombre antes de agregarlo» — y pide **documentar qué opción se eligió** (sección «Consultas por ID»). Ese documento es `README.md` en GL-08; este design es la fuente de la justificación.
- **Alternativas descartadas**:
  - Inventar `GET /clientes/` o `GET /autores/`: prohibido por la regla 3 y no existe en el backend.
  - Precargar clientes recorriendo `GET /clientes/1..N`: no hay forma confiable de saber `N` (la API no devuelve totales), genera N peticiones en el arranque y fallaría con huecos de `id`. Descartado.
  - Usar el listado de ventas (`GET /ventas/`) como fuente indirecta de clientes: cubre solo clientes que ya compraron, no es un buscador y agrega acoplamiento con GL-05. Cuenta como complemento (lo hace GL-05 en el historial), no como reemplazo.

### D2 — La validación se reparte: el cliente filtra lo local, el servidor es la autoridad

El cliente valida **solo** lo que puede decidir sin consultar la base:

| Campo | Regla en el cliente | Fuente |
|---|---|---|
| título, ISBN | no vacío (después de `trim`) | PDF Ej. 2 «Validá los campos» |
| precio | número > 0, hasta 2 decimales (`L.util.precioValido`) | CONTRATO §Alta de libro |
| stock | entero ≥ 0 (`L.util.enteroNoNegativo`) | CONTRATO §Alta de libro |
| editorial | elegida (no el placeholder) | CONTRATO §Alta de libro (`editorial_id` obligatorio) |
| autorías | ≥ 1 entrada, verificada | PDF Ej. 2 y CONTRATO («autores con al menos uno») |
| nombre de cliente | no vacío | PDF Ej. 2 y CONTRATO §Cliente |
| email de cliente | formato texto@dominio | CONTRATO §Cliente («el servidor no valida el formato: validalo en el cliente») |
| ID de búsqueda / de autor | entero ≥ 1 | CONTRATO (IDs y `orden` son enteros ≥ 1) |

Lo que **no** se valida en el cliente, a propósito: unicidad de ISBN y de email (no hay endpoint que lo consulte, D3), existencia de editorial/género/autor más allá de la verificación explícita del autor (D6), y rango `INT4` de los enteros (el contrato define que «más da 422»: mostrar ese 422 es comportamiento pedido, no un fallo que el cliente deba tapar).

- **Por qué**: el PDF pide validar y también pide mostrar el `detail` del servidor ante 422. Si el cliente replicara todas las reglas del servidor, el camino del 422 quedaría inalcanzable y el requisito no se podría demostrar.
- **Alternativa descartada**: validar todo en el cliente y nunca dejar llegar un 422 → duplica reglas de la base (que pueden cambiar) y hace imposible verificar el escenario del 422.

### D3 — El ISBN y el email repetidos NO se pre-verifican: el 409 del servidor es la autoridad

No hay endpoint para preguntar «¿existe este ISBN?» ni «¿existe este email?». Tampoco sirve buscar por título/ISBN en `GET /libros/` (la búsqueda es `ILIKE` por `titulo`, no por ISBN, y no garantiza unicidad).

- **Consecuencia**: el alta se envía y, si hay duplicado, se muestra el `detail` (`"Ya existe un libro con ese ISBN"`, `"El email ya está registrado."`) y se conserva el formulario.
- **Alternativa descartada**: comparar contra el listado de 100 libros cargado → falso negativo cuando el libro repetido no está en esa página, y una falsa sensación de validación. Además el servidor ya resuelve el caso con un mensaje en español.
- **Trade-off asumido**: el usuario descubre el duplicado después de enviar. Es el flujo que el PDF describe (409 visible).

### D4 — El mensaje del servidor se muestra en el bloque de error del formulario y el estado se conserva

`L.api` ya convierte cualquier respuesta no 2xx en `ApiError` con `mensaje` listo (el `detail` para 404/409; la lista aplanada `campo: mensaje` para 422; un texto propio para 502/503/504 y para la caída de red). Los módulos **no** arman mensajes de negocio propios para esos casos: muestran `e.mensaje`.

- **Dónde**: `#libros-error` / `#clientes-error` (bloques `<p role="alert">` sin hijos) con `L.util.mostrar`; los bloques con botón «Reintentar» (`#libros-opciones-error`, `#libros-tabla-error`) siguen la convención de GL-02 D7: el texto va al `span …-error-texto` y se alterna `hidden` del contenedor, para no borrar el botón con `textContent`.
- **Cómo se conserva el estado**: el formulario es la fuente de verdad; en el camino de error **no** se limpia ni se reconstruye. Solo se vacía en el camino 201 (D5). La lista de autorías vive en una variable del módulo y tampoco se toca en el error.
- **Distinción de conexión**: `e.esRed` verdadero → mensaje de conexión; `e.status >= 500` → «servidor no disponible»; ambos dejan el mismo formulario intacto.
- **Alternativa descartada**: un único mensaje genérico («no se pudo guardar») → viola la regla 6 y el escenario de ISBN repetido.

### D5 — El 201 alimenta las vistas: fila para el listado y `L.registrarCliente` para el cliente

- **Libro**: el cuerpo del 201 es `LibroRead` (incluye `id`, `precio`, `editorial`, `genero` y `autores`; verificado en `backend/app/modules/libros/router.py` → `response_model=LibroRead, status_code=201`). El módulo **agrega una fila** al `tbody#libros-lista` con esos valores y muestra el éxito con el título devuelto. No vuelve a consultar `GET /libros/` para "confirmar": la orden de la API es ascendente por `id`, así que el nuevo registro es el último y la fila queda en el lugar correcto.
- **Cliente**: el cuerpo del 201 es el cliente con `id`, `nombre`, `email` y `perfil`. El módulo llama a **`L.registrarCliente(cliente)`**, que guarda en `L.estado.clientes` y emite `libreria:clientes`; la tabla se redibuja al escuchar el evento (no por llamada directa), de modo que se comporta igual si el cliente llega desde otra pantalla (GL-05) o desde la búsqueda por ID.
- **Por qué pasar por el evento en la propia pantalla**: el contrato de GL-02 dice que `clientes.js` **redibuja su tabla** al escuchar `libreria:clientes`; usarlo evita dos caminos de dibujo distintos y garantiza que GL-05 vea lo mismo.
- **Alternativa descartada**: refetch de `GET /libros/` tras el alta → una petición extra, posible carrera con otra alta y riesgo de mostrar datos distintos a los del registro devuelto que el PDF pide usar.

### D6 — Autorías: se arman de a una, con el nombre a la vista, `rol` cerrado y `orden` por posición

- **Alta de una autoría**: `ID` (input) + `rol` (select) + «Verificar y agregar» → `GET /autores/{id}`. Con 200 se agrega `{autor_id, rol, orden, autor:{id, nombre}}` a la lista en memoria y se dibuja el nombre («Julio Cortázar») y el rol. Con 404 se muestra el `detail` (`"Autor no encontrado"`) y **no** se agrega.
- **Guarda previa a la petición**: si el ID no es entero ≥ 1 no se llama a la API (mensaje local); si ese `autor_id` ya está en la lista, se avisa y no se vuelve a pedir. La regla del servidor («autoría duplicada → 409», CONTRATO §Detalles) es la red de seguridad, no el primer filtro.
- **`rol`**: no hay campo libre. El `<select>` del marcado ya ofrece exactamente los cuatro valores del contrato (`autor`, `coautor`, `traductor`, `ilustrador`); se envía el `value` tal cual, sin traducción. Ni el PDF ni el contrato definen reglas de combinación entre roles (por ejemplo un solo `autor`), así que **no se inventan**.
- **`orden`**: se asigna la **posición en la lista** (1, 2, 3…) al momento de enviar, y se recalcula al quitar una autoría; el usuario no lo edita. Justificación: el contrato solo exige «entero ≥ 1» y el PDF no define el criterio, así que la posición es la lectura mínima que mantiene el orden visible en la pantalla. Queda como **OQ-GL04-3** si la cátedra espera otra cosa.
- **Quitar**: cada autoría se dibuja con un botón «Quitar» (`L.util.el`, `textContent`), que la elimina de la lista; el estado vacío (`#libro-autores-vacio`) se alterna con `hidden`.
- **Alternativa descartada**: campos de texto repetidos en el HTML para «Autor 1..3» → no permite agregar una cantidad variable ni mostrar el nombre verificado sin duplicar marcado.

### D7 — Un solo camino de envío, con el botón deshabilitado

Los formularios tienen `novalidate` y el botón es `type="button"` (marcado de GL-02). Para que la tecla Enter no dispare un `POST` nativo a `action="#"`, se escucha el evento `submit` del `<form>` con `preventDefault()` y se ejecuta la misma rutina que el clic (una función `enviar()` por módulo).

- **Deshabilitado**: `enviar()` pone `boton.disabled = true` al empezar y lo restaura en `finally` (éxito o error). Una guarda `enviando` evita reentradas por doble clic antes de que el navegador pinte el estado.
- **Alternativa descartada**: `<button type="submit">` + `required`/`min` del navegador → los mensajes serían del navegador y en el idioma del sistema, no verificables ni consistentes con el resto del proyecto.

### D8 — Opciones de referencia con `limit=100` y «Sin clasificar» como `null`

`GET /editoriales/` y `GET /generos/` paginan con `limit` 1–100 (defecto 20). Para que un catálogo de más de 20 editoriales no deje opciones afuera, se piden con `limit=100` y `offset=0` (implícito) en una sola llamada.

- **Género opcional**: el `<select>` arranca con `<option value="">Sin clasificar</option>`; al enviar, un valor vacío se traduce a `genero_id: null`. La editorial, en cambio, es obligatoria: se valida en el cliente y no se manda `editorial_id` vacío.
- **Trade-off**: con más de 100 editoriales o géneros faltarían opciones. No hay buscador de editoriales en el contrato y el seed tiene 2 de cada uno; se acepta y se anota como límite conocido.
- **Alternativa descartada**: paginar las opciones con anterior/siguiente → complejidad de UI desproporcionada para el ejercicio y para el tamaño del seed.

### D9 — El HTML se toca lo mínimo: solo un «Reintentar» para la búsqueda de clientes

`#libros` ya tiene todo lo necesario (incluidos los dos bloques de error con botón). En `#clientes` la única lectura que puede fallar —la búsqueda por ID— no tenía botón de reintento, y la regla 9 exige «error de conexión con Reintentar».

- **Cambio**: se agrega bajo `#clientes-buscar-mensaje` un `<button type="button" id="clientes-buscar-reintentar" class="boton" hidden>Reintentar</button>`. Se muestra **solo** tras un fallo de lectura y repite la última búsqueda con el mismo ID.
- **Por qué no hay «Reintentar» en las altas**: reintentar un `POST` automáticamente puede duplicar un alta que sí llegó al servidor y se perdió la respuesta. En las altas el reintento es la pulsación del propio botón, con los datos conservados (D4). Esto se documenta para que la decisión sea defendible en la revisión.
- **Resto del HTML intacto**: sin `id` nuevos en `#libros`, sin clases CSS nuevas, sin tocar otras secciones.

### D10 — `?v=` (PA-8): no se toca en este change

`index.html` carga los script con `?v=5`. `CHANGES.md` PA-8 no está resuelto, así que este change **no** modifica el parámetro y no asume la propiedad del bump.

- **Consecuencia operativa**: al verificar hay que hacer recarga forzada (Ctrl+F5) para no correr los JS viejos en caché. Queda registrado en `tasks.md` y en el PR.
- **Si el equipo resuelve PA-8 como «cada dueño sube el número»**, es un cambio de una línea por script en `#libros`/`#clientes`, sin impacto en specs ni en código JS.

### D11 — Todo pasa por `L.api` y `L.util`; nada de `innerHTML` ni de almacenamiento

- Rutas relativas al backend con su barra final exacta (`/editoriales/`, `/generos/`, `/autores/{id}`, `/libros/`, `/clientes/`, `/clientes/{id}`); el prefijo `/api` lo pone `api.js`. Ningún `fetch` directo, ninguna URL de backend (reglas 2 y 8).
- Toda fila, autoría y mensaje se construye con `L.util.el` / `textContent`; nunca `innerHTML` con datos de la API o del formulario (regla 7).
- El estado de las altas y la lista de autorías vive en variables del módulo (memoria); no se usa `localStorage`, `sessionStorage` ni `IndexedDB` (regla 1). Los clientes se recuerdan solo en `L.estado.clientes`.

### D12 — Listado de libros: `GET /libros/?limit=100&offset=0` con estados explícitos

El marcado del `caption` dice «Libros registrados (hasta 100 por la API)», así que el listado pide una sola página de 100 y no implementa paginación (es del catálogo, GL-03).

- **Estados**: «Cargando libros…» mientras la promesa está pendiente; tabla vacía + mensaje propio si la lista llega vacía; bloque de error con «Reintentar» si falla (texto según `e.esRed` / `e.status`).
- **Contenido de la fila**: `id`, `titulo`, `isbn`, `editorial.nombre`, `genero ? genero.nombre : "Sin clasificar"`, `stock`, `L.util.importe(precio)` (acepta string o número y no recalcula: regla 4).
- **Respuestas viejas**: se usa un contador de secuencia por lectura (opciones, listado, búsqueda) y se descarta la respuesta que no sea la última, como pide `ARQUITECTURA-FRONTEND.md`.
- **Trade-off**: con más de 100 libros el listado queda incompleto; se acepta (mismo límite del `caption`) y no se inventa paginación fuera de alcance.

### D13 — Registro compartido de clientes: escrito siempre por `L.registrarCliente`

Tanto el alta como la búsqueda por ID llaman a `L.registrarCliente` con el objeto devuelto por la API. La tabla de `#clientes` se redibuja al escuchar `libreria:clientes` y se arma **desde `L.estado.clientes`**, no desde un array propio.

- **Por qué**: es el contrato documentado (GL-02 D11) y garantiza que la pantalla de ventas de GL-05 vea exactamente los mismos clientes, sin que `clientes.js` conozca `ventas.js` (regla 10).
- **Efecto colateral aceptado**: al recargar la página la tabla queda vacía hasta que se registre o consulte un cliente. Es correcto: no se persiste nada.

### D14 — El catálogo se actualiza en su próxima consulta, no por un evento nuevo

El escenario del roadmap («el libro aparece en el catálogo y en el listado») se cumple en el **listado propio** de inmediato y en `#catalogo` la próxima vez que ese módulo consulte `GET /libros/` (al pulsar «Buscar» o al recargar). `catalogo.js` es de Andrés (GL-03) y este change no lo toca (regla 11).

- **Alternativa descartada**: emitir un evento nuevo (`libreria:libros`) que GL-03 escuche → amplía el contrato de `window.Libreria` sin acuerdo del dueño de ese módulo y en pleno paralelismo del Gate A. Queda como **OQ-GL04-5** para coordinar, no como decisión unilateral.

## Risks / Trade-offs

- **Cacheo del navegador sirviendo los JS viejos** (los placeholders) → recarga forzada (Ctrl+F5) en la verificación; PA-8/OQ-GL04-1 documentado.
- **Duplicado descubierto recién al enviar** (sin pre-chequeo, D3) → es el flujo pedido; el 409 muestra el mensaje del servidor y conserva el formulario.
- **`orden` por posición podría no ser lo que espera la cátedra** → está aislado en una función (`autorias.map` al enviar); cambiarlo no toca specs ni otras capas. OQ-GL04-3.
- **Más de 100 editoriales/géneros o más de 100 libros** quedan fuera de las listas → límite conocido y documentado (D8, D12); no se inventa paginación.
- **Doble clic / envío lento** → guarda `enviando` + `disabled`, y el escenario de un solo `POST` en la pestaña Red lo verifica.
- **El alta de cliente debe verse en el selector de GL-05** → depende de que GL-05 escuche `libreria:clientes` (contrato de GL-02). Si GL-05 todavía no está, se verifica en consola (`L.estado.clientes`).
- **Mensajes 422 en inglés de Pydantic** → se muestran tal cual (OQ-GL04-6); el requisito es «mostrar el mensaje del servidor».
- **Conflicto de merge en `index.html` con GL-03/GL-05** → el único cambio es el botón «Reintentar» dentro de `#clientes`; si hay conflicto se conservan ambas partes (regla acordada en `DIVISION-DEL-EQUIPO.md`).
- **Ninguna credencial ni dato real** → todas las pruebas usan datos ficticios del seed.

## Migration Plan

1. Reemplazar el contenido de `frontend/public/js/libros.js` y `frontend/public/js/clientes.js` (hoy placeholders) implementando la spec, sin tocar otros módulos.
2. Agregar el botón «Reintentar» de la búsqueda de clientes en `#clientes` de `frontend/public/index.html`.
3. Verificar en local con el backend con seed y el contenedor de GL-01 en `http://127.0.0.1:8080`, escenario por escenario (`tasks.md`), con la pestaña Red y los casos G-02 / G-03.
4. Rollback: `git revert` del commit del change. No hay migración de datos, ni variables de entorno, ni cambios de infraestructura: los archivos son estáticos y se sirven tal cual.

## UI Mockups

- Design system revision: n/a — `.active-orchestrator-state.json` tiene `visual_design.mode: "off"` y no existe `design-system/`.
- Decision: no (project policy)
- Date: 2026-11-15
- Preview: n/a
- Visual verify: n/a — el change no define apariencia nueva: reusa el marcado y las clases existentes de `styles.css` (`.mensaje`, `.mensaje-error`, `.mensaje-exito`, `.boton`, `.boton-primario`, `.campo`, `.tabla-scroll`). El único agregado visual es un botón con una clase ya existente.

## Open Questions

Las seis preguntas abiertas del change están en `proposal.md` §Preguntas abiertas y se citan acá por número: **OQ-GL04-1** (`?v=` / PA-8, ver D10), **OQ-GL04-2** (base del trabajo / PA-9), **OQ-GL04-3** (`orden` de autorías, ver D6), **OQ-GL04-4** (stock vacío), **OQ-GL04-5** (refresco del catálogo, ver D14), **OQ-GL04-6** (textos 422 en inglés). Ninguna cambia las specs ni el plan de tareas: todas tienen una implementación provisoria documentada acá.
