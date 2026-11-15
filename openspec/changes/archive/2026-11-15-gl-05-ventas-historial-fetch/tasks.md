# Tasks

## 1. Completar el marcado de Ventas e Historial

- [x] 1.1 Completar en `frontend/public/index.html` los controles de Ventas con labels, mensajes de carga/error/éxito y regiones accesibles; verificar que los IDs `venta-*`, `ventas-*` y `renglon-*` sean únicos y que no se alteren las secciones de otros dueños.
- [x] 1.2 Completar en `frontend/public/index.html` los estados, tabla, paginación y detalle de Historial; verificar labels/roles accesibles e IDs únicos `historial-*`.
- [x] 1.3 Agregar al final de `frontend/public/css/styles.css` los estilos de GL-05; verificar que las reglas preexistentes no se modifiquen y que las secciones sean utilizables en móvil y escritorio.

## 2. Implementar el armado y confirmación de ventas

- [x] 2.1 Cargar las opciones de libros por `L.api` con `GET /libros/`, `limit=100` y offsets crecientes; verificar en Red la carga de páginas completas, el estado vacío y que Reintentar repita la consulta fallida.
- [x] 2.2 Dibujar el selector desde `L.estado.clientes`, reaccionar a `libreria:clientes` y permitir búsqueda por `GET /clientes/{id}`; verificar que un cliente encontrado se registre con `L.registrarCliente` y que no se solicite `GET /clientes/`.
- [x] 2.3 Implementar el borrador en memoria con agregar, cambiar cantidades, quitar y consolidar libros repetidos; verificar un renglón por `libro_id`, validación de cantidades enteras positivas y que cualquier importe previo a confirmar se rotule «estimado».
- [x] 2.4 Implementar la confirmación con `POST /ventas/` y un cuerpo limitado a `cliente_id` y `renglones[{libro_id,cantidad}]`; verificar la barra final, que no se envíen importes/fecha/campos extra, que el botón quede deshabilitado durante el envío, y que 201 muestre la respuesta literal, limpie el borrador y emita `libreria:venta-registrada`.
- [x] 2.5 Manejar errores 409/422 sin limpiar ni alterar el borrador; verificar que se muestre el mensaje de `L.api`, que no se agregue una venta al historial y que un rechazo no provoque un reintento automático.
- [x] 2.6 Validar la selección de cliente antes del POST; verificar con renglones válidos y sin cliente seleccionado que se informa el error y no aparece `POST /api/ventas/` en Red.
- [x] 2.7 Manejar errores de conexión y HTTP 5xx durante el POST; verificar que se distingan, se conserve el borrador, se advierta que el resultado puede ser incierto, se recomiende revisar el historial antes de reenviar manualmente y no ocurra un reintento automático.

## 3. Implementar Historial y detalle

- [x] 3.1 Consultar `GET /ventas/` con `limit=20` y `offset`, mantener el orden recibido y controlar anterior/siguiente; verificar carga, lista vacía, error con Reintentar, y que Siguiente se habilite solo cuando la página tenga 20 elementos.
- [x] 3.2 Consultar el detalle con `GET /ventas/{id}` sin barra final adicional; verificar fecha, cliente, renglones, importes string sin recalcular, tratamiento de 404 y registro de clientes recibidos mediante `L.registrarCliente`.
- [x] 3.3 Escuchar `libreria:venta-registrada` con el ID confirmado y paginar `GET /ventas/` desde offset 0 hasta encontrarlo; verificar que se muestre la página que contiene ese ID, sin suponer que la página activa lo contiene ni insertar la venta localmente.
- [x] 3.4 Manejar el fin de la paginación sin encontrar el ID confirmado; verificar que el comprobante siga visible, se informe que la venta no se localizó en el historial y Reintentar consulte solo el historial para ese ID, sin descartar el comprobante ni enviar otro POST.
- [x] 3.5 Manejar fallos de conexión/servidor al leer el detalle; verificar que Reintentar repita `GET /ventas/{id}` para el mismo ID, muestre el detalle si el reintento responde 200 y no envíe un POST.

## 4. Verificar escenarios de integración de GL-05

- [x] 4.1 Verificar G-04 en un backend de prueba autorizado: cliente 2, libro 1 ×2 y libro 4 ×1 devuelve 201; comparar los importes con la respuesta real y comprobar que el historial pagina hasta mostrar la página que contiene exactamente el ID de esa respuesta.
- [x] 4.2 Verificar G-05 en una base de prueba descartable: cambiar el precio de un libro con `PATCH /libros/{id}`, confirmar que el detalle histórico conserva sus importes anteriores y restaurar el precio de prueba al finalizar.
- [x] 4.3 Verificar G-06: una referencia inexistente produce 409 con `detail`, conserva borrador e historial; probar la respuesta 422 de renglones duplicados en el contrato HTTP contra una base descartable y comprobar el manejo de 422 en la interfaz con una respuesta controlada, sin hacer que la UI envíe renglones duplicados.
- [x] 4.4 Verificar los límites del formulario: sin cliente seleccionado, sin renglones o con cantidades vacías, cero, negativas o fraccionarias no hay POST; mientras el POST está pendiente no se emite una segunda solicitud.
- [x] 4.5 Simular un fallo de conexión o servidor en una página GET durante la búsqueda posterior al 201; verificar que el comprobante confirmado siga visible, Reintentar repita solo la lectura fallida con los mismos parámetros y la búsqueda continúe hasta la página del ID sin otro POST.
- [x] 4.6 Simular fallo de conexión y HTTP 5xx en el POST; verificar borrador conservado, mensaje de resultado incierto, recomendación de revisar historial antes de reenvío manual y ausencia de reintento automático.
- [x] 4.7 Simular páginas GET exitosas que terminan sin contener el ID del 201; verificar el aviso de venta no localizada, el comprobante retenido y que la acción Reintentar solo realice consultas GET del historial sin otro POST.

## Workflow follow-up

- La política visual del proyecto permanece `off`; no se requieren mockups.
- Antes de archivar, comprobar cada escenario con evidencia real de Red/API. Los ejemplos `backend/test/ch07-ventas-*.http` advierten que sus IDs son históricos; no ejecutarlos contra datos que se deban conservar.
