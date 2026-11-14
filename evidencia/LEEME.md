# Evidencia de los casos G-01 a G-07

> Se completa en GL-08, **ejecutando cada caso desde la URL pública** del frontend. Cada evidencia es lo realmente observado.
> **Sin contraseñas, tokens ni `DATABASE_URL` en las capturas.** Guardar las imágenes en esta carpeta (ej. `g01-busqueda.png`).

| Caso | Pasos realizados | Resultado observado | Captura | Quién | Fecha |
|---|---|---|---|---|---|
| G-01 Catálogo | Buscar por título, paginar con limit/offset, búsqueda sin coincidencias, abrir detalle | COMPLETAR | COMPLETAR | | |
| G-02 Alta de libro | Crear libro con stock, género opcional y autorías; ver detalle; repetir ISBN (409) | COMPLETAR | COMPLETAR | | |
| G-03 Alta de cliente | Crear cliente, recuperarlo por ID; repetir email (409) | COMPLETAR | COMPLETAR | | |
| G-04 Venta | Venta válida con 2 renglones (201); ver detalle tras recargar | COMPLETAR | COMPLETAR | | |
| G-05 Precio histórico | `PATCH /libros/{id}` cambia el precio; la venta anterior conserva sus importes | COMPLETAR | COMPLETAR | | |
| G-06 Rechazo | ID inexistente (409); renglones repetidos (422); el historial no cambia | COMPLETAR | COMPLETAR | | |
| G-07 Despliegue | Imagen construida; URL HTTPS; `/api/health/ready` = 200; datos persisten tras redesplegar | COMPLETAR | COMPLETAR | | |

## Notas

- El `PATCH` del caso G-05 no tiene pantalla en la interfaz: hacerlo con una herramienta HTTP contra la API pública del **frontend** (`https://<dominio>/api/libros/{id}`), ya que el backend no tiene dominio propio.
- Si un caso falla, registrarlo tal cual y qué se hizo para resolverlo.
