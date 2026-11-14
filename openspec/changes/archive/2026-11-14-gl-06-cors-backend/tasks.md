# Tasks

> **Cómo se verifica este change:** `backend/requirements.txt` **no incluye pytest** y el backend no tiene suite automatizada; no se inventa una. La verificación es manual, con **`curl.exe`** contra el backend local con seed (`docs/ARRANQUE.md` §3) y su **salida real** (regla dura 17 de `AGENTS.md`): no vale «razonar» el resultado. Los artefactos de prueba del proyecto son los `.http` de `backend/test/` y **este change no los modifica**.
>
> En PowerShell `curl` es un alias de `Invoke-WebRequest`: hay que escribir **`curl.exe`** para obtener el `curl` real. Las pruebas se hacen contra `http://127.0.0.1:8000` (no `localhost`) para no depender de la resolución IPv4/IPv6.

## 1. Revisión del código existente (revisar, no reescribir)

- [x] 1.1 Revisar `backend/app/main.py` contra la spec: debe importar `CORSMiddleware` de `fastapi.middleware.cors` y `get_cors_origins` de `app.core.config`, y declarar `app.add_middleware(CORSMiddleware, allow_origins=get_cors_origins(), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])` **después** de `app = FastAPI(lifespan=lifespan)` y **antes** del primer `include_router`; ningún otro cambio en el archivo. Verificación: `Select-String -Path backend\app\main.py -Pattern 'CORSMiddleware','get_cors_origins','add_middleware','allow_credentials','allow_methods','allow_headers','include_router'` muestra las siete coincidencias y, en el orden del archivo, el bloque de `add_middleware` cae entre `app = FastAPI` y el primer `include_router`. Anotar cualquier desviación en `evidencia.md`.
- [x] 1.2 Revisar `backend/app/core/config.py`: `get_cors_origins()` lee `os.getenv("CORS_ORIGINS", "")`, separa por coma, recorta espacios (`strip`), quita la barra final (`rstrip("/")`), descarta las entradas vacías y devuelve `[]` cuando la variable falta o está vacía; no introduce valores por defecto ni un origen comodín. Verificación: `Select-String -Path backend\app\core\config.py -Pattern 'CORS_ORIGINS','rstrip','split'` muestra las líneas de la función y, con `$env:DATABASE_URL` ya definida (§2.3), `python -c "from app.core.config import get_cors_origins; print(get_cors_origins())"` ejecutado desde `backend` imprime `[]` cuando `CORS_ORIGINS` no está definida.
- [x] 1.3 Revisar `backend/env.example`: documenta `CORS_ORIGINS` con un comentario (formato: separada por comas, con esquema, sin barra final) y un valor de ejemplo con orígenes ficticios o locales; sin valores reales ni credenciales. Verificación: `Select-String -Path backend\env.example -Pattern 'CORS_ORIGINS' -Context 2,0` muestra el comentario y la clave; `Select-String -Path backend\env.example -Pattern 'password','secret','token','clave'` no devuelve secretos (la única coincidencia admisible es el usuario/clave de ejemplo de `DATABASE_URL`, que no es real).
- [x] 1.4 Confirmar la guarda de alcance: el change solo toca `backend/app/main.py`, `backend/app/core/config.py` y `backend/env.example`, y no agrega dependencias. Verificación: `git status --short` y `git diff --stat` no listan otros archivos de `backend/`; `Select-String -Path backend\requirements.txt -Pattern 'cors'` no devuelve nada (no se agregó ninguna dependencia: `CORSMiddleware` viene con `fastapi[standard]`).

## 2. Prerrequisitos — backend local con seed

- [x] 2.1 PostgreSQL local corriendo en Docker como `pg-libreria`. Verificación: `docker ps --filter "name=pg-libreria" --format "{{.Names}} {{.Status}}"` muestra `pg-libreria Up ...`; si no, `docker start pg-libreria` (o crearlo como indica `docs/ARRANQUE.md` §3.1).
- [x] 2.2 Entorno Python del backend listo, desde `backend`. Verificación: `cd backend`, `.\.venv\Scripts\Activate.ps1`, `python --version` imprime 3.12.x.
- [x] 2.3 `DATABASE_URL` definida en la sesión. Verificación: `$env:DATABASE_URL = "postgresql+asyncpg://postgres:dev@localhost:5432/libreria"` y `python -c "import os; print(bool(os.getenv('DATABASE_URL')))"` imprime `True` (no imprimir el valor: es el de ejemplo local de `ARRANQUE.md`, no un secreto real, pero igual no se pega en la evidencia).
- [x] 2.4 Backend levantado en `0.0.0.0:8000` desde `backend`. Verificación: `uvicorn app.main:app --host 0.0.0.0 --port 8000` deja la ventana ocupada y, en otra, `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/health/ready` devuelve `200`.
- [x] 2.5 Datos de prueba cargados (**solo sobre una base de pruebas**: `python -m app.seed` **borra y recarga las nueve tablas**). Verificación: `python -m app.seed` termina sin error y `curl.exe -s http://127.0.0.1:8000/libros/` muestra 5 libros.
- [x] 2.6 Revisar si hay un `CORS_ORIGINS` heredado antes de cada escenario. Verificación: `Select-String -Path backend\.env -Pattern '^CORS_ORIGINS'` y `$env:CORS_ORIGINS`. Si `backend/.env` define `CORS_ORIGINS` (el archivo copiado de `env.example` lo trae), `load_dotenv()` la carga y **el escenario 3 no se puede afirmar** sin comentarla; ver 5.1.

