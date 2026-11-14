# Arquitectura del frontend (para trabajar 3 personas sin pisarse)

> El `app.js` del parcial 1 tenía todo en un archivo de ~1100 líneas y guardaba los datos en `localStorage`. Con 3 personas trabajando a la vez eso produce conflictos de merge seguros, así que **se parte en archivos, uno por responsabilidad**. Sigue siendo HTML, CSS y JavaScript nativos (sin frameworks, sin bundler, sin TypeScript).
> Esta partición la crea **GL-02**. El material de partida (probado) está en `docs/referencia/frontend-js/`.

## Archivos y dueños

```
frontend/public/
  index.html          GL-02 lo deja armado; cada dueño edita SOLO su sección
  css/styles.css      sin dueño fijo: agregar reglas al final, sin tocar las existentes
  js/
    util.js           GL-02  utilidades y estado compartido (window.Libreria.util / .estado)
    api.js            GL-02  cliente HTTP único (window.Libreria.api)
    catalogo.js       GL-03  Ejercicio 1: catálogo
    libros.js         GL-04  Ejercicio 2: alta y listado de libros
    clientes.js       GL-04  Ejercicio 2: alta y búsqueda de clientes
    ventas.js         GL-05  Ejercicio 3: armado y confirmación de la venta
    historial.js      GL-05  Ejercicio 3: historial y detalle
    app.js            GL-02  arranque: llama a iniciar() de cada módulo
```

Orden de carga en `index.html` (todos con `defer`): `util.js`, `api.js`, `catalogo.js`, `libros.js`, `clientes.js`, `ventas.js`, `historial.js`, `app.js`.

**Regla de oro:** un módulo no lee ni modifica las variables internas de otro. Se comunican solo por `window.Libreria` y por el evento `libreria:clientes` (ver abajo). Así cada dueño trabaja en su archivo sin conflictos.

## Contrato compartido: `window.Libreria`

Cada archivo abre con `var L = (window.Libreria = window.Libreria || {});` y se registra con `L.<modulo> = { iniciar: iniciar };`. `app.js` llama a `iniciar()` en `DOMContentLoaded`.

### `L.api` (api.js)

```js
await L.api.get("/libros/", { titulo: "rayu", limit: 20, offset: 0 }) // → { status, data }
await L.api.get("/libros/3")
await L.api.post("/ventas/", { cliente_id: 2, renglones: [...] })
await L.api.patch("/libros/3", { precio: 100 })
```

- La ruta es la del backend, **con su barra final exacta** (`/libros/`, `/libros/3`). El prefijo `/api` lo agrega `api.js`.
- Los parámetros vacíos (`""`, `null`, `undefined`) se omiten.
- Si la respuesta no es 2xx, **lanza `L.api.ApiError`** con: `status` (0 si no hubo conexión), `mensaje` (texto listo para mostrar: el `detail` del servidor o uno genérico), `esRed` (`true` solo si no se pudo conectar) y `cuerpo`.
- Uso típico:

```js
try {
  var r = await L.api.post("/clientes/", datos);   // r.status === 201, r.data = cliente
} catch (e) {
  L.util.mostrar(errorEl, L.util.mensajeDeError(e)); // 409/422 → mensaje del servidor; e.esRed → error de conexión
}
```

### `L.util` (util.js)

| Función | Para qué |
|---|---|
| `el(tag, props, texto)` | crea un elemento; el texto va por `textContent` (**nunca `innerHTML` con datos de la API**) |
| `porId(id)`, `limpiar(nodo)` | atajos de DOM |
| `mostrar(nodo, texto)` / `ocultar(nodo)` | mensajes en un `<p hidden>` |
| `importe(valor)` | `"$" + valor`; si llega string (`"25000.00"`) lo muestra **tal cual** |
| `multiplicarImporte(precio, cantidad)` | estimación del borrador en centavos enteros (sin errores de flotante) |
| `fechaLocal(iso)` | fecha en formato `es-AR` |
| `enteroPositivo(v)`, `enteroNoNegativo(v)`, `precioValido(v)` | validan entradas del formulario; devuelven el número o `null` |
| `mensajeDeError(err)` | texto para mostrar desde cualquier error capturado |

### Clientes compartidos: `L.estado.clientes` y `libreria:clientes`

La API no lista clientes (solo `GET /clientes/{id}`), así que se recuerdan **en memoria** los clientes registrados o consultados en la sesión: `L.estado.clientes` es un `Map` de `id → {id, nombre, email}`.

- **Escribir:** siempre con `L.registrarCliente(cliente)` (guarda y emite `document` → evento `libreria:clientes`).
  - `clientes.js` (GL-04) lo llama al registrar o buscar un cliente.
  - `historial.js` (GL-05) lo llama con el `cliente` de cada venta recibida.
- **Leer / reaccionar:** `clientes.js` redibuja su tabla y `ventas.js` su selector al escuchar `document.addEventListener("libreria:clientes", ...)`.

No se guarda nada en `localStorage`/`sessionStorage`: al recargar, la lista se rearma consultando.

## Secciones del HTML y sus IDs

`docs/referencia/index.draft.html` trae el HTML completo de todas las secciones, con IDs ya pensados. Cada dueño puede ajustar el marcado **de su sección**, manteniendo el prefijo de IDs:

| Sección | Prefijo de IDs | Dueño |
|---|---|---|
| Catálogo | `catalogo-…` | GL-03 |
| Libros | `libro-…`, `libros-…` | GL-04 |
| Clientes | `cliente-…`, `clientes-…` | GL-04 |
| Ventas | `venta-…`, `ventas-…`, `renglon-…` | GL-05 |
| Historial | `historial-…` | GL-05 |

Si un cambio de HTML te obliga a tocar una sección ajena, se lo pedís al dueño. Si hay conflicto de merge en `index.html`, se conservan **ambas** partes.

## Estados de interfaz que hay que distinguir (los pide el PDF)

Para cada pantalla que lee de la API (catálogo, listado de libros, historial, detalles):

1. **Cargando:** mensaje mientras se espera la respuesta.
2. **Lista vacía:** no hay registros en absoluto.
3. **Búsqueda sin coincidencias:** hay filtro y no hay resultados (solo catálogo).
4. **Error de conexión** (`e.esRed`) o **error del servidor** (`e.status >= 500`): mensaje claro con botón «Reintentar».
5. **Éxito:** los datos.

Además: ignorar respuestas viejas (si el usuario busca dos veces rápido, solo vale la última) y deshabilitar el botón mientras se envía una alta o una venta.

## Cómo se prueba (sin tests automáticos)

No hay framework de tests. La verificación de cada change es:

1. La app corriendo contra el backend **real y con seed**, por el contenedor Nginx de GL-01 (`http://127.0.0.1:8080`).
2. La pestaña **Red** del navegador mostrando las llamadas `/api/...` esperadas y sus códigos.
3. Los casos G-01 a G-07 que correspondan a tu change.
4. Para lógica pura (validaciones, parseo) se puede verificar con `node` como en `docs/referencia/frontend-js/prueba-api.js`.

La evidencia es la salida real (captura de Red, respuesta de la API), no la explicación del agente.
