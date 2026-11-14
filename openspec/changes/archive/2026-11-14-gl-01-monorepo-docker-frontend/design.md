# Design

## Context

Ver `proposal.md` para la motivación. El estado que condiciona el diseño:

- El frontend del parcial 1 ya está separado en `frontend/public/` (`index.html`, `css/styles.css`, `js/app.js`) y convive con el material del parcial 1 (`openspec/`, `.opencode/`, `docs/`, `README.md`) dentro de `frontend/`.
- `frontend/Dockerfile` y `frontend/default.conf.template` son, a hoy, idénticos al Ejercicio 4 de `docs/Consignas_Global.pdf`; `frontend/.dockerignore` tiene esas cinco líneas más `openspec`, `.opencode` y `docs`, como pide `CHANGES.md` (GL-01).
- `AGENTS.md` fija el orden de precedencia: consigna (PDF) > reglas duras > knowledge-base > skills. El PDF manda sobre cualquier preferencia de estilo de imagen.
- El contrato de la API (`docs/CONTRATO-API.md`) distingue rutas con barra final (`/libros/`) de rutas por ID sin barra (`/libros/3`), y el JS solo conoce el prefijo `/api`.
- El despliegue destino es Easypanel con dos servicios App del mismo proyecto y Build Path `/frontend` (GL-07), donde la red interna resuelve el backend por nombre de servicio.
- La verificación del proyecto es por salida real de comandos, no por tests automatizados (regla dura 17 de `AGENTS.md`).

Los requisitos observables están en `specs/frontend-container-image/spec.md`; este documento no los repite.

## Goals / Non-Goals

**Goals:**

- Una única imagen del frontend que sirva los estáticos y haga de proxy `/api` hacia un backend cuya dirección se define al arrancar, sin recompilar entre local y Easypanel.
- Dejar la imagen lista para el Build Path `/frontend` de GL-07 sin cambios de archivos.
- Que el apply sea «copiar y verificar»: los tres archivos existen ya y solo se comprueba su contenido y su comportamiento.

**Non-Goals:**

- Cambiar el HTML, el CSS o el JS del parcial 1 (GL-02 a GL-05).
- Resolver CORS en el backend (GL-06): con el proxy, el navegador habla con el mismo origen y no hace falta.
- Configurar Easypanel, dominios, TLS o variables de entorno del despliegue (GL-07).
- Introducir Docker Compose, pipeline de CI, HEALTHCHECK, usuario no-root o balanceo de carga: nada de eso está en el Ejercicio 4 ni en el scope de GL-01.
- Servir la API desde el mismo contenedor del frontend.

## Decisions

### 1. Contexto de build = `frontend/`, no la raíz del monorepo

El build se ejecuta desde `frontend/` con `.` como contexto. Es coherente con las rutas `COPY public/ …` y `COPY default.conf.template …` del PDF, que son relativas a `frontend/`, y con el Build Path `/frontend` que usará Easypanel en GL-07.

Alternativa descartada: contexto en la raíz del repo con `COPY frontend/public/ …` y `COPY frontend/default.conf.template …`. Se rechaza porque el PDF es la consigna y sus rutas son explícitas; además el contexto pasaría a ser todo el monorepo (backend incluido) y habría que ampliar el `.dockerignore` para no enviarlo al daemon.

### 2. Dockerfile idéntico al PDF, sobre la imagen oficial pinneada `nginx:1.30-alpine`

Cinco instrucciones (`FROM`, `ENV`, los dos `COPY`) con `EXPOSE 80` como puerto interno; la publicación se decide con `-p` al ejecutar (`-p 127.0.0.1:8080:80`). La imagen base se usa tal como la fija el PDF, sin construir una imagen propia desde Alpine.

Alternativas descartadas: `nginx:alpine` sin versión (el PDF fija 1.30 y un tag flotante rompería la reproducibilidad de la cátedra); imagen propia con `FROM alpine` + instalación manual de Nginx y entrypoint propio (más superficie y se aparta del PDF); build multi-stage (no hay compilación que hacer: son archivos estáticos y una plantilla).

Consecuencia asumida: el tag `1.30-alpine` no se parchea solo; se mantiene por consigna y se revisa en GL-07.

### 3. Configuración del proxy por plantilla y `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`

La imagen oficial de Nginx procesa los archivos de `/etc/nginx/templates/*.template` con `envsubst` al arrancar y escribe el resultado en `/etc/nginx/conf.d/default.conf`. El Dockerfile copia la plantilla a ese directorio y limita la sustitución a `API_UPSTREAM` con el filtro.

Motivo del filtro: sin él, `envsubst` reemplazaría cualquier `$variable` de la configuración de Nginx (por ejemplo `$uri` de `try_files`) por el valor —o por vacío— de la variable de entorno homónima, rompiendo la configuración. El filtro restringe la sustitución a la variable que nos interesa y evita inyectar el resto del entorno del contenedor en la config.

Consecuencia buscada: la misma imagen sirve en local (`API_UPSTREAM=host.docker.internal:8000`) y en Easypanel (`API_UPSTREAM=<proyecto>_<servicio>:8000`, el nombre interno del servicio) sin reconstruir; solo cambia el valor de la variable al desplegar.

Alternativa descartada: hornear la dirección del backend en el `COPY` o en un `nginx.conf` fijo (obligaría a un build por entorno y violaría la regla de que el frontend no conoce la dirección del backend).

### 4. `proxy_pass http://${API_UPSTREAM}/;` con barra final

La barra final del `proxy_pass` hace que `/api/libros/` llegue a FastAPI como `/libros/`. Así se respetan las rutas del contrato, incluidas las barras finales, y el JS solo necesita el prefijo `/api`: `fetch("/api/libros/")`.

