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
| G-07 Despliegue | Verificación pública HTTPS (`/api/health/ready`, `/api/libros/`), persistencia tras redeploy y comprobación de que el backend no es accesible directamente (ruta sin `/api`, dominios/puertos expuestos). | Build del frontend en Easypanel terminado en `Success` (`g07-build-frontend.txt`) y arranque de Nginx (`g07-frontend-arranque.txt`). `/api/health/ready` por HTTPS: HTTP 200 (`g07-health-200.txt`) y `{"estado":"listo"}` tras borrar el dominio del backend (`g07-health-tras-borrar-dominio.txt`). Backend arrancó y creó las 9 tablas (`g07-arranque-tablas.txt`). Catálogo con datos reales y persistencia tras redeploy vía `GET /api/libros/?limit=2` (`g07-persistencia-tras-redeploy.txt`, `g07-persistencia-cors.png`, `g07-puerto-443-abierto.png`). Backend no expuesto: `/libros/` sin `/api` → 404 de Nginx (`g07-sin-api-404.txt`); el dominio del backend daba 502 y se borró, después 404 de Traefik (`g07-backend-dominio-antes.txt`, `g07-backend-sin-dominio.txt`, `g07-backend-domains-vacio.png`); en `docker ps` el backend solo muestra `8000/tcp` y los únicos puertos publicados son 80 y 443 de Traefik (`g07-docker-ps.txt`). Consulta a la cátedra por Alembic: la cátedra indicó seguir con `create_all` (`g07-consulta-alembic.png`). | `g07-build-frontend.txt`, `g07-frontend-arranque.txt`, `g07-health-200.txt`, `g07-health-tras-borrar-dominio.txt`, `g07-arranque-tablas.txt`, `g07-persistencia-tras-redeploy.txt`, `g07-persistencia-cors.png`, `g07-sin-api-404.txt`, `g07-backend-sin-dominio.txt`, `g07-backend-dominio-antes.txt`, `g07-backend-domains-vacio.png`, `g07-docker-ps.txt`, `g07-puerto-443-abierto.png`, `g07-consulta-alembic.png` | Mariano | 16/11/2026 |

## Notas

- El `PATCH` del caso G-05 no tiene pantalla en la interfaz: hacerlo con una herramienta HTTP contra la API pública del **frontend** (`https://<dominio>/api/libros/{id}`), ya que el backend no tiene dominio propio.
- Si un caso falla, registrarlo tal cual y qué se hizo para resolverlo.
- **G-07 — migraciones:** el backend crea las tablas al arrancar con `create_all` (SQLAlchemy async), sin Alembic. La cátedra lo confirmó por consulta el 16/11/2026 (`g07-consulta-alembic.png`). Se documenta en `DEPLOY.md`.
