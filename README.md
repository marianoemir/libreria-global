# Librería — Global de Programación III

> **Esqueleto a completar en GL-08.** Los puntos marcados `COMPLETAR` los llena el grupo con datos reales. No poner contraseñas ni valores secretos.

**Grupo:** Grupo 10 · **Integrantes:** Mariano Chirino, COMPLETAR, COMPLETAR
**Materia:** Programación III — Tecnicatura Universitaria en Programación, UTN FRM
**URL desplegada:** https://libreria.marianochirino.me (salud: `/api/health/ready`). Debe seguir operativa durante la corrección.

## Qué es

Aplicación web de una librería: catálogo con búsqueda y paginación, alta de libros y clientes, registro de ventas e historial. El **frontend** (HTML, CSS y JavaScript nativos) se sirve con Nginx y consulta la **API** (FastAPI + PostgreSQL) por el prefijo `/api`. Se despliega en Easypanel como dos servicios.

## Estructura

```
frontend/   Imagen Nginx: Dockerfile, default.conf.template y public/ (index.html, css/, js/)
backend/    API FastAPI: Dockerfile, app/, requirements.txt, env.example
docs/       Consigna, contrato de la API, arquitectura, guías del equipo
evidencia/  Evidencia de los casos G-01 a G-07
```

## Cómo ejecutarlo en local

Requisitos: Docker Desktop y Python 3.12. Pasos detallados (con PowerShell) en `docs/ARRANQUE.md`; resumen:

1. Base de datos local: `docker run -d --name pg-libreria -e POSTGRES_PASSWORD=<contraseña-local> -e POSTGRES_DB=libreria -p 5432:5432 postgres:16`
2. Backend: desde `backend/`, crear el entorno virtual, `pip install -r requirements.txt`, definir `DATABASE_URL` (ver `backend/env.example`) y `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Esta terminal queda ocupada por el servidor.
3. Datos de prueba: con el backend ya iniciado (las tablas se crean al arrancar), en **otra terminal** y desde `backend/` con el entorno virtual activo: `python -m app.seed` (**borra y recarga las 9 tablas**; solo en una base de pruebas).
4. Frontend: desde `frontend/`, `docker build -t libreria-frontend .` y `docker run --rm -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend`.
5. Abrir `http://127.0.0.1:8080`.

## Variables de entorno (solo nombres)

| Servicio | Variable | Qué es |
|---|---|---|
| backend | `DATABASE_URL` | Cadena de conexión a PostgreSQL (`postgresql+asyncpg://…`) |
| backend | `CORS_ORIGINS` | Orígenes permitidos (dominio HTTPS del frontend), separados por coma |
| backend | `SQL_ECHO` | `false` en producción |
| frontend | `API_UPSTREAM` | `host:puerto` interno del backend para el proxy `/api/` |

## Decisiones de diseño

- **Los clientes se buscan por ID.** La API no ofrece un listado de clientes, así que la interfaz los consulta por `GET /clientes/{id}`, muestra el nombre antes de usarlos y recuerda en memoria los registrados o consultados durante la sesión.
- **Sin persistencia en el navegador.** No se usa `localStorage`: todo viene de la API; solo el borrador de la venta vive en memoria.
- **Conexión interna entre servicios.** El navegador solo habla con el frontend (`/api/...`); Nginx reenvía al backend por la red interna, que no tiene dominio público.
- **Sin migraciones.** Las tablas se crean al iniciar el backend (`create_all`). La cátedra confirmó que no se requiere Alembic.
- **Historial.** La API lo devuelve por ID ascendente: la venta más reciente está en la última página.

## Metodología

El trabajo se hizo con Spec-Driven Development (OpenSpec + Active Stack). Los changes del Global están en `CHANGES.md` y sus specs en `openspec/changes/archive/`; los del parcial 1 y del backend, en `frontend/openspec/` y `backend/openspec/`.

## Documentación

`DEPLOY.md` (despliegue) · `docs/CONTRATO-API.md` (API) · `docs/ARQUITECTURA-FRONTEND.md` · `evidencia/` (casos G-01 a G-07).
