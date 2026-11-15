# frontend-book-registration Specification

## Purpose
Define la pantalla de alta de libros y su listado: cómo se cargan editorial y género, cómo se arman y verifican las autorías, qué se valida antes de llamar a la API, qué se envía, qué se muestra con el 201 y qué se conserva cuando el servidor rechaza el alta.

## Requirements

### Requirement: Opciones de editorial y género desde la API

El módulo MUST cargar las editoriales con `GET /editoriales/` y los géneros con `GET /generos/`, ambas con `limit=100`, y poblar los dos selectores. Mientras carga MUST mostrar un estado de carga; si falla MUST mostrar el error y un botón «Reintentar» que repita solo esas dos consultas.

*Fuente: PDF Ejercicio 2 («Cargá las opciones de editorial y género desde GET /editoriales/ y GET /generos/»); CONTRATO-API §Editorial/género; AGENTS regla 9.*

#### Scenario: Opciones del seed cargadas en los selectores

- **WHEN** se abre la sección Libros con el backend corriendo con seed
- **THEN** la pestaña Red muestra `GET /api/editoriales/?limit=100` y `GET /api/generos/?limit=100` con 200
- **AND** el selector de editorial ofrece «Sudamericana» y «Anagrama» y el de género «Novela» y «Cuento», además de «Sin clasificar»

#### Scenario: Fallo al cargar opciones con reintento

- **WHEN** las dos consultas de opciones fallan (backend apagado detrás de Nginx: 502; o contenedor del frontend caído: sin respuesta)
- **THEN** se muestra el mensaje del error y el botón «Reintentar»
- **AND** al restablecer el backend, «Reintentar» completa los selectores sin recargar la página

### Requirement: Autorías verificadas por ID antes de agregarse

Antes de agregar un autor, el módulo MUST verificarlo con `GET /autores/{id}` y MUST mostrar su nombre. Un ID inexistente MUST NOT agregarse y MUST mostrar el mensaje del servidor; un ID que no sea entero ≥ 1 MUST rechazarse sin llamar a la API. El mismo autor MUST NOT figurar dos veces y cada autoría MUST poder quitarse.

*Fuente: PDF Ejercicio 2 («verificar cada ID con GET /autores/{id} y mostrar su nombre antes de agregarlo»); CONTRATO-API §Autor y §Alta de libro (autoría duplicada → 409).*

#### Scenario: Autor válido muestra su nombre antes de agregarse

- **WHEN** se ingresa el ID 1 y se pulsa «Verificar y agregar»
- **THEN** la pestaña Red muestra `GET /api/autores/1` con 200
- **AND** la lista de autorías muestra «Julio Cortázar» con el rol elegido, y el campo de ID queda listo para el siguiente autor

#### Scenario: Autor inexistente no se agrega

- **WHEN** se ingresa el ID 999 y se pulsa «Verificar y agregar»
- **THEN** la pestaña Red muestra `GET /api/autores/999` con 404
- **AND** se muestra «Autor no encontrado» y la lista de autorías queda igual que antes

#### Scenario: ID de autor inválido no llama a la API

- **WHEN** el campo de ID está vacío o vale 0
- **THEN** no aparece ninguna petición a `/api/autores/` en la pestaña Red
- **AND** se muestra un mensaje local que pide un ID entero mayor o igual a 1

#### Scenario: El mismo autor no se agrega dos veces

- **WHEN** ya está agregado el autor 1 y se intenta agregar el mismo ID otra vez
- **THEN** la lista sigue teniendo una sola entrada para ese autor
- **AND** se muestra un aviso de que el autor ya está en la lista

#### Scenario: Una autoría se puede quitar

- **WHEN** la lista tiene dos autorías y se pulsa quitar en la primera
- **THEN** la lista muestra solo la que quedó, con su nombre y su rol

### Requirement: El alta se valida en el cliente antes de llamar a la API

El alta MUST enviarse solo si el título y el ISBN no están vacíos, el precio es un número mayor que 0 con hasta dos decimales, el stock es un entero mayor o igual a 0, hay una editorial elegida y la lista tiene al menos una autoría. Si alguna condición falla MUST NOT llamarse a la API y MUST mostrarse el motivo junto al formulario.

