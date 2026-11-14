# Proposal

## Why

El frontend del parcial 1 son archivos sueltos servidos desde el disco, sin forma reproducible de publicarse ni de hablar con la API: no hay imagen, no hay proxy `/api` y por lo tanto no se puede probar contra el backend real ni desplegar. Sin esa base no arranca GL-02 (cliente HTTP) ni GL-07 (despliegue en Easypanel), que son dependencias del cierre del Global.

## What Changes

- Dejar el frontend construible como imagen: `frontend/Dockerfile` y `frontend/default.conf.template` **idénticos al Ejercicio 4 del PDF** (`docs/Consignas_Global.pdf`), y `frontend/.dockerignore` con las cinco líneas del PDF más `openspec`, `.opencode` y `docs`.
- Confirmar la separación de archivos públicos en `frontend/public/` (`index.html`, `css/`, `js/`), con la configuración y los archivos de entorno fuera de `public/`, como pide el PDF.
- Verificar la imagen en local contra el backend real: `docker build` desde `frontend/`, `docker run` con `API_UPSTREAM` y comprobación de `http://127.0.0.1:8080/` (200) y de `/api/health/ready` (200) bajo ese mismo origen.
- Verificar el comportamiento de error del proxy (`/api/` responde 502 cuando el backend no está) y que `openspec/`, `.opencode/` y `docs/` no quedan dentro de la imagen.

No cambia el HTML, el CSS ni el JS del parcial 1: el contenido de la aplicación es de GL-02 en adelante.

## Capabilities

### New Capabilities

- `frontend-container-image`: la imagen del frontend (Nginx 1.30 Alpine) que sirve los archivos estáticos en el puerto 80 y reenvía `/api/` al backend indicado en runtime por `API_UPSTREAM`, con la reescritura de la barra final del contrato.

### Modified Capabilities

- Ninguna. `openspec/specs/` de la raíz está vacío (solo `.gitkeep`): no hay requisitos existentes que cambien.

## Impact

- **Archivos**: solo `frontend/` (`Dockerfile`, `.dockerignore`, `default.conf.template`, y la estructura `public/` ya movida). No se toca `backend/`, `docs/`, `CHANGES.md` ni `AGENTS.md`.
- **Sistemas**: requiere Docker Desktop para construir y ejecutar la imagen, y el backend local corriendo en `0.0.0.0:8000` con datos del seed para comprobar el proxy.
- **Habilita**: GL-02 (el JS ya puede usar `fetch("/api/...")` bajo el mismo origen) y GL-07 (Build Path `/frontend` en Easypanel).
- **Fuera de alcance**: reescritura del HTML/CSS/JS del parcial 1 (GL-02 a GL-05), CORS en el backend (GL-06), despliegue y variables de entorno en Easypanel (GL-07), Docker Compose, pipeline de CI, HEALTHCHECK y usuario no-root (no los pide el PDF).
- **Riesgo operativo**: `python -m app.seed` borra y recarga las nueve tablas; solo se corre sobre una base de pruebas.
