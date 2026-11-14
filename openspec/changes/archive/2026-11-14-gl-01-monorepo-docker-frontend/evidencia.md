# Evidencia — GL-01 monorepo-docker-frontend

> **Salidas reales de herramienta** (regla dura 17 de `AGENTS.md`): cada bloque de abajo es la salida tal como se obtuvo en la máquina de desarrollo, no un resultado razonado. El único recorte aplicado es el ruido de progreso del `docker build` (descarga y extracción de capas); ningún resultado se descartó.
>
> Este archivo **no contiene secretos**: no hay `DATABASE_URL`, credenciales ni datos reales. Los datos de prueba son los ficticios del seed.

## Entorno de ejecución

- Fecha y hora: 2026-11-14 07:38:13 -03:00 (Windows, PowerShell).
- `docker --version` → `Docker version 29.7.2, build a7dcaa6`.
- `docker info --format '{{.ServerVersion}}'` → `29.7.2` (exit 0).
- Backend de la librería corriendo localmente en `0.0.0.0:8000` (no es contenedor); PostgreSQL local escuchando en el puerto 5432 (PID 6024, no es contenedor).
- Imagen construida: `sha256:8f0155e532ac9dcf5adf630e88df3c3e4c524c316b9c058fad5ef2f09412073d` (ID corto `8f0155e532ac`), `CONTENT SIZE 26.1MB`. Creada 2026-11-14T10:36:56Z.

## 1. Archivos de la imagen

### `Get-Content frontend\Dockerfile`

```
FROM nginx:1.30-alpine
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
COPY public/ /usr/share/nginx/html/
COPY default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
```

Cinco líneas, en el orden del PDF, sin líneas extra.

### `Select-String -Path frontend\default.conf.template -Pattern 'proxy_pass','listen 80','root /usr/share/nginx/html','try_files'`

```
frontend\default.conf.template:2:    listen 80;
frontend\default.conf.template:3:    root /usr/share/nginx/html;
frontend\default.conf.template:7:        try_files $uri $uri/ =404;
frontend\default.conf.template:11:        proxy_pass http://${API_UPSTREAM}/;
```

La línea del proxy tiene la **barra final** exigida (`proxy_pass http://${API_UPSTREAM}/;`).

### `(Get-Content frontend\.dockerignore).Count` y `Get-Content frontend\.dockerignore`

```
8
```

```
.git
**/.env
**/.env.*
**/node_modules
**/.DS_Store
openspec
.opencode
docs
```

Ocho líneas, en el orden del PDF más `openspec`, `.opencode` y `docs`.

### `Get-ChildItem frontend\public -Recurse -File | Select-Object -ExpandProperty FullName`

```
C:\Users\Mariano_Chirino\Documents\GitHub\libreria-global\frontend\public\index.html
C:\Users\Mariano_Chirino\Documents\GitHub\libreria-global\frontend\public\css\styles.css
C:\Users\Mariano_Chirino\Documents\GitHub\libreria-global\frontend\public\js\app.js
```

Tres archivos, los esperados. Además:

- `Get-ChildItem frontend\public -Recurse -Force -Filter ".env*"` → sin salida.
- `Get-ChildItem frontend\public -Recurse -Force -Include "*.conf","*.template","Dockerfile"` → sin salida.

## 2. Prerrequisitos

### Docker responde

`docker info --format '{{.ServerVersion}}'`

```
29.7.2
```

exit 0.

### PostgreSQL escucha en 5432

`Get-NetTCPConnection -LocalPort 5432 -State Listen` **no devolvió filas** en este equipo (`CimJobException: ... no encontró objetos`), así que la comprobación se hizo con tres fuentes equivalentes, todas con salida real:

`netstat -ano | Select-String ":5432"` (recorte de las filas relevantes)

```
  TCP    [::]:5432              [::]:0                 CLOSED          6024
  TCP    [::1]:5432             [::1]:29361            ESTABLISHED     26088
```

`Get-Process -Id 6024` → `Id: 6024`, `ProcessName: postgres`.

`Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet` → `True`
`Test-NetConnection -ComputerName ::1 -Port 5432 -InformationLevel Quiet` → `True`

PostgreSQL local (PID 6024) acepta conexiones TCP en 5432 sobre IPv4 e IPv6, y hay conexiones establecidas contra ese puerto desde el PID 26088 (el backend). El escenario que pide la tarea queda verificado aunque el cmdlet CIM no reporte el estado `Listen`.

### Backend responde en 8000

`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/health/ready`

```
200
```

`curl.exe -s http://127.0.0.1:8000/health/ready`