*Fuente: PDF Ejercicio 2 («Validá los campos»); CONTRATO-API §Alta de libro (precio > 0, stock ≥ 0, al menos un autor); AGENTS regla 9.*

#### Scenario: Precio 0 se rechaza sin llamar a la API

- **WHEN** el resto del formulario es válido pero el precio es `0`
- **THEN** no aparece ningún `POST /api/libros/` en la pestaña Red
- **AND** se muestra junto al formulario un mensaje que indica que el precio debe ser mayor que 0

#### Scenario: Stock negativo se rechaza sin llamar a la API

- **WHEN** el resto del formulario es válido pero el stock es `-1`
- **THEN** no aparece ningún `POST /api/libros/` en la pestaña Red
- **AND** se muestra junto al formulario un mensaje que indica que el stock debe ser un entero mayor o igual a 0

#### Scenario: Alta sin autorías se rechaza sin llamar a la API

- **WHEN** el formulario es válido pero la lista de autorías está vacía
- **THEN** no aparece ningún `POST /api/libros/` en la pestaña Red
- **AND** se muestra junto al formulario un mensaje que pide al menos un autor

#### Scenario: Título o ISBN vacío se rechaza sin llamar a la API

- **WHEN** el título o el ISBN están vacíos (o solo con espacios)
- **THEN** no aparece ningún `POST /api/libros/` en la pestaña Red
- **AND** se muestra junto al formulario el campo que falta

### Requirement: El cuerpo del alta respeta el contrato

El `POST /libros/` MUST ir a esa ruta con su barra final y llevar solo `isbn`, `titulo`, `precio` numérico, `stock` entero, `editorial_id`, `genero_id` (`null` para «Sin clasificar») y `autores` con `autor_id`, `rol` y `orden` entero ≥ 1. Los `rol` MUST ser `autor`, `coautor`, `traductor` o `ilustrador`, sin campos extra.

*Fuente: CONTRATO-API §Alta de libro; PDF Ejercicio 2 (roles de autoría); AGENTS regla 2 (barra final exacta) y regla 3 (endpoints del contrato).*

#### Scenario: Alta con dos autorías envía el cuerpo esperado

- **WHEN** se da de alta un libro con título, ISBN nuevos, precio `12500.50`, stock `4`, editorial 1, género 2, autor 1 como `autor` y autor 2 como `coautor`
- **THEN** la pestaña Red muestra un `POST /api/libros/` con el cuerpo `{"isbn": …, "titulo": …, "precio": 12500.5, "stock": 4, "editorial_id": 1, "genero_id": 2, "autores": [{"autor_id": 1, "rol": "autor", "orden": …}, {"autor_id": 2, "rol": "coautor", "orden": …}]}`
- **AND** la respuesta es 201

#### Scenario: Género «Sin clasificar» viaja como null

- **WHEN** se elige «Sin clasificar» como género y el alta es válida
- **THEN** el cuerpo del `POST /api/libros/` lleva `"genero_id": null`

### Requirement: El 201 actualiza el listado y limpia el formulario

Con 201 el módulo MUST usar el registro devuelto para avisar el éxito y agregar la fila al listado de libros registrados sin recargar la página, y MUST vaciar el formulario y la lista de autorías. El precio MUST mostrarse tal como llega y el género nulo como «Sin clasificar».

*Fuente: PDF Ejercicio 2 («Un alta exitosa devuelve 201. Usá el registro devuelto para actualizar las vistas relacionadas»); CONTRATO-API §Importes y §Libro en el listado.*

#### Scenario: Libro creado aparece en el listado sin recargar

- **WHEN** el alta devuelve 201 con el libro creado
- **THEN** se muestra un mensaje de éxito con el título del registro devuelto
- **AND** la tabla «Libros registrados» incorpora una fila con el `id`, título, ISBN, editorial, stock y precio del registro devuelto
- **AND** el formulario queda vacío y la lista de autorías queda vacía

#### Scenario: Libro con género nulo se muestra «Sin clasificar»

- **WHEN** el libro se dio de alta con «Sin clasificar»
- **THEN** su fila del listado muestra «Sin clasificar» en la columna Género

