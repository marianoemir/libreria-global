# frontend-catalogo Specification

## Purpose

El catálogo es la pantalla del Ejercicio 1: muestra los libros de la API con búsqueda por título, paginación y detalle con autores, distinguiendo los cinco estados de interfaz que pide la consigna.

## Requirements

### Requirement: Listado del catálogo desde la API

El sistema SHALL obtener los libros con `GET /libros/` pasando `titulo` (parcial, sin distinguir mayúsculas), `limit` (1–100) y `offset` (≥ 0), y SHALL mostrar por cada libro su título, ISBN, precio, editorial y género.

#### Scenario: El catálogo muestra los 5 libros del seed

- **WHEN** se abre la sección Catálogo con el backend con seed y sin filtro
- **THEN** la pestaña Red muestra `GET /api/libros/?limit=…&offset=0` con 200 y la lista muestra los 5 libros (Rayuela, Bestiario, La invención de Morel, Respiración artificial, El túnel)

#### Scenario: Cada libro muestra título, ISBN, precio, editorial y género

- **WHEN** la lista del escenario anterior está visible
- **THEN** cada tarjeta/fila contiene el título, el ISBN, el precio con `L.util.importe`, el nombre de la editorial y el nombre del género

#### Scenario: Género nulo se muestra como «Sin clasificar»

- **WHEN** un libro llega con `genero: null`
- **THEN** su género visible es el texto «Sin clasificar»

### Requirement: Búsqueda por título con reinicio de página

El sistema SHALL buscar con el valor del campo recortado (`trim`); un filtro vacío SHALL equivaler a sin filtro, y cualquier cambio de filtro o de `limit` SHALL reiniciar `offset` a 0.

#### Scenario: Buscar «rayu» muestra solo Rayuela

- **WHEN** se escribe `rayu` en `#catalogo-busqueda` y se pulsa Buscar
- **THEN** la Red muestra `GET /api/libros/?titulo=rayu&limit=…&offset=0` y solo Rayuela queda visible

#### Scenario: Búsqueda sin coincidencias muestra su mensaje

- **WHEN** se busca un título inexistente (p. ej. `zzzsinlibrozzz`)
- **THEN** la Red muestra el `GET /api/libros/?titulo=…` con 200 y lista vacía, se ve `#catalogo-sin-resultados` («No se encontraron libros con ese título») y la lista y la paginación quedan ocultas

### Requirement: Paginación anterior/siguiente sin total

La API no devuelve el total; el sistema SHALL habilitar «Siguiente» solo cuando la página recibida trae tantos libros como el `limit`, SHALL deshabilitar «Anterior» cuando `offset` es 0, y SHALL ignorar respuestas viejas si el usuario dispara varias búsquedas seguidas.

#### Scenario: Con limit=2 se avanza y retrocede de página

- **WHEN** se elige `limit=2`, se avanza con «Siguiente» y luego se vuelve con «Anterior»
- **THEN** la Red muestra `offset=0`, `offset=2` y de nuevo `offset=0`, cada página trae 2 libros distintos y «Anterior» queda deshabilitado en la primera página

#### Scenario: Al buscar vuelve a la primera página

- **WHEN** estando en `offset=2` se cambia el filtro y se busca
- **THEN** la petición sale con `offset=0`

### Requirement: Detalle del libro con autores

El sistema SHALL pedir el detalle con `GET /libros/{id}` (sin barra agregada al id, cfr. docs/CONTRATO-API.md:9) al pulsar «Ver detalle» y SHALL mostrar sus autores con nombre, rol y orden en `#catalogo-detalle`; un 404 SHALL mostrar el mensaje del servidor.

#### Scenario: El detalle de un libro muestra su autor

- **WHEN** se pulsa «Ver detalle» en Rayuela (id 1)
- **THEN** la Red muestra `GET /api/libros/1` con 200 y el detalle incluye «Julio Cortázar» con su rol y orden

#### Scenario: Detalle inexistente muestra el mensaje del servidor

- **WHEN** el detalle responde 404 con `{"detail": "Libro no encontrado"}`
- **THEN** el detalle muestra el texto «Libro no encontrado»

### Requirement: Estados de interfaz del catálogo

El sistema SHALL distinguir cargando, lista vacía (sin filtro), sin coincidencias (con filtro), error de conexión o del servidor (con botón «Reintentar» que repite la última petición) y éxito, usando los nodos `#catalogo-cargando`, `#catalogo-vacio`, `#catalogo-sin-resultados`, `#catalogo-error` + `#catalogo-reintentar`, lista y paginación.

#### Scenario: Con el backend apagado se muestra el error y Reintentar funciona

- **WHEN** el backend está apagado y se abre o busca el catálogo, y luego se levanta el backend y se pulsa «Reintentar»
- **THEN** primero se ve `#catalogo-error` con mensaje de conexión y la lista oculta; tras «Reintentar» la Red muestra el `GET /api/libros/…` con 200 y la lista vuelve a verse
