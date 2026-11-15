# Design

## Context

Ver `proposal.md` para el motivo y `specs/frontend-sales-history/spec.md` para el contrato observable. `ventas.js` e `historial.js` son placeholders GL-02; `index.html` ya tiene controles e IDs provisionales para ambas secciones. `L.api`, `L.util` y `L.estado.clientes` son las interfaces comunes. Los módulos no comparten variables internas y la API no ofrece `GET /clientes/`.

Restricciones relevantes: mantener JavaScript nativo, pedir datos solo por `L.api`, usar rutas exactas del contrato, no persistir registros del negocio, no renderizar datos de API con `innerHTML`, y nunca calcular ni reformatear importes confirmados.

## Goals / Non-Goals

**Goals:**

- Definir la comunicación entre los módulos de venta e historial sin acoplarlos entre sí.
- Distinguir el borrador estimado de la respuesta transaccional confirmada por el servidor.
- Hacer que el historial pueda reconstruirse al recargar consultando de nuevo la API.

**Non-Goals:**

- Cambiar endpoints, modelos, reglas de negocio o código del backend.
- Descontar stock, cobrar pagos, editar/eliminar ventas o persistir borradores.
- Crear una identidad visual nueva ni diseñar mockups en esta fase de propuesta.

## Decisions

### 1. La pantalla de venta obtiene los libros por la API y pagina el selector

`ventas.js` carga opciones con `L.api.get("/libros/", { limit: 100, offset })`, empezando en offset 0 y continuando mientras una página tenga 100 resultados. El módulo de catálogo no publica un contrato para leer su estado y sus variables son privadas; depender de su DOM o estado interno violaría la arquitectura. El tamaño 100 es el máximo del contrato y evita omitir libros cuando el catálogo supera una página. El selector y el borrador se mantienen en memoria; el precio del catálogo se usa solo para una estimación rotulada como tal.

**Alternativa considerada:** reutilizar nodos o estado privado de `catalogo.js`. Se descarta porque crea acoplamiento entre módulos dueños distintos y el estado actual no está expuesto mediante `window.Libreria`.

### 2. El cliente seleccionado usa el estado compartido y la consulta individual existente

El selector se dibuja desde `L.estado.clientes` y escucha `libreria:clientes`. La búsqueda usa `L.api.get("/clientes/" + id)`; al encontrarlo llama a `L.registrarCliente`, que actualiza el estado y emite el evento existente. No se agrega ni se presupone un endpoint de listado.

**Alternativa considerada:** pedir un listado al abrir Ventas. Se descarta porque el contrato confirma que `GET /clientes/` no existe.

### 3. `ventas.js` es dueño del borrador; el historial localiza por ID la venta confirmada

El borrador se conserva en memoria local al módulo como filas únicas por `libro_id`. Volver a agregar el mismo libro incrementa la cantidad de la fila existente. Antes de enviar se construye un objeto nuevo con solo `cliente_id` y `renglones[{libro_id, cantidad}]`; no se serializan precios, subtotales, total ni fecha. El servidor es la autoridad para esos importes.

El contrato confirma que la respuesta 201 de `POST /ventas/` contiene un `id` estable y que cada elemento de `GET /ventas/` expone ese `id` con la misma forma de venta (`docs/CONTRATO-API.md`, §Venta). Tras 201, `ventas.js` muestra el comprobante directamente desde la respuesta, limpia el borrador y emite `libreria:venta-registrada` con el ID confirmado. `historial.js` escucha ese evento y consulta páginas de `GET /ventas/` desde `offset=0`, en orden ascendente, hasta localizar ese ID; muestra la página que lo contiene en lugar de asumir que la página activa ya lo contiene. Si el recorrido llega al final sin encontrarlo, conserva visible el comprobante, informa que la venta no se localizó en el historial y ofrece reintentar solo la búsqueda del historial para el mismo ID; ese reintento no ejecuta el POST ni descarta el comprobante. Un guard de envío además del estado `disabled` evita doble POST antes del siguiente repintado del navegador.