## 3. Escenario 1 — un origen listado recibe `access-control-allow-origin`

- [x] 3.1 Definir el origen permitido y reiniciar `uvicorn` (el valor se lee al importar `app.main`; sin reinicio no aplica). Verificación: en la sesión del backend, `$env:CORS_ORIGINS = "http://localhost:8080"`, detener `uvicorn` con `Ctrl+C` y volver a ejecutar `uvicorn app.main:app --host 0.0.0.0 --port 8000`; el arranque loguea `Arranque completado` sin errores.
- [x] 3.2 Solicitar el catálogo con el `Origin` permitido. Verificación: `curl.exe -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/` responde `HTTP/1.1 200 OK` e incluye exactamente `access-control-allow-origin: http://localhost:8080` (no `*`); con `curl.exe -s -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/ | Select-String "access-control-allow-origin"` la línea filtrada muestra el origen exacto.
- [x] 3.3 Confirmar que no se habilitan credenciales cruzadas. Verificación: `curl.exe -s -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/ | Select-String "access-control-allow-credentials"` no devuelve ninguna línea.

## 4. Escenario 2 — un origen no listado no recibe autorización

- [x] 4.1 Con el backend del §3 (`CORS_ORIGINS=http://localhost:8080`), pedir el catálogo desde un origen ajeno. Verificación: `curl.exe -i -H "Origin: http://evil.example" http://127.0.0.1:8000/libros/` responde `200 OK` y **no** incluye `access-control-allow-origin`; con `curl.exe -s -i -H "Origin: http://evil.example" http://127.0.0.1:8000/libros/ | Select-String "access-control-allow-origin"` la salida es vacía (sin coincidencias = no se autorizó el origen).

## 5. Escenario 3 — sin `CORS_ORIGINS` la API arranca y no autoriza ningún origen

- [x] 5.1 Quitar la variable de la sesión **y** del archivo `.env`, y reiniciar. Verificación: `Remove-Item Env:CORS_ORIGINS -ErrorAction SilentlyContinue`; luego `Select-String -Path backend\.env -Pattern '^CORS_ORIGINS'` no debe devolver nada — si devuelve la línea, comentarla en `backend/.env` (agregar `#` al inicio; el archivo está ignorado por Git) y restaurarla al final del change. Después, `Ctrl+C` en `uvicorn` y volver a `uvicorn app.main:app --host 0.0.0.0 --port 8000`: arranca igual, sin error de configuración.
- [x] 5.2 Comprobar que la salud responde sin la variable. Verificación: `curl.exe -i http://127.0.0.1:8000/health/ready` responde `200 OK` con el cuerpo `{"estado":"listo"}`.
- [x] 5.3 Comprobar que ningún origen queda autorizado. Verificación: `curl.exe -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/` responde `200 OK` con los libros y **sin** `access-control-allow-origin`; idem con `Origin: http://evil.example`. Con `curl.exe -s -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/ | Select-String "access-control-allow-origin"` la salida es vacía: denegar por defecto funciona. Restaurar el valor de `backend/.env` si se comentó en 5.1.

## 6. Escenario 4 — preflight (`OPTIONS`) según la lista

- [x] 6.1 Volver a configurar el origen permitido y reiniciar (igual que 3.1): `$env:CORS_ORIGINS = "http://localhost:8080"`, `Ctrl+C` y `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Verificación: el backend arranca sin errores.
- [x] 6.2 Preflight aceptado desde un origen listado. Verificación: `curl.exe -i -X OPTIONS -H "Origin: http://localhost:8080" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type" http://127.0.0.1:8000/ventas/` responde `200 OK` e incluye `access-control-allow-origin: http://localhost:8080`, `access-control-allow-methods` con `POST` y `access-control-allow-headers` con `content-type`.
- [x] 6.3 Preflight rechazado desde un origen no listado. Verificación: `curl.exe -i -X OPTIONS -H "Origin: http://evil.example" -H "Access-Control-Request-Method: POST" http://127.0.0.1:8000/ventas/` responde `400 Bad Request`, el cuerpo es `Disallowed CORS origin` y **no** incluye `access-control-allow-origin`.

