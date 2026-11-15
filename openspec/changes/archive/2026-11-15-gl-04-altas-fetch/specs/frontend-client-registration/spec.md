# Spec Delta — frontend-client-registration

## Purpose

Define el alta de clientes y su consulta individual por ID: qué se valida antes de llamar a la API, qué se envía y qué se muestra con el 201, cómo se comunican los mensajes de rechazo del servidor y cómo se recuerdan en memoria los clientes registrados o consultados para que otras pantallas puedan usarlos.

## ADDED Requirements

### Requirement: Alta de cliente validada en el cliente

El alta MUST enviarse solo si el nombre no está vacío y el email tiene formato válido (texto, `@`, dominio). Como el servidor no valida el formato del email, el cliente MUST rechazar un email inválido antes de llamar a la API y MUST mostrar el motivo junto al formulario.

*Fuente: PDF Ejercicio 2 («Validá los campos»); CONTRATO-API §Cliente («El servidor no valida el formato del email: validalo en el cliente»); AGENTS regla 9.*

#### Scenario: Email con formato inválido no llama a la API

- **WHEN** se escribe `ana.gomez` sin arroba en el email y se pulsa «Agregar cliente»
- **THEN** no aparece ningún `POST /api/clientes/` en la pestaña Red
- **AND** se muestra junto al formulario un mensaje que indica que el email no es válido

#### Scenario: Nombre vacío no llama a la API

- **WHEN** el nombre está vacío (o solo con espacios) y el email es válido
- **THEN** no aparece ningún `POST /api/clientes/` en la pestaña Red
- **AND** se muestra junto al formulario un mensaje que pide el nombre

### Requirement: El cuerpo del alta lleva solo nombre y email

El `POST /clientes/` MUST enviarse a esa ruta con su barra final y llevar únicamente los campos `nombre` y `email`, sin campos extra.

*Fuente: CONTRATO-API §Cliente («no admite campos extra → 422»); AGENTS regla 2 (barra final exacta).*

#### Scenario: El cuerpo observado en Red tiene dos campos

- **WHEN** se da de alta un cliente con un nombre y un email válidos
- **THEN** la pestaña Red muestra `POST /api/clientes/` con el cuerpo `{"nombre": …, "email": …}` y ningún otro campo
- **AND** la respuesta es 201 con el cliente creado, incluido su `id`

### Requirement: El 201 registra el cliente en la tabla y en la memoria compartida

Con 201 el módulo MUST usar el cliente devuelto para registrarlo en el estado compartido de clientes en memoria (`L.estado.clientes`, escrito con `L.registrarCliente`), MUST mostrarlo en la tabla de clientes de la sesión, MUST avisar el éxito con ese registro y MUST vaciar el formulario.

*Fuente: PDF Ejercicio 2 («Usá el registro devuelto para actualizar las vistas relacionadas»); ARQUITECTURA-FRONTEND §Clientes compartidos.*

#### Scenario: Cliente creado aparece en la tabla y en el estado compartido

- **WHEN** el alta devuelve 201 con un cliente nuevo
- **THEN** se muestra un mensaje de éxito con el nombre del registro devuelto
- **AND** la tabla de clientes incorpora una fila con el `id`, el nombre y el email del registro devuelto
- **AND** en la consola del navegador `L.estado.clientes.get(<id>)` devuelve ese cliente
- **AND** el formulario de alta queda vacío

#### Scenario: El cliente nuevo queda disponible para otras pantallas

- **WHEN** otra pantalla armada sobre el estado compartido (por ejemplo el selector de ventas de GL-05) se redibuja tras el alta
- **THEN** incluye al cliente recién creado, porque el alta emitió el aviso de cambio del estado compartido

### Requirement: Un email repetido muestra el mensaje del servidor

Ante 409 el módulo MUST mostrar el `detail` del servidor junto al formulario, MUST conservar el nombre y el email escritos y MUST NOT agregar una fila nueva a la tabla.

*Fuente: PDF Ejercicio 2 («Mostrá el mensaje del servidor ante un 409 o 422»); CONTRATO-API §Cliente y §Errores; AGENTS regla 6.*

#### Scenario: Email ya registrado

