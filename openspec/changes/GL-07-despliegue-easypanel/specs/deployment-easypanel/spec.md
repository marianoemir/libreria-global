# Spec Delta

## Purpose

Documenta el despliegue integrado del frontend y backend de la librería en Easypanel, accesible por HTTPS mediante el frontend, con proxy interno hacia la API, persistencia de datos y sin exposición pública del backend.

## ADDED Requirements

### Requirement: Despliegue integrado en Easypanel

El sistema MUST desplegarse en Easypanel como dos servicios del mismo proyecto (`grupo10`): frontend construido desde `/frontend` y backend construido desde `/backend`, con el frontend sirviendo la interfaz y reenviando `/api/` al backend interno.

#### Scenario: Servicios y proxy configurados

- **WHEN** se revisa la configuración documentada del despliegue
- **THEN** `DEPLOY.md` registra el frontend y backend con sus Build Paths, el dominio HTTPS del frontend `https://libreria.marianochirino.me`, el proxy `/api/` y la variable `API_UPSTREAM` apuntando al servicio interno del backend

#### Scenario: Imagen del frontend construida en Easypanel

- **WHEN** se realiza el despliegue del frontend en Easypanel
- **THEN** existe evidencia explícita del build exitoso del frontend (log/captura de build). *Pendiente de agregar evidencia en este cierre documental.*

### Requirement: Salud y acceso público por el frontend

La aplicación MUST ser accesible públicamente por HTTPS a través del frontend y exponer el estado listo de la API mediante el prefijo `/api/health/ready`.

#### Scenario: Endpoint de salud disponible vía URL pública

- **WHEN** se consulta `https://libreria.marianochirino.me/api/health/ready`
- **THEN** la API responde estado listo. Evidencia disponible: `evidencia/g07-health-tras-borrar-dominio.txt` (`{"estado":"listo"}`); falta evidencia con código HTTP 200 explícito.

#### Scenario: Catálogo accesible con datos reales

- **WHEN** se consulta `https://libreria.marianochirino.me/api/libros/?limit=2`
- **THEN** la respuesta contiene datos reales del catálogo. Evidencia disponible: `evidencia/g07-persistencia-tras-redeploy.txt`.

### Requirement: Persistencia de datos tras redeploy

Los datos del negocio MUST persistir tras redesplegar el backend, almacenándose en la base PostgreSQL configurada y no en el contenedor del backend.

#### Scenario: Datos disponibles después de un redeploy

- **WHEN** el backend es redesplegado y se vuelve a consultar la API pública
- **THEN** los registros previamente cargados siguen disponibles. Evidencia disponible: `evidencia/g07-persistencia-tras-redeploy.txt`; documentación en `DEPLOY.md` (base `grupo10_db`).

### Requirement: Backend no expuesto públicamente

El backend MUST permanecer inaccesible desde internet de forma directa; el acceso externo a la API se realiza únicamente a través del proxy `/api/` del frontend.

#### Scenario: Ruta sin prefijo `/api` no llega al backend

- **WHEN** se solicita `https://libreria.marianochirino.me/libros/` (sin `/api/`)
- **THEN** el servidor web del frontend responde 404 y la petición no es atendida por FastAPI. Evidencia disponible: `evidencia/g07-sin-api-404.txt`.

#### Scenario: Sin dominio/puerto público del backend

- **WHEN** se revisa la exposición de red y dominios del despliegue
- **THEN** no existe acceso público directo al backend y solo 80/443 permanecen publicados externamente. Evidencia disponible: `evidencia/g07-backend-sin-dominio.txt`, `evidencia/g07-backend-dominio-antes.txt`, `evidencia/g07-docker-ps.txt`, `evidencia/g07-backend-domains-vacio.png` y `DEPLOY.md`.

### Requirement: Esquema de base sin Alembic

El backend MUST crear las tablas con `create_all` al iniciar; no se requiere Alembic para este despliegue, según confirmación de la cátedra del 16/11/2026.

#### Scenario: Decisión documentada

- **WHEN** se consulta la documentación de despliegue y decisiones del proyecto
- **THEN** `DEPLOY.md` y `README.md` registran que las tablas se crean con `create_all` al iniciar y que la cátedra confirmó que no se requiere Alembic, sin mención de consulta pendiente. Evidencia adicional pendiente: `evidencia/g07-consulta-alembic.png`.
