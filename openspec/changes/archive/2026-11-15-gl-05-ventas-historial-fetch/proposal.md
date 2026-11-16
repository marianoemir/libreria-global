# Proposal

## Why

Las secciones de ventas e historial todavía son placeholders, por lo que la interfaz no permite registrar una venta real ni consultar sus importes persistidos. GL-05 conecta el flujo del Ejercicio 3 con la API ya integrada, preservando los valores históricos del servidor y el borrador cuando una operación es rechazada.

## What Changes

- Implementar el armado y confirmación de ventas en `frontend/public/js/ventas.js`, usando los clientes compartidos en memoria y el catálogo existente.
- Implementar el historial paginado y la consulta del detalle en `frontend/public/js/historial.js`; incorporar a `L.estado.clientes` los clientes incluidos en ventas.
- Completar las secciones `#ventas` y `#historial` de `frontend/public/index.html` y agregar los estilos de GL-05 al final de `frontend/public/css/styles.css`.
- Validar localmente que haya al menos un renglón, cantidades enteras positivas y un solo renglón por libro; enviar a `POST /ventas/` únicamente `cliente_id` y `renglones[{libro_id, cantidad}]`.
- Mostrar el comprobante y el detalle histórico con fecha, cliente, renglones e importes devueltos por la API; cargar `GET /ventas/` con `limit`/`offset` y abrir `GET /ventas/{id}`. Después de un 201, paginar el historial hasta encontrar por ID la página que contiene la venta recién creada; si el recorrido termina sin encontrarla, mantener el comprobante e informar que no se localizó en el historial, ofreciendo reintentar solo la consulta del historial.
- Ante 409 o 422, mostrar el mensaje preparado por `L.api` y conservar el borrador. Ante error de conexión o HTTP 5xx en el POST, conservar el borrador, explicar que el resultado puede ser incierto y recomendar revisar el historial antes de un reenvío manual; no reintentar automáticamente. Deshabilitar el control de confirmación mientras el POST está en curso.

## Capabilities

### New Capabilities

- `frontend-sales-history`: armado, confirmación y consulta paginada/detallada de ventas desde la interfaz, con fidelidad a los datos históricos de la API.

### Modified Capabilities

- Ninguna.

## Impact

- Archivos del frontend: `frontend/public/js/ventas.js`, `frontend/public/js/historial.js`, las secciones propias de GL-05 en `frontend/public/index.html` y reglas agregadas al final de `frontend/public/css/styles.css`.
- Endpoints existentes, sin cambios de backend: `GET /libros/`, `GET /clientes/{id}`, `POST /ventas/`, `GET /ventas/` y `GET /ventas/{id}`. El cliente HTTP agrega el prefijo `/api`; se respetan las barras finales exactas del contrato.
- Depende de GL-02 para `L.api`/`L.util` y del registro compartido de clientes de GL-04. No introduce dependencias, almacenamiento persistente ni endpoints nuevos.
- La verificación es manual contra el backend real con datos de prueba, observando las solicitudes y respuestas en la pestaña Red y recorriendo G-04, G-05 y G-06.
