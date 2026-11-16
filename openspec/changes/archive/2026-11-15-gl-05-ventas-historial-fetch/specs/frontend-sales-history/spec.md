# Spec Delta

## Purpose

Permite armar y registrar ventas desde el frontend y consultar después su historial persistido. Los importes confirmados y los datos relacionados se presentan desde la respuesta de la API, sin sustituirlos por cálculos del navegador.

## ADDED Requirements

### Requirement: Selección de cliente desde la sesión o por ID

La venta MUST permitir elegir un cliente de la memoria compartida de la sesión o buscarlo con `GET /clientes/{id}`; MUST NOT usar un listado de clientes ni enviar una venta con un cliente que no esté seleccionado.

#### Scenario: El selector refleja los clientes compartidos

- **WHEN** un cliente se registra o consulta y se emite `libreria:clientes`
- **THEN** el selector de ventas incorpora ese cliente desde `L.estado.clientes`

#### Scenario: Buscar cliente por ID para la venta

- **WHEN** se busca el cliente `2` desde Ventas
- **THEN** la pestaña Red muestra `GET /api/clientes/2` con 200, el nombre del cliente queda disponible para seleccionarlo y se incorpora a la memoria compartida

#### Scenario: No hay listado de clientes

- **WHEN** se abre Ventas sin clientes conocidos en la sesión
- **THEN** se ofrece la búsqueda por ID y no se solicita `GET /api/clientes/`

### Requirement: Armado de renglones desde el catálogo

La venta MUST permitir agregar libros del catálogo, cambiar cantidades y quitar renglones, manteniendo como máximo un renglón por libro.

#### Scenario: El selector carga los libros del catálogo

- **WHEN** se abre la sección Ventas
- **THEN** la pestaña Red muestra `GET /api/libros/?limit=100&offset=0` y el selector ofrece los libros recibidos
- **AND** si la página contiene 100 libros, se consultan las páginas siguientes con offsets incrementales hasta recibir una página incompleta

#### Scenario: El catálogo de venta no tiene libros

- **WHEN** la consulta inicial del catálogo responde 200 con una lista vacía
- **THEN** se informa que no hay libros para agregar y no se habilita una confirmación sin renglones

#### Scenario: Error al cargar libros para la venta

- **WHEN** la carga del catálogo falla por conexión o error del servidor y luego se pulsa Reintentar
- **THEN** se muestra el mensaje correspondiente y Reintentar repite la consulta de catálogo pendiente

#### Scenario: Agregar y modificar libros en el borrador

- **WHEN** se agregan dos libros distintos y se cambia la cantidad de uno
- **THEN** el borrador muestra ambos libros con las cantidades actuales y un subtotal estimado claramente rotulado como estimado

#### Scenario: Agregar otra vez un libro ya incluido

- **WHEN** se agrega un libro que ya tiene un renglón en el borrador
- **THEN** el borrador conserva un solo renglón para ese libro y suma la cantidad solicitada a ese renglón

#### Scenario: Quitar un renglón

- **WHEN** se quita un libro del borrador
- **THEN** ese renglón deja de aparecer y el resumen estimado refleja solo los renglones restantes

### Requirement: Validación previa a confirmar una venta

La interfaz MUST impedir el envío si no hay un cliente seleccionado, no hay renglones o alguna cantidad no es un entero positivo; un borrador válido MUST contener un solo renglón por libro.

#### Scenario: Borrador vacío no se envía

- **WHEN** se pulsa Confirmar venta sin renglones
- **THEN** no aparece una petición `POST /api/ventas/` y se mantiene visible que la venta no tiene renglones

#### Scenario: Venta sin cliente seleccionado no se envía

- **WHEN** se pulsa Confirmar venta sin un cliente seleccionado, aunque haya renglones válidos
- **THEN** no aparece una petición `POST /api/ventas/` y se informa que falta seleccionar un cliente

#### Scenario: Cantidad no positiva o fraccionaria no se envía

- **WHEN** se intenta confirmar con una cantidad vacía, cero, negativa o fraccionaria
- **THEN** no aparece `POST /api/ventas/` y se muestra un mensaje de validación junto al borrador