#### Scenario: El libro nuevo llega al catálogo en su próxima consulta

- **WHEN** después del alta se recarga la página o se pulsa «Buscar» en el catálogo
- **THEN** la nueva fila aparece también en el catálogo, porque esa pantalla consulta `GET /libros/`

### Requirement: Mensaje del servidor en 409 y 422 sin perder lo escrito

Ante 409 o 422 el módulo MUST mostrar el mensaje que devuelve el servidor junto al formulario, MUST conservar los valores escritos y la lista de autorías, y MUST NOT agregar nada al listado de libros.

*Fuente: PDF Ejercicio 2 («Mostrá el mensaje del servidor ante un 409 o 422»); CONTRATO-API §Errores; AGENTS regla 6.*

#### Scenario: ISBN repetido muestra el mensaje del servidor

- **WHEN** se intenta dar de alta un libro con el ISBN de Rayuela (`978-950-00-0001-1`)
- **THEN** la pestaña Red muestra `POST /api/libros/` con 409 y `{"detail": "Ya existe un libro con ese ISBN"}`
- **AND** ese texto se muestra junto al formulario
- **AND** el título, el ISBN, el precio, el stock, la editorial, el género y la lista de autorías siguen cargados
- **AND** el listado de libros no cambia

#### Scenario: Un 422 del servidor también muestra su mensaje

- **WHEN** se envía un stock de `3000000000`, que el cliente acepta como entero pero el servidor rechaza por exceder el rango
- **THEN** la pestaña Red muestra `POST /api/libros/` con 422
- **AND** se muestra el texto aplanado del servidor, que nombra `stock`, y lo escrito se conserva

#### Scenario: El envío sin respuesta conserva lo escrito

- **WHEN** el envío no obtiene respuesta (contenedor del frontend caído)
- **THEN** se muestra el mensaje de error de conexión junto al formulario
- **AND** los valores y la lista de autorías se conservan

### Requirement: Envío único mientras la petición está en curso

El botón de alta MUST deshabilitarse al iniciar el envío y volver a habilitarse cuando termina, con éxito o con error, y un doble clic MUST NOT generar dos altas.

*Fuente: ARQUITECTURA-FRONTEND §Estados de interfaz («deshabilitar el botón mientras se envía una alta»); AGENTS regla 9.*

#### Scenario: Doble clic produce un solo POST

- **WHEN** se hace doble clic seguido en «Agregar libro» con un formulario válido
- **THEN** la pestaña Red muestra un único `POST /api/libros/`
- **AND** el botón aparece deshabilitado mientras la petición está en curso y se habilita al terminar

### Requirement: Listado de libros registrados con sus estados

El listado MUST obtener los libros con `GET /libros/` (`limit=100`, `offset=0`) y MUST distinguir cargando, lista vacía y error. Ante error MUST mostrar el mensaje y un botón «Reintentar», distinguiendo el error de conexión del error del servidor. Cada fila MUST mostrar el precio tal como llega (sin recalcular) y «Sin clasificar» si el género es nulo.

*Fuente: CONTRATO-API §Libro en el listado y §Importes; ARQUITECTURA-FRONTEND §Estados de interfaz; AGENTS regla 4 y regla 9.*

#### Scenario: El listado muestra los libros del seed

- **WHEN** se abre la sección Libros con el backend corriendo con seed
- **THEN** la pestaña Red muestra `GET /api/libros/?limit=100&offset=0` con 200
- **AND** la tabla muestra las cinco filas del seed (Rayuela, Bestiario, La invención de Morel, Respiración artificial, El túnel) con su precio y su editorial

#### Scenario: Estado de carga mientras se espera la respuesta

- **WHEN** se recarga la página con la red del navegador limitada a velocidad lenta
- **THEN** se ve «Cargando libros…» mientras la petición está en curso y desaparece al llegar la respuesta

#### Scenario: Error de conexión con reintento

- **WHEN** el listado falla porque el backend no está disponible (502 por Nginx) o no hay respuesta
- **THEN** se muestra el mensaje del error con el botón «Reintentar»
- **AND** al restablecer el backend, «Reintentar» llena la tabla sin recargar la página