Si una lectura GET de esa búsqueda falla, el comprobante confirmado permanece visible y se indica que el historial no pudo actualizarse. Reintentar repite la lectura fallida con los mismos parámetros y continúa la búsqueda cuando responde; no vuelve a ejecutar el POST. Esto combina la decisión de conservar el comprobante/no reenviar con el comportamiento de reintento de lecturas de `docs/ARQUITECTURA-FRONTEND.md` §Estados de interfaz. Ante rechazo del POST no se emite el evento ni se limpia el borrador.

**Alternativa considerada:** agregar manualmente la respuesta a la tabla o llamar una función privada del historial. Se descarta porque puede ubicar mal el registro en páginas ordenadas por ID y acopla los módulos.

### 4. Historial usa el contrato paginado y obtiene el detalle bajo demanda

`historial.js` consulta `L.api.get("/ventas/", { limit: 20, offset })`; el límite inicial 20 coincide con el valor por defecto documentado y los controles existentes no definen un selector de tamaño de página. Como la API no entrega total, «Siguiente» se habilita cuando la respuesta tiene 20 elementos. Al abrir una fila, se consulta `L.api.get("/ventas/" + id)` sin barra final. Cada cliente recibido por el listado o detalle se incorpora a la memoria compartida con `L.registrarCliente`.

**Alternativas consideradas:** guardar ventas en el estado compartido se descarta para que la recarga reconstruya el historial desde la API; agregar un control de `limit` se deja fuera porque la consigna solo exige paginación por `limit`/`offset` y el marcado existente no ofrece ese control.

### 5. Errores, estados y DOM siguen las utilidades comunes

Los módulos muestran la carga, vacío, éxito y error mediante los nodos existentes y `L.util`; las lecturas fallidas ofrecen Reintentar con los mismos parámetros. Los errores 409/422 del POST usan el texto listo para mostrar de `L.api` y mantienen el borrador. Ante error de conexión (`esRed`) o HTTP 5xx en el POST, se distingue conexión de servidor, se conserva el borrador, se advierte que el servidor pudo haber confirmado la venta y se recomienda revisar el historial antes de reenviar manualmente. No se reintenta una escritura automáticamente. El contenido de la API se construye con `L.util.el`, `textContent` y operaciones DOM seguras.

**Alternativa considerada:** armar HTML con cadenas para dibujar tablas/comprobantes. Se descarta por la regla de seguridad del proyecto y porque expone datos de API a interpretación como marcado.

### 6. La verificación de G-06 separa la protección de UI del contrato de errores

La UI consolida libros repetidos y no debe generar un cuerpo duplicado. El manejo de una respuesta 422, aun así, se verifica conservando el borrador y mostrando el `detail`; los ejemplos `.http` existentes ilustran la respuesta de API. Los archivos `ch07-ventas-*.http` advierten que contienen IDs históricos y no deben ejecutarse contra el seed determinista final sin adaptar sus datos.

## Risks / Trade-offs

- [Un catálogo grande requiere varias solicitudes al abrir Ventas] → usar el máximo permitido de 100, cargar secuencialmente mientras la página esté llena y ofrecer Reintentar si una página falla.
- [Un cambio de precio entre la carga del catálogo y el POST puede volver inexacta la estimación] → marcar todo importe previo a 201 como estimado; el comprobante usa exclusivamente los strings devueltos por el servidor.
- [La paginación puede terminar sin encontrar de inmediato el ID confirmado] → conservar el comprobante, informar que no se localizó en el historial y permitir reintentar solo la búsqueda GET para ese ID; nunca reenviar el POST.
- [Una lectura de historial puede fallar después de que el POST ya confirmó la venta] → mantener visible el comprobante y reintentar solo la lectura fallida; nunca reenviar el POST.
- [Los ejemplos HTTP de ventas contienen IDs de una base histórica] → no ejecutarlos sin revisar la advertencia y los datos del entorno; verificar con una base de prueba autorizada y evidencia real.

## Migration Plan

No hay migración de datos ni despliegue especial. Implementar los módulos y secciones dentro del alcance GL-05, probar manualmente los escenarios de la spec contra el backend de prueba integrado y revisar las solicitudes/respuestas en Red. El rollback consiste en revertir los archivos de GL-05; no requiere cambios de backend ni altera ventas persistidas.

## UI Mockups

- **Decision:** no (project policy, 2026-11-15).
- **Mockups:** none required; `.active-orchestrator-state.json` sets `visual_design.mode: off`.