### Requirement: El cuerpo de confirmación cumple el contrato

Al confirmar, la interfaz MUST usar `POST /ventas/` con su barra final y enviar únicamente `cliente_id` y `renglones`, cada uno con `libro_id` y `cantidad`; MUST NOT enviar importes, fecha ni campos adicionales.

#### Scenario: Venta válida con dos libros

- **WHEN** se confirma una venta del cliente 2 con libro 1 ×2 y libro 4 ×1
- **THEN** la pestaña Red muestra `POST /api/ventas/` con el cuerpo `{"cliente_id":2,"renglones":[{"libro_id":1,"cantidad":2},{"libro_id":4,"cantidad":1}]}`
- **AND** la respuesta exitosa es 201

### Requirement: Comprobante desde la respuesta exitosa

Con una respuesta 201, la interfaz MUST mostrar la fecha, cliente, renglones, precios unitarios, subtotales y total recibidos, MUST mostrar los importes confirmados tal como llegan como strings y MUST limpiar el borrador. La interfaz MUST buscar el ID confirmado en el historial paginado; si el recorrido termina sin encontrarlo, MUST conservar el comprobante, informar que la venta no se localizó en el historial y ofrecer reintentar solo esa búsqueda, sin volver a enviar el POST.

#### Scenario: Mostrar importes confirmados sin recalcular

- **WHEN** el POST devuelve `precio_unitario: "25000.00"`, `subtotal: "50000.00"` y `total: "77000.00"`
- **THEN** el comprobante muestra `$25000.00`, `$50000.00` y `$77000.00` sin convertirlos ni recalcularlos
- **AND** el borrador se limpia y el historial pagina `GET /api/ventas/` hasta mostrar la página cuyo elemento tiene el mismo `id` que la respuesta 201

#### Scenario: Falla una lectura del historial después de confirmar la venta

- **WHEN** el POST ya respondió 201 y una petición GET usada para localizar esa venta falla por conexión o error del servidor
- **THEN** el comprobante confirmado permanece visible, se informa que no se pudo actualizar el historial y se ofrece Reintentar la lectura fallida con los mismos parámetros
- **AND** Reintentar continúa la búsqueda por el ID confirmado y no vuelve a enviar `POST /api/ventas/`

#### Scenario: La paginación termina sin encontrar la venta confirmada

- **WHEN** el POST responde 201 y todas las páginas GET del historial terminan sin contener el ID devuelto
- **THEN** el comprobante confirmado permanece visible, se informa que la venta no se localizó en el historial y se ofrece reintentar la búsqueda para ese mismo ID
- **AND** al reintentar solo se consulta el historial mediante GET; no se vuelve a enviar `POST /api/ventas/` ni se descarta el comprobante

#### Scenario: El botón no admite envíos simultáneos

- **WHEN** una confirmación está pendiente de respuesta
- **THEN** el botón Confirmar venta está deshabilitado y una segunda activación no genera otro POST

### Requirement: Rechazo de venta conserva el borrador

Ante 409 o 422 del servidor, la interfaz MUST mostrar el mensaje recibido por `L.api`, MUST conservar cliente y renglones del borrador y MUST NOT agregar una venta al historial.

#### Scenario: Cliente o libro inexistente devuelve 409

- **WHEN** el `POST /api/ventas/` recibe 409 por una referencia inexistente
- **THEN** el mensaje del servidor se muestra, el borrador permanece completo y el historial no cambia

#### Scenario: El servidor rechaza una venta inválida con 422

- **WHEN** el servidor responde 422 con un `detail` de validación
- **THEN** se muestra el mensaje legible preparado por `L.api`, se conserva el borrador y no se agrega una venta al historial

#### Scenario: La interfaz no envía libros duplicados

- **WHEN** se intenta incorporar al borrador un libro que ya figura en otro renglón
- **THEN** la interfaz consolida la cantidad en el renglón existente y el cuerpo de confirmación contiene como máximo un renglón para ese `libro_id`

### Requirement: Fallo incierto del POST conserva el borrador sin reintento automático

