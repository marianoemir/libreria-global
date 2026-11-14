# Spec Delta — frontend-http-client

## Purpose

Define el cliente HTTP único del frontend: cómo se arman las URLs contra la API de la librería, cómo se envían los cuerpos y qué error uniforme reciben los módulos para distinguir un rechazo del servidor de una caída de conexión.

## ADDED Requirements

### Requirement: Base única `/api` y barra final exacta

Todo pedido del frontend MUST construirse sobre la base relativa `/api`; el llamador MUST pasar la ruta del backend con su barra final tal como figura en el contrato y el cliente MUST NOT agregar ni quitar barras. El código servido MUST NOT contener la dirección del backend (host, puerto ni esquema).

#### Scenario: Una ruta con barra final la conserva

- **WHEN** se pide la lista por la ruta `/libros/`
- **THEN** la petición sale a `/api/libros/`, con la barra final intacta

#### Scenario: Un detalle no recibe barra agregada

- **WHEN** se pide el detalle por la ruta `/libros/3`
- **THEN** la petición sale a `/api/libros/3`, sin barra final agregada

### Requirement: Query que omite parámetros vacíos

La query MUST serializar cada parámetro como `clave=valor` con el valor codificado para URL, omitiendo los valores `""`, `null` y `undefined`, y conservando `0` y `false`. Si no queda ningún parámetro la URL MUST NOT llevar `?`.

#### Scenario: Arma la query del catálogo y omite vacíos

- **WHEN** se hace un `GET` a `/libros/` con `titulo: "rayu"`, `limit: 20`, `offset: 0`, `vacio: ""`, `nulo: null` y `undef: undefined`
- **THEN** la petición sale a `/api/libros/?titulo=rayu&limit=20&offset=0`
- **AND** `offset=0` está presente porque `0` es un valor válido

#### Scenario: Sin parámetros útiles no hay signo de interrogación

- **WHEN** se hace un `GET` a `/ventas/` con todos los parámetros vacíos
- **THEN** la petición sale a `/api/ventas/` sin `?`

#### Scenario: Los valores se codifican para URL

- **WHEN** se busca por título con espacios y acentos, por ejemplo `titulo: "El túnel"`
- **THEN** la petición sale a `/api/libros/?titulo=El%20t%C3%BAnel`

### Requirement: Peticiones con cuerpo JSON

El cliente MUST exponer solo los métodos `GET`, `POST` y `PATCH` del contrato. Cuando se envía cuerpo, MUST serializarlo como JSON y declarar `Content-Type: application/json`.

#### Scenario: El alta viaja como JSON

- **WHEN** se hace un `POST` a `/libros/` con un objeto
- **THEN** la petición lleva `Content-Type: application/json` y el cuerpo con el objeto serializado

#### Scenario: La modificación de precio viaja como JSON

- **WHEN** se hace un `PATCH` a `/libros/3` con `{precio: 100}`
- **THEN** la petición sale a `/api/libros/3` con el cuerpo JSON y el método `PATCH`

### Requirement: Error uniforme ante respuestas no exitosas

Toda respuesta fuera del rango 2xx MUST lanzar un único tipo de error con el código HTTP, un mensaje listo para mostrar y el cuerpo de error cuando exista. Para 404 y 409 el mensaje MUST ser el `detail` del servidor; para 422, una lista, el mensaje MUST incluir cada campo y su texto de error de forma legible.

#### Scenario: Un 409 muestra el mensaje del servidor

- **WHEN** un `POST /libros/` devuelve 409 con `{"detail": "Ya existe un libro con ese ISBN"}`
- **THEN** se lanza el error con `status` 409, `esRed` falso y mensaje `Ya existe un libro con ese ISBN`

#### Scenario: Un 422 convierte la lista en texto legible

- **WHEN** un `POST /libros/` devuelve 422 con una lista que señala `precio` y `autores.0.rol`
- **THEN** se lanza el error con `status` 422, `esRed` falso y un mensaje que nombra `precio` y `autores.0.rol` junto al texto de cada error

#### Scenario: Un 404 muestra el mensaje del servidor

- **WHEN** un `GET /clientes/99` devuelve 404 con `{"detail": "Cliente no encontrado."}`
- **THEN** se lanza el error con `status` 404 y mensaje `Cliente no encontrado.`

### Requirement: Conexión caída distinta de error del servidor

Un error de pasarela (502, 503 o 504, aunque el cuerpo sea HTML de Nginx) MUST conservar su código, MUST NOT marcarse como error de conexión y MUST informar que el servidor no está disponible. Solo la ausencia de respuesta MUST marcarse como error de conexión, con código 0 y un mensaje que invite a revisar la conexión.

#### Scenario: Servidor apagado se marca como error de conexión

- **WHEN** no hay nada escuchando en el destino de la petición
- **THEN** se lanza el error con `status` 0, `esRed` verdadero y un mensaje que dice que no se pudo conectar

#### Scenario: Un 502 de Nginx no se confunde con red caída

- **WHEN** la respuesta es 502 con cuerpo HTML en lugar de JSON
- **THEN** se lanza el error con `status` 502, `esRed` falso y un mensaje que avisa que el servidor no está disponible (`502`)

### Requirement: Respuestas exitosas devuelven código y datos

Toda respuesta 2xx MUST resolverse con el código HTTP y el cuerpo JSON parseado. Un cuerpo vacío (por ejemplo 204) MUST resolverse con datos nulos sin lanzar error.

#### Scenario: El alta devuelve el registro creado

- **WHEN** un `POST /libros/` devuelve 201 con el libro creado
- **THEN** la promesa resuelve con `status` 201 y los datos del libro

#### Scenario: Una respuesta sin cuerpo no rompe

- **WHEN** la respuesta es 204 sin cuerpo
- **THEN** la promesa resuelve con `status` 204 y datos nulos
