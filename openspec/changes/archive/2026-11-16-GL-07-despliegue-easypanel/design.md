# Design

## Context

GL-07 ya fue implementado y desplegado en Easypanel; este change existe para cierre documental retroactivo. La arquitectura desplegada usa dos servicios App del mismo proyecto (`grupo10`): frontend Nginx sirviendo la UI y proxy de `/api/` hacia el backend interno, y backend FastAPI sin dominio público ni puerto publicado en el host. La base de datos PostgreSQL es independiente y persiste fuera del contenedor del backend.

Fuentes de verdad para este cierre: `DEPLOY.md`, archivos `evidencia/g07-*` presentes en el repositorio y la información provista en esta sesión (URL pública, escenarios GL-07, commit local `4ff66a0`).

## Goals / Non-Goals

**Goals:**

- Dejar trazabilidad documental del despliegue real (servicios, rutas de build, proxy, variables por nombre, aislamiento y persistencia).
- Registrar la resolución de PA-1 confirmada por la cátedra el 16/11/2026 (sin Alembic, `create_all`).
- Reflejar en tareas/specs solo lo respaldado por evidencia existente (`evidencia/g07-*`) o por `DEPLOY.md`.

**Non-Goals:**

- No modificar código de `backend/` ni `frontend/`.
- No crear ni inventar evidencia faltante.
- No ejecutar commit/push ni archivar automáticamente sin confirmación explícita.

## Decisions

### 1. Cierre retroactivo basado en evidencia disponible

Se crea el change GL-07 en `openspec/changes/` con artefactos completos para revisión antes de archivar. Las tareas se marcan `[x]` únicamente cuando hay respaldo directo en `evidencia/g07-*` o en `DEPLOY.md`; lo no respaldado queda pendiente y se lista explícitamente.

### 2. Proxy interno y superficie pública mínima

El navegador accede solo al frontend (`/api/...`); Nginx reenvía al backend interno (`API_UPSTREAM`). La exposición pública se limita a 80/443 vía Traefik. La evidencia documental de aislamiento se apoya en `g07-sin-api-404.txt`, `g07-backend-sin-dominio.txt`, `g07-docker-ps.txt` y capturas asociadas.

### 3. Persistencia y datos de producción

Los datos viven en PostgreSQL (`grupo10_db`) y no en el contenedor del backend. El seed se ejecutó una sola vez en producción; la persistencia tras redeploy se respalda con `g07-persistencia-tras-redeploy.txt` (consulta pública a `/api/libros/` con datos reales).

### 4. Resolución de PA-1

Se documenta la confirmación de la cátedra del 16/11/2026: no se usa Alembic y las tablas se crean con `create_all` al iniciar el backend. `DEPLOY.md` y `README.md` deben reflejar esta decisión sin menciones a consulta pendiente.

## Risks / Trade-offs

- [Evidencia incompleta para algunos criterios] → mantener tareas sin marcar y listar faltantes (HTTP 200 explícito de health, log de arranque/tablas, captura de consulta Alembic, log de build frontend).
- [Trazabilidad OpenSpec tardía] → mitigar con change retroactivo coherente con el estado real y referencias a evidencia/commit.
- [Riesgo de exponer secretos en documentación] → revisar que no haya credenciales ni `DATABASE_URL` reales; usar solo nombres de variables y placeholders.

## UI Mockups

- **Decision:** no (project policy / change no visual, 2026-11-16).
- **Mockups:** no aplica; GL-07 es despliegue y cierre documental. No se crea `design.md` visual adicional más allá de este registro.
