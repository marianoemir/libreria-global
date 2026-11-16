# DEPLOY — Librería (Global, grupo10)

Despliegue en la VPS con Easypanel (Docker Swarm + Traefik). Este documento **no contiene credenciales**: solo nombres de variables.

## 1. Datos del despliegue

| Dato | Valor |
|---|---|
| URL pública | https://libreria.marianochirino.me/ |
| Fecha del despliegue | 16/11/2026 |
| Repositorio | `marianoemir/libreria-global`, rama `main` |
| Revisión desplegada | `ef9d19c` (verificar en Easypanel → servicio → Deployments) |
| Proyecto Easypanel | `grupo10` |
| Base de datos | servicio PostgreSQL `grupo10_db` (base `libreria`) |

## 2. Arquitectura

```
Internet ──443──> Traefik ──80──> frontend (Nginx) ──/api/──> grupo10_backend:8000 (FastAPI) ──5432──> grupo10_db (Postgres)
```

- Los únicos puertos publicados al exterior son **80 y 443** (Traefik). `ufw` permite 22, 80 y 443.
- El **backend no tiene dominio** en Easypanel ni puerto publicado en el host: solo es alcanzable por la red interna, a través del proxy `/api/` del frontend.
- La base `libreria` (usuario `libreria_app`) es independiente de la base de la calculadora, aunque comparten el servicio `grupo10_db`.

## 3. Servicios

| Servicio | Source (pestaña Github) | Build Path | Build | Puerto interno |
|---|---|---|---|---|
| `backend` | `marianoemir/libreria-global`, rama `main` | `/backend` | Dockerfile (`Dockerfile`) | 8000 |
| `frontend` | `marianoemir/libreria-global`, rama `main` | `/frontend` | Dockerfile (`Dockerfile`) | 80 |

- Dominio del frontend: `libreria.marianochirino.me`, HTTPS activado, destino HTTP puerto 80, path `/`.
- El backend no tiene dominios asignados (se borró el dominio autogenerado `*.easypanel.host`).
- Healthcheck del backend: `GET /health/ready`.

## 4. Proxy

Nginx del frontend reenvía `/api/` al backend usando `API_UPSTREAM`. Sin el prefijo `/api/` el pedido no llega a FastAPI (por ejemplo, `/libros/` responde 404 de Nginx).

## 5. Variables de entorno (solo nombres)

| Variable | Servicio | Descripción |
|---|---|---|
| `DATABASE_URL` | backend | URL de conexión, driver `postgresql+asyncpg`, base `libreria`. **Su valor no se versiona.** |
| `SQL_ECHO` | backend | `false` en producción. |
| `CORS_ORIGINS` | backend | Origen permitido: `https://libreria.marianochirino.me` (sin barra final). |
| `API_UPSTREAM` | frontend | Destino interno del proxy: `grupo10_backend:8000`. |

Los valores se cargan en la pestaña **Environment** de cada servicio, sin tildar «Create .env file».

## 6. Migraciones

**No hay Alembic.** La cátedra confirmó el 16/11/2026 que no se usa Alembic y que las tablas se crean con `create_all` al iniciar el backend. Cambiar el esquema de una tabla existente requiere hacerlo a mano en la base o recrearla.

## 7. Carga inicial (seed)

```
docker exec <contenedor-backend> python -m app.seed
```

- Se corrió **una sola vez** en producción el 16/11/2026 (27 filas: editorial 2, género 2, autor 5, libro 5, libro_autor 5, cliente 3, perfil_cliente 2, venta 1, renglón_venta 2).
- **Advertencia:** el seed reinicia la base. No volver a correrlo una vez cargados datos propios.

## 8. Cómo actualizar

1. Mergear los cambios a `main` en GitHub.
2. En Easypanel, abrir el servicio (`backend` y/o `frontend`) y pulsar **Deploy**. Se reconstruye la imagen desde `main`.
3. Esperar a que el backend figure `healthy` y verificar:
   - `curl.exe -I https://libreria.marianochirino.me/`
   - `curl.exe -s https://libreria.marianochirino.me/api/health/ready`
   - `curl.exe -s "https://libreria.marianochirino.me/api/libros/?limit=2"`

Los datos persisten tras redesplegar: viven en `grupo10_db`, no en el contenedor del backend.

## 9. Verificación después de desplegar

1. `https://libreria.marianochirino.me/` carga la página.
2. `https://libreria.marianochirino.me/api/health/ready` responde 200.
3. El catálogo muestra los libros (datos reales desde la API).
4. Se registra una venta y aparece en el historial.
5. Tras redesplegar el backend, los datos siguen ahí (caso G-07).
6. El backend no es accesible desde internet: sin dominio en Easypanel, sin puerto publicado en el host (`docker ps` muestra solo `8000/tcp`) y `https://libreria.marianochirino.me/libros/` (sin `/api/`) responde 404 de Nginx.

## 10. Problemas conocidos y diagnóstico

| Síntoma | Qué revisar |
|---|---|
| Falla un `COPY` al construir | Build Path, nombres exactos, carpeta `public/` |
| `/api/` da 502 | logs del frontend, `API_UPSTREAM`, nombre interno, puerto, backend `Running` |
| `/api/health/ready` falla | logs del backend, `DATABASE_URL`, conexión a Postgres |
| 404 en una petición | prefijo `/api` y barra final de la ruta |
| `ERR_CONNECTION_TIMED_OUT` en el navegador | La URL pública va sin puerto; `:8080` es solo del `docker run` local |

## 11. Backend del parcial 2 (contenedor `libreria`)

Contenedor aparte (`docker run`, puerto 8000 publicado) que usaba la misma base. Quedó **detenido** (`docker stop libreria`) el 16/11/2026 y no se reinicia solo. Para revivirlo habría que corregir la `DATABASE_URL` de su archivo de entorno y correr `docker start libreria`.

## 12. Evidencia

Carpeta `evidencia/`: capturas y salidas de comandos del despliegue (build del frontend en Easypanel, arranque de Nginx y del backend con las 9 tablas, `/api/health/ready` con HTTP 200, puerto 443, persistencia tras redeploy con `CORS_ORIGINS`, `docker ps`, backend sin dominio, 404 sin `/api/` y consulta a la cátedra por Alembic). Ninguna contiene credenciales. El detalle por caso está en `evidencia/LEEME.md`.
