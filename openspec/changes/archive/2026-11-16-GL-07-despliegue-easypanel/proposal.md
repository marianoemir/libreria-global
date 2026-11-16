# Proposal

## Why

GL-07 completa el despliegue del Global en Easypanel como cierre operativo del Ejercicio 5: el frontend y el backend deben funcionar integrados en una URL pública HTTPS, con el backend inaccesible desde internet y con persistencia de datos tras redespliegues. Este change se documenta de forma retroactiva porque la implementación y el despliegue ya se realizaron en la rama `feature/gl-07-despliegue-easypanel` (commit local `4ff66a0 "lo que faltaba"`).

## What Changes

- Documentar el despliegue en Easypanel (proyecto `grupo10`) del frontend (Nginx, Build Path `/frontend`) y backend (FastAPI, Build Path `/backend`) con proxy `/api/` desde el frontend.
- Registrar la URL pública `https://libreria.marianochirino.me`, la exposición pública limitada a 80/443 (Traefik), la ausencia de dominio/puerto público del backend y la carga inicial del seed realizada una sola vez en producción.
- Actualizar documentación de cierre (`DEPLOY.md`, `README.md`, `evidencia/LEEME.md`) con la decisión confirmada por la cátedra el 16/11/2026: no se usa Alembic; las tablas se crean con `create_all` al iniciar el backend.
- Recopilar evidencia disponible en `evidencia/g07-*` y dejar explícito lo que aún falta agregar.

## Capabilities

### New Capabilities

- `deployment-easypanel`: despliegue integrado frontend/backend en Easypanel, verificación pública por HTTPS, persistencia tras redeploy y aislamiento del backend.

### Modified Capabilities

- Ninguna.

## Impact

- Documentación y evidencia del monorepo: `DEPLOY.md`, `README.md`, `evidencia/LEEME.md`, `evidencia/g07-*`, `CHANGES.md` y artefactos OpenSpec de GL-07.
- Sin cambios de código en `backend/` ni `frontend/`.
- Sin credenciales, contraseñas ni `DATABASE_URL` reales en archivos versionados.
