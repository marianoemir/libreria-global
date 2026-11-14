# Tasks

> **Cómo se verifica este change:** el repo no tiene framework de tests de frontend. Cada tarea se verifica con el comando indicado y su **salida real** (regla dura 17 de `AGENTS.md`): no vale «razonar» el resultado. Estos son los casos que se van a documentar como evidencia para GL-08, sin secretos ni datos reales.

## 1. Archivos de la imagen

- [x] 1.1 Verificar que `frontend/Dockerfile` tiene exactamente las cinco líneas del PDF (`FROM nginx:1.30-alpine`, `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`, `COPY public/ /usr/share/nginx/html/`, `COPY default.conf.template /etc/nginx/templates/default.conf.template`, `EXPOSE 80`) y crearlo solo si falta. Verificación: `Get-Content frontend\Dockerfile` muestra las cinco líneas en ese orden, sin líneas extra; si había que crearlo, queda igual al bloque del PDF.
- [x] 1.2 Verificar que `frontend/default.conf.template` coincide con el PDF y que la línea del proxy es `proxy_pass http://${API_UPSTREAM}/;` **con barra final**, y crearlo solo si falta. Verificación: `Select-String -Path frontend\default.conf.template -Pattern 'proxy_pass'` muestra `proxy_pass http://${API_UPSTREAM}/;` y `Select-String -Path frontend\default.conf.template -Pattern 'listen 80'` muestra `listen 80;`.
- [x] 1.3 Verificar que `frontend/.dockerignore` tiene las cinco líneas del PDF y luego `openspec`, `.opencode` y `docs` (ocho líneas en total, en ese orden), y crearlo solo si falta. Verificación: `(Get-Content frontend\.dockerignore).Count` devuelve `8` y `Get-Content frontend\.dockerignore` lista `.git`, `**/.env`, `**/.env.*`, `**/node_modules`, `**/.DS_Store`, `openspec`, `.opencode`, `docs`.
- [x] 1.4 Verificar la estructura pública: `frontend/public/index.html`, `frontend/public/css/styles.css` y `frontend/public/js/app.js` existen, y que no hay configuración ni archivos de entorno dentro de `public/`. Verificación: `Get-ChildItem frontend\public -Recurse -File | Select-Object FullName` lista solo esos archivos; `Get-ChildItem frontend\public -Recurse -Force -Filter ".env*"` no devuelve nada y `Get-ChildItem frontend\public -Recurse -Include "*.conf","*.template","Dockerfile"` tampoco.

## 2. Prerrequisitos

- [x] 2.1 Verificar que Docker responde en la máquina de desarrollo. Verificación: `docker info --format '{{.ServerVersion}}'` imprime una versión (por ejemplo `29.7.2`) y el comando no falla.
- [x] 2.2 Verificar que PostgreSQL escucha en el puerto 5432 de la máquina local (es una instalación local de Windows, no un contenedor: no usar `pg-libreria`). Verificación: `Get-NetTCPConnection -LocalPort 5432 -State Listen` devuelve al menos una fila en estado `Listen` (por ejemplo `LocalAddress ::`, `LocalPort 5432`, `State Listen`); si no devuelve nada, arrancar el servicio de PostgreSQL local.
- [x] 2.3 Verificar que el backend corre en `0.0.0.0:8000` con `DATABASE_URL` configurada (`uvicorn app.main:app --host 0.0.0.0 --port 8000` desde `backend/`). Verificación: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/health/ready` devuelve `200` y `curl.exe -s http://127.0.0.1:8000/health/ready` devuelve `{"estado":"listo"}`.
- [x] 2.4 Datos de prueba cargados (**ya ejecutado**: `python -m app.seed` sobre la base local `libreria_local`, 27 filas). Aviso para quien lo repita: el seed **borra y recarga las nueve tablas**; no correrlo sobre datos que se quieran conservar. Verificación: `curl.exe -s http://127.0.0.1:8000/libros/` muestra 5 libros.

## 3. Escenario 1 — la imagen se construye

- [x] 3.1 Construir la imagen desde `frontend/`. Verificación: `docker build -t libreria-frontend .` (ejecutado en `frontend/`) termina con código 0 y la línea final `naming to docker.io/library/libreria-frontend`.
- [x] 3.2 Comprobar que la imagen quedó registrada. Verificación: `docker image ls libreria-frontend` muestra una fila con el tag `latest` y el tamaño de la imagen.

## 4. Escenario 2 — proxy `/api` contra el backend real

