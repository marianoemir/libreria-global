# backend-cors Specification

## Purpose

Define la política CORS del backend: qué orígenes pueden llamar a la API desde un navegador, cómo se declaran por variable de entorno y qué ocurre cuando no se declara ninguno. Con la conexión interna de Nginx la API se consume en el mismo origen y esta política no interviene; existe para el pedido del profesor y para que un navegador pueda llamar directo a la API si hiciera falta.

## Requirements

### Requirement: Orígenes permitidos por variable de entorno

La API MUST autorizar las peticiones de navegador cuyo encabezado `Origin` figure en la lista de la variable de entorno `CORS_ORIGINS` (valores separados por coma, cada uno con esquema `http` o `https`). La respuesta a un origen autorizado MUST incluir `access-control-allow-origin` con ese mismo origen, y MUST NOT usar el comodín `*`.

#### Scenario: Un origen listado recibe su propio `access-control-allow-origin`

- **WHEN** el backend se inicia con `CORS_ORIGINS=http://localhost:8080` y se solicita `GET /libros/` con el encabezado `Origin: http://localhost:8080`
- **THEN** la respuesta tiene estado 200 y el encabezado `access-control-allow-origin` vale exactamente `http://localhost:8080` (no `*`)

### Requirement: Un origen no listado no recibe autorización

Cuando el `Origin` de la petición no figura en `CORS_ORIGINS`, la API MUST responder la petición con normalidad pero MUST NOT incluir `access-control-allow-origin`, de modo que el navegador bloquee la lectura de la respuesta. Un origen ajeno MUST NOT poder leer datos de la API.

#### Scenario: Un origen no listado no recibe autorización

- **WHEN** el backend se inicia con `CORS_ORIGINS=http://localhost:8080` y se solicita `GET /libros/` con el encabezado `Origin: http://evil.example`
- **THEN** la respuesta no incluye el encabezado `access-control-allow-origin` en ninguna de sus formas

### Requirement: Denegar por defecto cuando no hay orígenes configurados

Si `CORS_ORIGINS` no está definida, está vacía o solo contiene separadores y espacios, la API MUST arrancar y atender con normalidad y MUST NOT autorizar ningún origen cruzado. No existe ningún origen autorizado por defecto y el comodín `*` MUST NOT usarse en ningún caso.

#### Scenario: Sin `CORS_ORIGINS` la API arranca y no autoriza ningún origen

- **WHEN** el backend se inicia sin `CORS_ORIGINS` definida y se solicita `GET /health/ready` y `GET /libros/`, esta última con el encabezado `Origin: http://localhost:8080`
- **THEN** `/health/ready` responde 200 con `{"estado":"listo"}` y `/libros/` responde 200 sin el encabezado `access-control-allow-origin`

### Requirement: Preflight resuelto según la lista de orígenes

La API MUST responder las peticiones de verificación previa (`OPTIONS` con `Origin` y `Access-Control-Request-Method`) de un origen listado con estado 200 y los encabezados `access-control-allow-origin`, `access-control-allow-methods` y `access-control-allow-headers`. Las de un origen no listado MUST rechazarse sin `access-control-allow-origin`.

#### Scenario: Preflight aceptado desde un origen listado

- **WHEN** el backend se inicia con `CORS_ORIGINS=http://localhost:8080` y se envía `OPTIONS /ventas/` con `Origin: http://localhost:8080`, `Access-Control-Request-Method: POST` y `Access-Control-Request-Headers: content-type`
- **THEN** la respuesta tiene estado 200 e incluye `access-control-allow-origin: http://localhost:8080`, `access-control-allow-methods` con `POST` y `access-control-allow-headers` con `content-type`

#### Scenario: Preflight rechazado desde un origen no listado

- **WHEN** con esa misma configuración se envía `OPTIONS /ventas/` con `Origin: http://evil.example` y `Access-Control-Request-Method: POST`
- **THEN** la respuesta tiene estado 400 y no incluye el encabezado `access-control-allow-origin`

### Requirement: Normalización de la lista de orígenes

Los valores de `CORS_ORIGINS` MUST normalizarse antes de compararse: se recortan los espacios alrededor de cada entrada y se quita la barra final, porque los navegadores envían `Origin` sin barra final. Las entradas vacías MUST descartarse en lugar de convertirse en orígenes válidos.

#### Scenario: Las entradas se normalizan y las vacías se descartan

- **WHEN** el backend se inicia con `CORS_ORIGINS= http://localhost:8080/ , https://x ,` y se solicita `GET /libros/` con `Origin: http://localhost:8080`
- **THEN** la respuesta incluye `access-control-allow-origin: http://localhost:8080` (la entrada con barra final y espacios coincide) y ese encabezado nunca queda vacío ni vale `*` (las entradas vacías no generan orígenes)

### Requirement: Sin credenciales cruzadas

La API MUST NOT autorizar peticiones cruzadas con credenciales: la respuesta MUST NOT incluir `access-control-allow-credentials`. La API es stateless y no tiene autenticación por cookies ni sesiones, así que la política de orígenes explícitos se combina con credenciales deshabilitadas.

#### Scenario: La respuesta no habilita credenciales

- **WHEN** el backend se inicia con `CORS_ORIGINS=http://localhost:8080` y se solicita `GET /libros/` con `Origin: http://localhost:8080`
- **THEN** la respuesta incluye `access-control-allow-origin` y no incluye el encabezado `access-control-allow-credentials`

### Requirement: Documentación de la variable en `env.example`

`backend/env.example` MUST documentar `CORS_ORIGINS`: para qué sirve, el formato (lista separada por comas, con esquema y sin barra final) y un valor de ejemplo con dominios ficticios o locales. MUST NOT contener valores reales, credenciales ni secretos.

#### Scenario: La variable está documentada con un ejemplo

- **WHEN** se lee `backend/env.example`
- **THEN** contiene la clave `CORS_ORIGINS` precedida de un comentario que explica el formato, con un valor de ejemplo de orígenes con esquema, y no contiene secretos ni credenciales

### Requirement: El middleware no altera el comportamiento existente

Instalar la política CORS MUST NOT cambiar el enrutamiento, los estados ni los cuerpos de las rutas existentes. Las comprobaciones de salud y el catálogo MUST seguir respondiendo igual con y sin `CORS_ORIGINS` configurada.

#### Scenario: Salud y catálogo responden igual con el middleware instalado

- **WHEN** el backend se inicia con `CORS_ORIGINS=http://localhost:8080` sobre la base con los datos de prueba y se solicita `GET /health/ready` y `GET /libros/` sin encabezado `Origin`
- **THEN** `/health/ready` responde 200 con `{"estado":"listo"}` y `/libros/` responde 200 con los 5 libros del seed, sin encabezados CORS en la respuesta
