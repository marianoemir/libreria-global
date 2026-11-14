# Spec Delta

## Purpose

Define la imagen del frontend del monorepo: un servidor Nginx que sirve los archivos estáticos de la librería en el puerto 80 y reenvía `/api/` al backend cuya dirección se inyecta al arrancar el contenedor. Es la base para probar el frontend contra la API real y para desplegarlo en Easypanel.

## ADDED Requirements

### Requirement: Imagen construible desde el directorio del frontend

El frontend MUST poder construirse como imagen Docker usando el directorio `frontend/` como contexto de build, sin pasos manuales previos ni variables de entorno en tiempo de build. La imagen MUST escuchar en el puerto 80 del contenedor y la publicación del puerto MUST resolverse al ejecutar el contenedor.

#### Scenario: La imagen se construye sin error

- **WHEN** se ejecuta `docker build -t libreria-frontend .` desde `frontend/`
- **THEN** el comando termina con código 0 y `docker image ls libreria-frontend` lista la imagen recién creada

### Requirement: Proxy `/api/` configurado en runtime

La imagen MUST reenviar las peticiones cuyo camino empieza con `/api/` al backend indicado por la variable de entorno `API_UPSTREAM`, con el formato `host:puerto`, sin esquema (`http://`) ni barra final. La dirección del backend MUST NOT estar escrita en los archivos del frontend: la misma imagen MUST servir tanto contra un backend local como contra el desplegado cambiando solo esa variable.

#### Scenario: La comprobación de salud del backend responde por el puerto publicado

- **WHEN** el backend está corriendo en `host:8000`, se ejecuta el contenedor con `API_UPSTREAM=host.docker.internal:8000` publicado en `127.0.0.1:8080` y se solicita `http://127.0.0.1:8080/api/health/ready`
- **THEN** la respuesta tiene estado 200 y el cuerpo es el que devuelve el backend (`{"estado":"listo"}`)

#### Scenario: La página estática se sirve en la raíz

- **WHEN** el contenedor está en ejecución con un `API_UPSTREAM` válido y se solicita `http://127.0.0.1:8080/`
- **THEN** la respuesta tiene estado 200 y entrega el `index.html` del frontend con sus rutas relativas de CSS y JavaScript

### Requirement: Reescritura de la barra final del proxy

El proxy MUST quitar el prefijo `/api` y conservar la barra final de la ruta, de modo que una petición a `/api/libros/` llegue al backend como `/libros/` y respete la barra final del contrato de la API. El JavaScript del frontend MUST conocer únicamente el prefijo `/api` como base.

#### Scenario: Una ruta con barra final llega al backend con su barra

- **WHEN** el backend está corriendo y se solicita `http://127.0.0.1:8080/api/libros/` a través del contenedor
- **THEN** la respuesta tiene estado 200, lo que prueba que el backend recibió `/libros/` con la barra final (el contenido de los datos se valida en los changes de catálogo)

### Requirement: Fallo del backend responde 502 sin afectar los estáticos

Cuando `API_UPSTREAM` apunta a un host resoluble con un puerto donde no hay backend, el proxy MUST responder 502 a las rutas `/api/` y el contenedor MUST seguir en ejecución. La entrega de la página estática MUST seguir funcionando con estado 200 en esa misma situación.

#### Scenario: Sin backend, `/api/` responde 502 y la página carga

- **WHEN** se ejecuta el contenedor con `API_UPSTREAM=host.docker.internal:8001` (host resoluble, puerto sin backend) y se solicita `http://127.0.0.1:8080/api/libros/`
- **THEN** la respuesta tiene estado 502 y el contenedor sigue en estado `Up`
- **AND** al solicitar `http://127.0.0.1:8080/` la respuesta tiene estado 200

### Requirement: Contenido de la imagen sin material de proceso

La imagen MUST incluir los archivos públicos del frontend en la raíz web de Nginx y la plantilla de configuración del proxy. El material de proceso del parcial 1 (`openspec/`, `.opencode/`, `docs/`) MUST NOT estar presente dentro de la imagen. Los archivos propios de la imagen base de Nginx (por ejemplo `50x.html`) son admisibles.

#### Scenario: El material de proceso no viaja en la imagen

- **WHEN** se inspecciona la raíz web de la imagen construida
- **THEN** la raíz web contiene el `index.html` del sitio con los directorios `css` y `js`
- **AND** no existe en esa raíz ninguna entrada llamada `openspec`, `.opencode` o `docs`