```
{"estado":"listo"}
```

`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/libros/` → `200`
`(curl.exe -s http://127.0.0.1:8000/libros/ | ConvertFrom-Json).Count` → `5`

## 3. Escenario 1 — la imagen se construye

### `docker build -t libreria-frontend .` (desde `frontend/`)

Exit code: `0`. Salida (se omiten únicamente las líneas de progreso de descarga y extracción de capas):

```
#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 219B done
#1 DONE 0.0s
#2 [internal] load metadata for docker.io/library/nginx:1.30-alpine
#2 DONE 2.0s
#3 [internal] load .dockerignore
#3 transferring context: 116B done
#3 DONE 0.0s
#4 [1/3] FROM docker.io/library/nginx:1.30-alpine@sha256:901e593c95dc85f5a729f5765516321366ef4ac401821431d408897e95287d0a
#4 DONE 4.3s
#5 [internal] load build context
#5 transferring context: 58.28kB 0.1s done
#5 DONE 0.1s
#6 [2/3] COPY public/ /usr/share/nginx/html/
#6 DONE 0.1s
#7 [3/3] COPY default.conf.template /etc/nginx/templates/default.conf.template
#7 DONE 0.1s
#8 exporting to image
#8 exporting layers 0.1s done
#8 exporting manifest sha256:cdcf0a359a20828d3792b4e70525a555fa693d746c3a73373d382cf0fdabcecb 0.0s done
#8 exporting config sha256:2013e84f557a156002464c629c5fc9ab4698651c43f33042fcab1922baa725e5 0.0s done
#8 exporting attestation manifest sha256:36d9dc3b2414a7c809e707723fab15ac66c6542ba279bdbc71ae8318c0ef26f9 0.0s done
#8 exporting manifest list sha256:8f0155e532ac9dcf5adf630e88df3c3e4c524c316b9c058fad5ef2f09412073d 0.0s done
#8 naming to docker.io/library/libreria-frontend:latest done
#8 unpacking to docker.io/library/libreria-frontend:latest 0.1s done
#8 DONE 0.3s
View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/0purn7x3yluw911rxps6wmc6a
```

Nota: el contexto de build transferido es `58.28kB`, coherente con el `.dockerignore` (sin `docs/`, `openspec/` ni `.opencode/`).

### `docker image ls libreria-frontend`

```
IMAGE                      ID             DISK USAGE   CONTENT SIZE   EXTRA
libreria-frontend:latest   8f0155e532ac       92.8MB         26.1MB
```

`docker image inspect libreria-frontend --format 'ID={{.Id}} SIZE={{.Size}} ...'`

```
ID=sha256:8f0155e532ac9dcf5adf630e88df3c3e4c524c316b9c058fad5ef2f09412073d SIZE=26093047 CREATED=2026-11-14T10:36:56.450798769Z
```

## 4. Escenario 2 — proxy `/api` contra el backend real

### `docker run -d --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend`

```
954cd42beaf9eaf00dad77e1ddd5141543530b91bdc310a290cc74b42ea6afe4
```

`docker ps --filter "name=libreria-frontend" --format "{{.Status}}"`

```
Up 4 seconds
```

### `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/api/health/ready`

```
200
```

`curl.exe -s http://127.0.0.1:8080/api/health/ready`

```
{"estado":"listo"}
```

El cuerpo es el del backend real: el proxy funciona con la dirección inyectada al arrancar.

### `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/`

```
200
```

`curl.exe -s http://127.0.0.1:8080/` (primeras líneas)

```
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Librería Apolo Cono Sur — Catálogo</title>
  <link rel="stylesheet" href="css/styles.css">
  <script defer src="js/app.js?v=4"></script>
```

Contiene `<html` y entrega las rutas **relativas** de CSS y JavaScript.

### `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/api/libros/`

```
200
```

`(curl.exe -s http://127.0.0.1:8080/api/libros/ | ConvertFrom-Json).Count` → `5`

El 200 prueba que la petición llegó al backend como `/libros/` **con la barra final** (si el proxy perdiera la barra, FastAPI respondería 307/404).

### `docker stop libreria-frontend`

```
libreria-frontend
```

`docker ps --filter "name=libreria-frontend" --format "{{.Names}}"` → sin salida.

## 5. Escenario 3 — backend caído: 502 y estáticos intactos

Se usa `host.docker.internal:8001`: host resoluble, puerto sin backend (con un host inexistente Nginx no arrancaría y el escenario sería falso).

### `docker run -d --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8001 libreria-frontend`

