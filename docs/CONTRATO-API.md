# Contrato de la API (lo que el frontend puede usar)

> Resumen verificado leyendo el código del backend (`backend/app/modules/*`, `backend/app/seed.py`). Es la **única** lista de endpoints que el frontend puede usar: no hay otros.
> Fuente de verdad ante dudas: el código del backend y `backend/knowledge-base/06_funcionalidades.md`. Probá siempre contra el backend corriendo con el seed (`/docs` de FastAPI muestra los esquemas reales).

## Cómo se llega a la API

- Desde el navegador siempre `fetch("/api/<ruta>")`. Nginx reenvía `/api/` al backend **sacando** el prefijo: `/api/libros/` llega a FastAPI como `/libros/`.
- **Respetá la barra final tal como figura abajo** (`/libros/` sí, `/libros` no; `/libros/3` sí, `/libros/3/` no). Una barra de más o de menos da 404 o un redirect.
- Cuerpos y respuestas en JSON. Cuerpo `Content-Type: application/json`.
- Sin autenticación.

## Endpoints disponibles

| Método y ruta | Para qué | Éxito | Errores posibles |
|---|---|---|---|
| `GET /health/ready` | estado (probar `/api/health/ready`) | 200 | 503 sin base |
| `GET /libros/` | catálogo. Query: `titulo` (parcial, sin distinguir mayúsculas), `limit` (1–100, def. 20), `offset` (≥0), `genero_id` | 200 lista | 422 parámetros |
| `GET /libros/{id}` | detalle con autores | 200 | 404 |
| `POST /libros/` | alta | 201 | 409 (ISBN repetido / referencia inexistente / autoría duplicada), 422 |
| `PATCH /libros/{id}` | cambiar precio, stock, etc. (caso G-05) | 200 | 404, 409, 422 |
| `GET /editoriales/` | opciones del alta de libro. Query `limit` (1–100, def. 20), `offset` | 200 lista | 422 |
| `GET /generos/` | ídem | 200 lista | 422 |
| `GET /autores/{id}` | verificar un autor y mostrar su nombre | 200 | 404 |
| `POST /clientes/` | alta | 201 | 409 (email repetido), 422 |
| `GET /clientes/{id}` | consultar un cliente | 200 | 404 |
| `POST /ventas/` | registrar venta | 201 | 409 (cliente o libro inexistente), 422 |
| `GET /ventas/` | historial. Query `limit` (1–100, def. 20), `offset` | 200 lista | 422 |
| `GET /ventas/{id}` | detalle | 200 | 404 |

**NO existen** (no los uses ni los inventes): `GET /clientes/` (listado), `GET /autores/` (listado), `DELETE` en ninguna ruta, `PATCH /ventas/{id}`.
Existen otros (perfil de cliente, libros por autor/editorial/género, `PATCH` de clientes/autores/editoriales) pero el Global no los pide.

> Consecuencia importante: como no hay listado de clientes ni de autores, la interfaz los busca **por ID** y muestra el nombre antes de usarlos (el PDF lo permite). Documentarlo en el `README.md` (decisión del Ejercicio 2).

## Formas de los datos

### Libro en el listado (`GET /libros/`) — NO trae autores
```json
{ "id": 1, "isbn": "978-950-00-0001-1", "titulo": "Rayuela", "precio": "25000.00", "stock": 10,
  "editorial_id": 1, "genero_id": 1,
  "editorial": {"id": 1, "nombre": "Sudamericana", "pais": "Argentina"},
  "genero": {"id": 1, "nombre": "Novela"} }
```
`genero` y `genero_id` pueden ser `null` → mostrar «Sin clasificar».

### Libro en el detalle (`GET /libros/{id}`) — agrega `autores`
```json
{ ...lo anterior...,
  "autores": [ {"autor_id": 1, "rol": "autor", "orden": 1, "autor": {"id": 1, "nombre": "Julio Cortázar"}} ] }
```

### Alta de libro (`POST /libros/`)
```json
{ "isbn": "978-950-00-0006-6", "titulo": "Título", "precio": 12500.50, "stock": 4,
  "editorial_id": 1, "genero_id": null,
  "autores": [ {"autor_id": 1, "rol": "autor", "orden": 1} ] }
```
- `precio` > 0 con hasta 2 decimales. `stock` entero ≥ 0. `genero_id` opcional (`null`). `autores` con al menos uno.
- `rol` ∈ `"autor" | "coautor" | "traductor" | "ilustrador"`. `orden` entero ≥ 1.
- Enteros hasta 2147483647 (más da 422).

### Cliente
- Alta: `{"nombre": "...", "email": "..."}` (no admite campos extra → 422).
- Respuesta/consulta: `{"id": 2, "nombre": "Tomás Ríos", "email": "tomas@example.com", "perfil": null}`.
- El email repetido da **409** con `detail: "El email ya está registrado."`. El servidor no valida el formato del email: validalo en el cliente.