## 7. Escenario 5 — normalización de la lista

- [x] 7.1 Comprobar el parseo directamente, sin reiniciar. Verificación: desde `backend` y con `$env:DATABASE_URL` definida, `$env:CORS_ORIGINS = " http://localhost:8080/ , https://ejemplo.test ,"` seguido de `python -c "from app.core.config import get_cors_origins; print(get_cors_origins())"` imprime `['http://localhost:8080', 'https://ejemplo.test']`: se recortaron los espacios, se quitó la barra final y se descartó la entrada vacía.
- [x] 7.2 Comprobar el efecto en la respuesta con la lista normalizada. Verificación: reiniciar `uvicorn` (`Ctrl+C` y volver a arrancarlo) manteniendo `$env:CORS_ORIGINS = " http://localhost:8080/ , https://ejemplo.test ,"`; después `curl.exe -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/` responde `200 OK` e incluye `access-control-allow-origin: http://localhost:8080` (la barra final del valor de configuración no impidió la coincidencia).
- [x] 7.3 Comprobar que una lista de solo separadores no habilita nada. Verificación: `$env:CORS_ORIGINS = " , "`, reiniciar `uvicorn` y `curl.exe -s -i -H "Origin: http://localhost:8080" http://127.0.0.1:8000/libros/ | Select-String "access-control-allow-origin"` no devuelve líneas (las entradas vacías no generan orígenes).

## 8. Escenario 6 — sin regresión en salud y catálogo

> No es una suite de tests: es la comprobación de que el middleware no cambió nada. **No se agrega pytest ni ningún archivo de pruebas nuevo**; los `.http` de `backend/test/` quedan como están.

- [x] 8.1 Salud. Verificación: con `CORS_ORIGINS=http://localhost:8080` y el backend reiniciado, `curl.exe -i http://127.0.0.1:8000/health/ready` responde `200 OK` con `{"estado":"listo"}`.
- [x] 8.2 Catálogo sin encabezado `Origin`. Verificación: `curl.exe -i http://127.0.0.1:8000/libros/` responde `200 OK` con los 5 libros del seed y sin encabezados CORS en la respuesta; `curl.exe -s http://127.0.0.1:8000/libros/ | Select-String -Pattern '"id"' -AllMatches` cuenta los libros del seed.
- [x] 8.3 Rutas con y sin barra final, y un endpoint por ID, siguen respondiendo. Verificación: `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/libros/` devuelve `200` y `curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8000/libros/1` devuelve `200`: el enrutamiento no cambió.
- [x] 8.4 Confirmar que no se tocó ningún artefacto de pruebas del backend. Verificación: `git status --short backend/test` no devuelve nada y `git diff --stat -- backend/test` tampoco.

## 9. Documentación y cierre

- [x] 9.1 Dejar `backend/env.example` con la variable documentada y sin secretos (revisada en 1.3). Verificación: `Get-Content backend\env.example` muestra `DATABASE_URL`, `SQL_ECHO` y el bloque comentado de `CORS_ORIGINS` con su ejemplo; ninguna línea contiene credenciales reales.
- [x] 9.2 Validar los artefactos del change. Verificación: `openspec validate "gl-06-cors-backend" --strict` responde `Change 'gl-06-cors-backend' is valid` y `openspec status --change "gl-06-cors-backend" --json` muestra `proposal`, `specs`, `design` y `tasks` en `done`.
- [x] 9.3 Registrar la evidencia con la salida real de cada escenario en `openspec/changes/gl-06-cors-backend/evidencia.md` (comandos de 3.2, 3.3, 4.1, 5.2, 5.3, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1 y 8.2, con su resultado tal como se obtuvo), sin secretos ni `DATABASE_URL` real. Verificación: el archivo existe, cada bloque cita el comando y su salida, y `Select-String -Path openspec\changes\gl-06-cors-backend\evidencia.md -Pattern 'postgresql\+asyncpg','clave'` no devuelve nada.

## Workflow follow-up

- Marcar `[x]` en `CHANGES.md` (GL-06) **solo después de archivar** el change; no hacerlo antes.
- Commit en la rama `feature/gl-06-cors-backend` con mensaje convencional (`feat:` o `fix:`), y PR con «Create a merge commit» **solo con pedido explícito** de la persona (regla dura 16). Nada de esto se hace en el apply.
- GL-07 (`despliegue-easypanel`) declara `CORS_ORIGINS` entre las variables del servicio backend: el valor real se define ahí, no en este change.