Alternativas descartadas: `rewrite ^/api/(.*)$ /$1 break;` (equivalente en efecto pero el PDF fija la plantilla, y un `rewrite` mal escrito cambia la semántica de la barra); `sub_filter` sobre el HTML (frágil, no es un proxy y no aplica a `fetch`); exponer la API en otro puerto y llamarla desde el navegador (rompe el mismo origen y obliga a CORS, que es GL-06).

### 5. `.dockerignore` = cinco líneas del PDF + `openspec`, `.opencode`, `docs`

Se mantienen las cinco líneas del PDF tal cual y se agregan las tres carpetas de material del parcial 1. Aunque el Dockerfile solo copia `public/` y la plantilla, la exclusión evita mandar documentación y material de proceso al daemon y protege el build si alguien agrega un `COPY .` más adelante.

Alternativa descartada: dejar solo las cinco líneas del PDF. Se rechaza porque `CHANGES.md` (GL-01) pide explícitamente las tres extra y el repo las justifica: esas carpetas viven dentro de `frontend/`.

### 6. Publicación solo en loopback y sin `--add-host` en Docker Desktop

Se ejecuta con `-p 127.0.0.1:8080:80`, que es lo que muestra el PDF y lo que replica `docs/ARRANQUE.md` §4: el puerto queda accesible solo desde la máquina de desarrollo. La línea `--add-host=host.docker.internal:host-gateway` se omite porque el propio PDF la excluye en Docker Desktop (en Windows y macOS `host.docker.internal` ya resuelve) y `ARRANQUE.md` §4 no la usa.

Alternativa descartada: publicar en todas las interfaces (`-p 8080:80`) para probar desde otro dispositivo: expone el frontend en la red local sin necesidad y no es lo que pide la consigna.

### 7. Sin Compose, sin HEALTHCHECK, sin usuario no-root, sin tocar el frontend del parcial 1

Todo eso queda fuera del Ejercicio 4 y del scope declarado de GL-01 en `CHANGES.md`. Agregarlo sería inventar alcance y, en el caso del HEALTHCHECK o del usuario no-root, adelantar decisiones de despliegue que corresponden a GL-07.

### 8. Verificación por comandos reales, con salida adjunta

No hay framework de tests de frontend en el repo. La verificación son los comandos del `tasks.md` ejecutados contra el backend real con seed, más `curl.exe` para los códigos de estado; la salida real se registra como evidencia para GL-08. Es la política del proyecto (regla dura 17) y lo que el revisor puede reproducir.

## Risks / Trade-offs

- [Nginx resuelve `API_UPSTREAM` al arrancar: un host que no resuelve impide arrancar el contenedor, no da 502] → Usar siempre `host:puerto` válidos; para el escenario de 502 usar un host resoluble con un puerto cerrado (`host.docker.internal:8001`), nunca un host inexistente.
- [Sin `API_UPSTREAM`, `envsubst` deja una URL de proxy inválida y Nginx no arranca] → Definirla siempre: en local con `-e` y en Easypanel como variable del servicio; dejarlo documentado como paso obligatorio en GL-07.
- [Imagen «vieja»: `public/` se copia en el build, así que los cambios de HTML/CSS/JS no se ven hasta reconstruir] → Reconstruir tras cada cambio de `public/` en local y redesplegar en Easypanel (GL-07); `docs/ARRANQUE.md` §4 ya lo advierte.
- [Con la API caída el proxy devuelve 502 y el usuario ve una interfaz sin datos] → Es el comportamiento esperado de este change; GL-02 debe traducir ese 502 a un estado de error de conexión con «Reintentar».
- [El tag `nginx:1.30-alpine` no recibe parches de seguridad automáticos] → Se mantiene por consigna y se revisa en GL-07; si se actualiza, se hace con un change propio, no en este.
- [El contenedor corre como root, que es el default de la imagen oficial] → Aceptado por el PDF; revisarlo en GL-07 si el despliegue lo exige.
- [Una barra final mal puesta en `proxy_pass` rompería las rutas del contrato de forma silenciosa] → La tarea de verificación comprueba literalmente `proxy_pass http://${API_UPSTREAM}/;` y llama a `/api/libros/` esperando 200 a través del proxy.

## Migration Plan

- No hay migración de datos ni cambios de esquema: la imagen es stateless y no escribe nada.
- Build: `docker build -t libreria-frontend .` desde `frontend/`.
- Run: `docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend`.
- Rollback: detener el contenedor (`docker stop libreria-frontend`) y, si hiciera falta, volver a la imagen o al tag anterior; no hay estado persistente que restaurar.
- El despliegue real (servicios en Easypanel, variables y redeploy) es GL-07 y no forma parte de este plan.

## Open Questions

Ninguna de estas cambia la spec, el enfoque ni las tareas de este change:

- `public/img/` aparece en el árbol del PDF pero no existe en el parcial 1. ¿Habrá imágenes? No afecta al Dockerfile, que copia `public/` completo; si se agregan, se reconstruye la imagen.
- ¿Agregar un `HEALTHCHECK` al contenedor? El PDF no lo pide; se decide en GL-07, cuando se conozca cómo monitorea Easypanel.
- ¿Publicar el puerto 8080 solo en loopback o en todas las interfaces? Se sigue el PDF (loopback) en local; el puerto expuesto en producción lo define GL-07.
- El PDF ejecuta `alembic upgrade head` y este backend crea las tablas con `create_all` (pregunta abierta PA-1 de `CHANGES.md`). No afecta a GL-01 —el contenedor del frontend no toca la base— y se resuelve en GL-07.

## UI Mockups

Decision: no (no UI). Este change no modifica pantallas, componentes, estilos ni interacciones: solo empaqueta en una imagen los archivos estáticos existentes del parcial 1 y configura el proxy `/api` del servidor.