### Autor / editorial / género
- `GET /autores/{id}` → `{"id": 1, "nombre": "Julio Cortázar", "nacionalidad": "Argentina"}`.
- `GET /editoriales/` → `[{"id": 1, "nombre": "Sudamericana", "pais": "Argentina"}]`.
- `GET /generos/` → `[{"id": 1, "nombre": "Novela"}]`.

### Venta
Alta (`POST /ventas/`) — **solo estos campos** (cualquier otro da 422):
```json
{ "cliente_id": 2, "renglones": [ {"libro_id": 1, "cantidad": 2}, {"libro_id": 4, "cantidad": 1} ] }
```
- Al menos 1 renglón, `cantidad` entero ≥ 1, **un solo renglón por libro** (repetidos → 422).
- El **servidor** copia el precio del libro al renglón y calcula subtotales y total. El frontend no manda precios.

Respuesta (201 y `GET /ventas/{id}`; el listado trae la misma forma):
```json
{ "id": 2, "fecha": "2026-11-14T15:02:11.123456Z", "total": "77000.00",
  "cliente": {"id": 2, "nombre": "Tomás Ríos", "email": "tomas@example.com"},
  "renglones": [
    {"libro_id": 1, "titulo": "Rayuela", "cantidad": 2, "precio_unitario": "25000.00", "subtotal": "50000.00"},
    {"libro_id": 4, "titulo": "Respiración artificial", "cantidad": 1, "precio_unitario": "27000.00", "subtotal": "27000.00"} ] }
```

## Importes: son strings, mostralos tal cual

`total`, `precio_unitario` y `subtotal` de las ventas llegan como **string con 2 decimales** (`"77000.00"`). Mostralos tal cual (`"$" + valor`) sin pasarlos por `Number`: así los importes del historial coinciden con la API (lo exige la "Demostración mínima").
`precio` de los libros también es un decimal; en la lectura puede llegar como string o como número según la versión. **Verificá con una llamada real** y usá `Libreria.util.importe()`, que acepta ambos.

## Errores: formato y qué mostrar

El mensaje del servidor viene en `detail`:

- **404 / 409:** `{"detail": "texto en español"}` → mostrá ese texto.
- **422:** `{"detail": [{"loc": ["body","precio"], "msg": "...", "type": "..."}]}` → una lista (`api.js` la convierte en un texto legible).
- **502 / 503 / 504:** respuesta HTML de Nginx (no JSON) cuando el backend no está → «el servidor no está disponible».
- Sin respuesta (servidor apagado, sin red): no hay código → error de conexión.

Mensajes del servidor que van a ver: `"Ya existe un libro con ese ISBN"`, `"El email ya está registrado."`, `"El libro indicado no existe"`, `"Cliente no encontrado."`, `"Libro no encontrado"`, `"Autor no encontrado"`.

Hay que mostrar el mensaje del servidor ante **409** y **422**, distinguir el error de conexión, y **conservar el borrador de la venta** cuando se rechaza.

## Datos de prueba (seed)

Después de `python -m app.seed` (el seed **borra y recarga las 9 tablas**; nunca lo corras sobre datos que quieras conservar):

| Qué | IDs / valores |
|---|---|
| Editoriales | 1 Sudamericana (Argentina) · 2 Anagrama (España) |
| Géneros | 1 Novela · 2 Cuento |
| Autores | 1 Julio Cortázar · 2 Ricardo Piglia · 3 Adolfo Bioy Casares · 4 Silvina Ocampo · 5 Ernesto Sabato |
| Libros | 1 Rayuela $25000 stock 10 · 2 Bestiario $18000 · 3 La invención de Morel $20000 · 4 Respiración artificial $27000 · 5 El túnel $19500 |
| Clientes | 1 Ana Gómez · 2 Tomás Ríos · 3 Carla Fernández |
| Ventas | 1: cliente 2, libro 1 ×2 + libro 4 ×1, total `77000.00` |

Una venta nueva sobre ese seed (cliente 2; libro 1 ×2, libro 4 ×1) debe devolver `id: 2` y total `77000.00` (ejemplo del enunciado).

## Detalles que conviene saber

- **Orden:** `GET /libros/` y `GET /ventas/` ordenan por `id` ascendente: la venta más nueva queda en la **última** página del historial. La API no devuelve el total de registros: para saber si hay página siguiente, comparar la cantidad recibida con `limit`.
- **Stock:** el alta de una venta **no descuenta stock** (el PDF lo dice y es una duda abierta del backend). No mostrar el stock como si cambiara.
- **Duplicados en autorías:** repetir un `autor_id` en un mismo libro da 409.
- **`titulo`:** la búsqueda es `ILIKE %texto%` en el servidor (parcial, sin distinguir mayúsculas). Al cambiar el filtro, `offset` vuelve a 0.
