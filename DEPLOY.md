# DEPLOY.md — Despliegue en Easypanel

> **Esqueleto a completar en GL-07/GL-08.** `COMPLETAR` = dato real del grupo. **Nunca** escribas contraseñas, `DATABASE_URL` reales ni tokens: solo los **nombres** de las variables.

## Datos del despliegue

| Dato | Valor |
|---|---|
| URL pública del frontend | COMPLETAR (`https://…`) |
| Revisión desplegada (commit o tag de `main`) | COMPLETAR |
| Proyecto de Easypanel | COMPLETAR (ej. `grupo10`) |
| Base de datos | servicio PostgreSQL `grupo10_db` COMPLETAR si cambió |
| Fecha del último despliegue | COMPLETAR |

## Servicios

Dos servicios **App** del mismo proyecto, ambos desde este repositorio (rama `main`) con builder **Dockerfile**.

| | Backend | Frontend |
|---|---|---|
| Nombre del servicio | COMPLETAR (ej. `backend`) | COMPLETAR (ej. `frontend`) |
| Build Path | `/backend` | `/frontend` |
| Dockerfile | `backend/Dockerfile` | `frontend/Dockerfile` |
| Puerto del contenedor | 8000 | 80 |
| Dominio público | **ninguno** (red interna) | COMPLETAR, HTTPS, destino puerto 80 |

## Variables de entorno (solo nombres)

| Servicio | Variable | Descripción |
|---|---|---|
| backend | `DATABASE_URL` | PostgreSQL con driver `asyncpg`, host y puerto **internos** (ver Credentials del servicio de base) |
| backend | `CORS_ORIGINS` | Dominio HTTPS del frontend, con esquema y sin barra final |
| backend | `SQL_ECHO` | `false` |
| frontend | `API_UPSTREAM` | `<proyecto>_<servicio-backend>:8000` (host:puerto, sin `http://`) |

## Cómo se conectan

El navegador pide `https://<dominio>/api/libros/` al frontend. Nginx (`frontend/default.conf.template`) reenvía `/api/` a `http://${API_UPSTREAM}/`, quitando el prefijo, de modo que FastAPI recibe `/libros/`. El backend no es accesible desde internet.

## Migraciones y carga inicial

- **Esquema:** COMPLETAR según PA-1. Estado actual del backend: las tablas se crean al iniciar (`create_all`); no hay Alembic.
- **Carga inicial:** `python -m app.seed` en el Shell del servicio backend. **Reinicia las 9 tablas**: ejecutarlo solo con la base vacía o de pruebas. COMPLETAR si se ejecutó y cuándo.

## Verificación después de desplegar

1. `https://<dominio>/` carga la página.
2. `https://<dominio>/api/health/ready` responde 200.
3. El catálogo muestra los libros (datos reales desde la API).
4. Se registra una venta y aparece en el historial.
5. Tras redesplegar el backend, los datos siguen ahí (caso G-07).

## Cómo actualizar

1. Subir los cambios a `main`.
2. En Easypanel, **Deploy** del servicio modificado (backend y/o frontend).
3. Repetir la verificación anterior.

## Problemas conocidos y diagnóstico

| Síntoma | Qué revisar |
|---|---|
| Falla un `COPY` al construir | Build Path, nombres exactos, carpeta `public/` |
| `/api/` da 502 | logs del frontend, `API_UPSTREAM`, nombre interno, puerto, backend `Running` |
| `/api/health/ready` falla | logs del backend, `DATABASE_URL`, conexión a Postgres |
| 404 en una petición | prefijo `/api` y barra final de la ruta |