- **WHEN** se intenta dar de alta un cliente con el email de Ana Gómez (`ana.gomez@example.com`)
- **THEN** la pestaña Red muestra `POST /api/clientes/` con 409 y `{"detail": "El email ya está registrado."}`
- **AND** ese texto se muestra junto al formulario
- **AND** el nombre y el email siguen escritos y la tabla de clientes no cambia

### Requirement: Búsqueda de cliente por ID

La búsqueda MUST usar `GET /clientes/{id}` y MUST mostrar el nombre del cliente encontrado. Un cliente encontrado MUST registrarse en la memoria compartida. Un ID que no sea un entero mayor o igual a 1 MUST rechazarse sin llamar a la API, y un ID inexistente MUST mostrar el mensaje del servidor sin agregar nada.

*Fuente: PDF Ejercicio 2 (Consultas por ID) y CONTRATO-API §Cliente; AGENTS regla 3 (no existe `GET /clientes/`).*

#### Scenario: Buscar el cliente 1 muestra su nombre

- **WHEN** se busca el ID `1`
- **THEN** la pestaña Red muestra `GET /api/clientes/1` con 200
- **AND** se muestra «Ana Gómez» como resultado de la búsqueda
- **AND** la tabla de clientes de la sesión incorpora esa fila

#### Scenario: Un ID inexistente muestra el mensaje del servidor

- **WHEN** se busca el ID `999`
- **THEN** la pestaña Red muestra `GET /api/clientes/999` con 404 y `{"detail": "Cliente no encontrado."}`
- **AND** se muestra ese texto como resultado de la búsqueda
- **AND** la tabla de clientes no cambia

#### Scenario: Un ID inválido no llama a la API

- **WHEN** el campo de búsqueda está vacío o vale `0`
- **THEN** no aparece ninguna petición a `/api/clientes/` en la pestaña Red
- **AND** se muestra un mensaje local que pide un ID entero mayor o igual a 1

### Requirement: Tabla de clientes de la sesión

La tabla MUST mostrar los clientes registrados o consultados en la sesión desde el estado compartido `L.estado.clientes`, MUST redibujarse cuando ese estado avisa un cambio y MUST mostrar un mensaje propio cuando está vacía. Al recargar la página la tabla MUST volver a estar vacía, porque no se persiste nada en el navegador.

*Fuente: ARQUITECTURA-FRONTEND §Clientes compartidos; AGENTS regla 1 (sin localStorage ni almacenamiento del navegador).*

#### Scenario: Tabla vacía al abrir la página

- **WHEN** se abre la página sin haber registrado ni consultado clientes
- **THEN** la tabla no tiene filas y se ve el mensaje de que todavía no hay clientes en la sesión

#### Scenario: La tabla reacciona al alta y a la consulta

- **WHEN** se registra un cliente por el alta o se consulta uno por ID
- **THEN** la fila aparece en la tabla sin recargar la página

#### Scenario: Al recargar la tabla vuelve a estar vacía

- **WHEN** se recarga la página después de haber registrado o consultado clientes
- **THEN** la tabla vuelve a estar vacía hasta que se registre o consulte un cliente en la nueva sesión

### Requirement: Error de conexión con reintento en la búsqueda

Ante un error de conexión o del servidor en la búsqueda por ID, el módulo MUST mostrar el mensaje y un botón «Reintentar» que repita la misma consulta. En las altas, el reintento MUST ser el mismo botón de envío: el módulo MUST NOT repetir un `POST` por su cuenta.

*Fuente: AGENTS regla 9 y regla 6; ARQUITECTURA-FRONTEND §Estados de interfaz.*

#### Scenario: Búsqueda con el backend caído y reintento

- **WHEN** se busca el ID 1 con el backend apagado detrás de Nginx (502)
- **THEN** se muestra el mensaje de que el servidor no está disponible y el botón «Reintentar»
- **AND** al levantar el backend, «Reintentar» muestra «Ana Gómez» sin recargar la página

#### Scenario: Un alta fallida no se reenvía sola

- **WHEN** un alta de cliente termina con error de conexión
- **THEN** se muestra el mensaje de error y los datos se conservan
- **AND** no aparece un segundo `POST /api/clientes/` sin una nueva pulsación del botón