```
48239179e4a95d31d5d74e9136933ca12e5d0038392d76b31588609fe252e480
```

`docker ps --filter "name=libreria-frontend" --format "{{.Status}}"`

```
Up 4 seconds
```

### `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/api/libros/`

```
502
```

### El contenedor sigue vivo y la página estática carga

`docker ps --filter "name=libreria-frontend" --format "{{.Status}}"`

```
Up 4 seconds
```

`curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/`

```
200
```

### `docker stop libreria-frontend`

```
libreria-frontend
```

`docker ps --filter "name=libreria-frontend" --format "{{.Names}}"` → sin salida.

## 6. Escenario 4 — contenido de la imagen

### `docker run --rm --entrypoint sh libreria-frontend -c 'ls -A /usr/share/nginx/html'`

```
50x.html
css
index.html
js
```

`index.html`, `css` y `js` presentes. `50x.html` es propio de la imagen base de Nginx y la spec lo admite expresamente.

### `docker run --rm --entrypoint sh libreria-frontend -c 'find /usr/share/nginx/html -name openspec -o -name docs -o -name .opencode'`

Sin salida (ninguna coincidencia): el material de proceso no viaja en la imagen.

### `docker run --rm --entrypoint sh libreria-frontend -c 'ls /etc/nginx/templates'`

```
default.conf.template
```

### Comprobación adicional — la sustitución ocurre al arrancar, no en el build

`docker run --rm --entrypoint sh libreria-frontend -c 'head -12 /etc/nginx/conf.d/default.conf'` (imagen sin arrancar)

```
server {
    listen       80;
    server_name  localhost;

    #access_log  /var/log/nginx/host.access.log  main;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }
```

La imagen contiene el `default.conf` de la imagen base de Nginx, **sin** `proxy_pass` ni dirección del backend.

`docker exec libreria-frontend cat /etc/nginx/conf.d/default.conf` (contenedor en ejecución con `API_UPSTREAM=host.docker.internal:8000`)

```
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://host.docker.internal:8000/;
    }
}
```

El archivo se genera desde `default.conf.template` al arrancar el contenedor y es el único lugar donde aparece la dirección del backend. La misma imagen sirve contra cualquier backend cambiando solo `API_UPSTREAM`.

## 7. Cierre del change

### `openspec validate "gl-01-monorepo-docker-frontend" --strict`

```
Change 'gl-01-monorepo-docker-frontend' is valid
```

exit 0, sin errores ni advertencias.

### `openspec status --change "gl-01-monorepo-docker-frontend" --json`

Los cuatro artefactos en `done`:

```
proposal: done
specs: done
design: done
tasks: done
```

`isPlanningComplete: true`, `isComplete: true`.

## Estado final de las tareas

Todas las tareas de `tasks.md` (`1.1` a `1.4`, `2.1` a `2.4`, `3.1` a `3.2`, `4.1` a `4.5`, `5.1` a `5.4`, `6.1` a `6.3`, `7.1` a `7.2`) quedaron en `[x]`, cada una respaldada por la salida real registrada arriba.

Desvíos respecto de la letra de `tasks.md`, con su justificación:

1. **`docker run` con `-d`** en lugar de «terminal aparte»: `-d` es la forma en segundo plano del mismo comando; se conservaron `--rm`, el nombre y la publicación en loopback.
2. **2.2 sin filas de `Get-NetTCPConnection`**: el cmdlet no reporta el listener de PostgreSQL en este equipo; la escucha en 5432 se verificó con `netstat`, el proceso `postgres` (PID 6024) y `Test-NetConnection` (ver sección 2).
3. **`50x.html` presente** en la raíz web: archivo de la imagen base de Nginx, admitido explícitamente por la spec.
4. **6.3 con comillas dobles** (`-c "ls /etc/nginx/templates"`) siguiendo el texto de la tarea: ese comando no contiene `$`, así que la expansión de PowerShell no lo afecta; el resto de las ejecuciones dentro del contenedor usó comillas simples.
5. **Sección 6 adicional**: se agregó la comprobación de `/etc/nginx/conf.d/default.conf` para evidenciar que la sustitución de `API_UPSTREAM` ocurre en tiempo de arranque. No corresponde a una tarea nueva ni cambia el alcance.

No se modificó `frontend/Dockerfile`, `frontend/default.conf.template` ni `frontend/.dockerignore` (ya coincidían con lo exigido y las tareas solo pedían crearlos si faltaban). No se tocó `backend/` ni `frontend/public/`. No se ejecutó el seed (2.4 ya estaba hecha) ni se detuvo el backend.
