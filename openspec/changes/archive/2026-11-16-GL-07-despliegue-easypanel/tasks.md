# Tasks

> Cierre documental retroactivo de GL-07. Marcado `[x]` solo cuando está respaldado por archivos de `evidencia/g07-*` o por `DEPLOY.md`. Faltantes explícitos no se inventan.

## 1. Artefactos OpenSpec y trazabilidad

- [x] 1.1 Crear `openspec/changes/GL-07-despliegue-easypanel/` con `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md` y `specs/deployment-easypanel/spec.md` tomando como referencia la estructura de changes archivados (p. ej. GL-05).
- [x] 1.2 Registrar en la documentación del change el contexto conocido: rama `feature/gl-07-despliegue-easypanel`, commit local sin pushear `4ff66a0 "lo que faltaba"`, despliegue en Easypanel (`grupo10`), URL `https://libreria.marianochirino.me`, proxy `/api` por Nginx y backend sin exposición pública (respaldado por `DEPLOY.md` y evidencia disponible).

## 2. Escenarios GL-07 (evidencia)

- [x] 2.1 **Escenario 1 — Imagen del frontend construida en Easypanel.** Respaldado por `evidencia/g07-build-frontend.txt` (el log termina en Success) y por `DEPLOY.md` (Build Path `/frontend`, Dockerfile).
- [x] 2.2 **Escenario 2 — `/api/health/ready` responde 200 por HTTPS.** Respaldado por `evidencia/g07-health-200.txt` (HTTP 200 explícito) y por `evidencia/g07-health-tras-borrar-dominio.txt` (`{"estado":"listo"}`).
- [x] 2.3 **Escenario 3 — Catálogo carga datos reales desde la URL pública.** Respaldado por `evidencia/g07-persistencia-tras-redeploy.txt` (`GET https://libreria.marianochirino.me/api/libros/?limit=2` con datos reales).
- [x] 2.4 **Escenario 4 — Datos persisten tras redesplegar el backend.** Respaldado por `evidencia/g07-persistencia-tras-redeploy.txt` y por `DEPLOY.md` (datos en `grupo10_db`, no en el contenedor del backend).
- [x] 2.5 **Escenario 5 — Backend no accesible desde internet.** Respaldado por `evidencia/g07-sin-api-404.txt`, `evidencia/g07-backend-sin-dominio.txt`, `evidencia/g07-docker-ps.txt`, `evidencia/g07-backend-dominio-antes.txt`, `evidencia/g07-backend-domains-vacio.png` y `DEPLOY.md` (sin dominio público del backend; solo 80/443 expuestos por Traefik).

## 3. Documentación y resolución de PA-1

- [x] 3.1 Actualizar `DEPLOY.md` sección 6 para registrar que la cátedra confirmó el 16/11/2026 que no se usa Alembic y que las tablas se crean con `create_all` al iniciar el backend, sin mención de consulta pendiente.
- [x] 3.2 Actualizar `README.md`: decisión «Sin migraciones» sin `COMPLETAR` con la confirmación de la cátedra y reemplazo de `POSTGRES_PASSWORD=dev` por `<contraseña-local>` en el ejemplo local.
- [x] 3.3 Completar la fila G-07 de `evidencia/LEEME.md` solo con lo respaldado por archivos existentes en `evidencia/` y listar faltantes sin inventarlos.

## 4. Pendientes de evidencia (a agregar por el usuario)

- [x] 4.1 Agregar evidencia de health con código HTTP 200 explícito.
- [x] 4.2 Agregar log de arranque con «Arranque completado; tablas creadas».
- [x] 4.3 Agregar captura `evidencia/g07-consulta-alembic.png`.
- [x] 4.4 Agregar log de build del frontend en Easypanel.

## 5. Cierre de roadmap (solo junto con archivado confirmado)

- [x] 5.1 Marcar GL-07 como `[x]` en `CHANGES.md` y cerrar PA-1 como resuelta (16/11/2026), dejando GL-08 sin marcar. **No realizar antes del archivado confirmado.**
- [x] 5.2 Archivar el change en `openspec/changes/archive/` y sincronizar specs según flujo OpenSpec. **No realizar hasta confirmación explícita.**

## Referencias de evidencia

- `evidencia/g07-backend-domains-vacio.png`
- `evidencia/g07-backend-dominio-antes.txt`
- `evidencia/g07-backend-sin-dominio.txt`
- `evidencia/g07-docker-ps.txt`
- `evidencia/g07-health-tras-borrar-dominio.txt`
- `evidencia/g07-persistencia-cors.png`
- `evidencia/g07-persistencia-tras-redeploy.txt`
- `evidencia/g07-puerto-443-abierto.png`
- `evidencia/g07-sin-api-404.txt`
- `DEPLOY.md`