Ante un error de conexión o HTTP 5xx durante el POST, la interfaz MUST conservar el borrador, distinguir el fallo de conexión del fallo del servidor, indicar que la venta pudo haberse registrado, recomendar revisar el historial antes de un reenvío manual y MUST NOT reintentar el POST automáticamente.

#### Scenario: Conexión o servidor falla durante el POST

- **WHEN** `POST /api/ventas/` falla por falta de conexión o responde con HTTP 5xx
- **THEN** se conserva el cliente y todos los renglones, se informa el tipo de fallo y que el resultado puede ser incierto, y se recomienda comprobar el historial antes de reenviar manualmente
- **AND** no se emite otro POST automáticamente

### Requirement: Historial paginado desde la API

El historial MUST consultar `GET /ventas/` con parámetros `limit` (1–100) y `offset` (≥ 0), mostrar los registros recibidos en el orden del servidor y distinguir carga, lista vacía, error y éxito.

#### Scenario: Cargar la primera página

- **WHEN** se abre Historial
- **THEN** la pestaña Red muestra `GET /api/ventas/?limit=…&offset=0` y la pantalla muestra las ventas recibidas

#### Scenario: Avanzar y volver en la paginación

- **WHEN** una página contiene tantos registros como `limit`, se pulsa Siguiente y después Anterior
- **THEN** se solicitan los offsets consecutivos y anteriores, y Anterior queda deshabilitado en offset 0

#### Scenario: Historial vacío

- **WHEN** `GET /api/ventas/` responde 200 con una lista vacía en offset 0
- **THEN** se muestra el estado de historial vacío, no una lista de detalle

#### Scenario: Error de conexión con reintento

- **WHEN** falla la carga del historial por conexión o por un error del servidor y luego se pulsa Reintentar
- **THEN** se muestra el mensaje de error con Reintentar y el control repite la consulta pendiente con sus mismos parámetros

#### Scenario: Encontrar en el historial la venta recién confirmada

- **WHEN** un POST responde 201 con un `id` y la página visible de historial no contiene ese ID
- **THEN** se solicitan páginas sucesivas de `GET /api/ventas/` en orden ascendente hasta que una página contenga el mismo ID, y esa página se muestra

### Requirement: Detalle de venta histórico

Al solicitar el detalle, la interfaz MUST usar `GET /ventas/{id}` sin agregar barra final al identificador y MUST mostrar fecha, cliente, renglones y los importes históricos recibidos sin recalcularlos.

#### Scenario: Abrir el detalle de una venta

- **WHEN** se abre el detalle de la venta 1
- **THEN** la pestaña Red muestra `GET /api/ventas/1` con 200 y el detalle muestra fecha, cliente, libros, cantidades, precios unitarios, subtotales y total

#### Scenario: Un cambio de precio no modifica el importe histórico

- **WHEN** se cambia el precio actual de un libro después de registrar una venta y se vuelve a consultar su detalle
- **THEN** el precio unitario, subtotal y total visibles son los valores históricos devueltos por `GET /api/ventas/{id}`, no el precio actual del catálogo

#### Scenario: Detalle inexistente

- **WHEN** `GET /api/ventas/{id}` responde 404
- **THEN** se muestra el mensaje del servidor y no se presentan importes como si el detalle hubiera cargado

#### Scenario: Error de lectura del detalle y reintento

- **WHEN** `GET /api/ventas/1` falla por conexión o error del servidor y luego se pulsa Reintentar
- **THEN** se repite la consulta de detalle para el mismo ID `1` y, si responde 200, se muestra ese detalle con sus importes históricos

### Requirement: Datos de API se muestran como texto y no se persisten en el navegador

La interfaz MUST insertar datos de API mediante texto seguro y MUST NOT guardar clientes, ventas ni importes confirmados en `localStorage`, `sessionStorage` o `IndexedDB`.

#### Scenario: Datos recibidos se representan como texto

- **WHEN** se muestran datos del cliente, libro o venta recibidos de la API
- **THEN** se insertan como texto y el contenido recibido no se interpreta como marcado HTML

#### Scenario: La venta persistida se recupera tras recargar

- **WHEN** se recarga la página después de una venta confirmada y se vuelve a abrir desde Historial
- **THEN** el detalle se obtiene de la API y conserva los mismos importes históricos