- [x] 4.1 Ejecutar el contenedor publicado en loopback con el backend real. Verificación: `docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend` (en una terminal aparte o en segundo plano) deja el contenedor `Up`; `docker ps --filter "name=libreria-frontend" --format "{{.Status}}"` muestra `Up …`.
- [x] 4.2 Verificar la comprobación de salud del backend a través del proxy. Verificación: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/api/health/ready` devuelve `200` y `curl.exe -s http://127.0.0.1:8080/api/health/ready` devuelve `{"estado":"listo"}`.
- [x] 4.3 Verificar la página estática en la raíz. Verificación: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/` devuelve `200` y `curl.exe -s http://127.0.0.1:8080/` contiene `<html` (el `index.html` del parcial 1).
- [x] 4.4 Verificar la reescritura de la barra final del proxy (el contenido de los datos es de GL-03; acá solo importa el estado). Verificación: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/api/libros/` devuelve `200`, lo que prueba que el backend recibió `/libros/` con barra final.
- [x] 4.5 Detener el contenedor y comprobar que no queda ninguno en ejecución. Verificación: `docker stop libreria-frontend` devuelve el nombre del contenedor y después `docker ps --filter "name=libreria-frontend" --format "{{.Names}}"` no imprime nada.

## 5. Escenario 3 — backend caído: 502 y estáticos intactos

- [x] 5.1 Ejecutar el contenedor con un host resoluble y un puerto sin backend. Verificación: `docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8001 libreria-frontend` deja el contenedor `Up` (no usar un host inexistente: Nginx no arrancaría); `docker ps --filter "name=libreria-frontend" --format "{{.Status}}"` muestra `Up …`.
- [x] 5.2 Verificar el error del proxy. Verificación: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/api/libros/` devuelve `502`.
- [x] 5.3 Verificar que el contenedor sigue vivo y que la página estática igual carga. Verificación: `docker ps --filter "name=libreria-frontend" --format "{{.Status}}"` sigue mostrando `Up …` y `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/` devuelve `200`.
- [x] 5.4 Detener el contenedor. Verificación: `docker stop libreria-frontend` devuelve el nombre y `docker ps --filter "name=libreria-frontend" --format "{{.Names}}"` no imprime nada.

## 6. Escenario 4 — contenido de la imagen

- [x] 6.1 Verificar que el sitio está en la raíz web de Nginx dentro de la imagen. Verificación: `docker run --rm --entrypoint sh libreria-frontend -c 'ls -A /usr/share/nginx/html'` muestra `index.html`, `css` y `js`; puede mostrar además archivos propios de la imagen base de Nginx (por ejemplo `50x.html`), así que no se exige que sean los únicos. La ausencia de material de proceso se comprueba en 6.2.
- [x] 6.2 Verificar que el material de proceso no está en la imagen. Verificación: `docker run --rm --entrypoint sh libreria-frontend -c 'find /usr/share/nginx/html -name openspec -o -name docs -o -name .opencode'` no imprime ninguna línea (salida vacía = sin coincidencias). Usar comillas simples: en PowerShell las comillas dobles expanden `$?` y otras variables antes de llegar al contenedor.
- [x] 6.3 Verificar que la plantilla del proxy se copió a la imagen. Verificación: `docker run --rm --entrypoint sh libreria-frontend -c "ls /etc/nginx/templates"` imprime `default.conf.template`.

## 7. Cierre del change

- [x] 7.1 Validar los artefactos del change. Verificación: `openspec validate "gl-01-monorepo-docker-frontend" --strict` no reporta errores ni advertencias y `openspec status --change "gl-01-monorepo-docker-frontend" --json` muestra los cuatro artefactos en `done`.
- [x] 7.2 Registrar la evidencia para GL-08 con la salida real de cada escenario (comandos y resultados de las tareas 3.1, 4.2, 4.3, 4.4, 5.2, 5.3 y 6.1 a 6.3), sin secretos ni datos reales. Verificación: la evidencia cita el comando y su salida tal como se obtuvo; ninguna captura contiene `DATABASE_URL` ni credenciales.

## Workflow follow-up

- Marcar `[x]` en `CHANGES.md` (GL-01) **solo después de archivar** el change; no hacerlo antes.
- Commit en la rama `feature/gl-01-monorepo-docker-frontend` con mensaje convencional (`feat:` o `chore:`), y PR con «Create a merge commit» **solo con pedido explícito** de la persona (regla dura 16). Nada de esto se hace en el apply.
- GL-02 (`cliente-http`) puede arrancar cuando GL-01 esté archivado y mergeado: hasta entonces esa persona no tiene imagen contra la cual probar `fetch("/api/...")`.
