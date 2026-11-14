# Design

## Context

Ver `proposal.md` para la motivación. El estado que condiciona el diseño:

- `backend/app/main.py` crea la app con `FastAPI(lifespan=lifespan)` y después registra siete routers con `include_router` (health, clientes, libros, editoriales, géneros, autores, ventas).
- `backend/app/core/config.py` ya centraliza la configuración por entorno: importa `python-dotenv`, llama a `load_dotenv()` al importarse y expone `get_database_url()` (fail-fast) y `get_sql_echo()`. La política del módulo es: leer del entorno, sin valores por defecto peligrosos, sin imprimir secretos.
- `backend/requirements.txt` es corto y fijo: `fastapi[standard]`, `sqlmodel`, `sqlalchemy[asyncio]`, `asyncpg`, `python-dotenv`. El stack es impuesto (`backend/AGENTS.md`): no se agregan dependencias.
- La API es stateless: no hay sesiones, cookies ni autenticación. Todos los handlers son `async def` y leen la sesión de `app.state`.
- El frontend desplegado habla con la API por el proxy interno de Nginx (`API_UPSTREAM`), mismo origen. PA-2 de `CHANGES.md` está **decidido**: conexión interna.
- La verificación del proyecto es por salida real de comandos (regla dura 17 de `AGENTS.md`), no por suites automatizadas: `backend/requirements.txt` no incluye pytest y los artefactos de prueba son los `.http` de `backend/test/`.

Los requisitos observables están en `specs/backend-cors/spec.md`; este documento no los repite.

## Goals / Non-Goals

**Goals:**

- Que la política CORS exista, sea explícita y se configure sin recompilar ni tocar código: solo cambiando una variable de entorno.
- Que el valor por defecto sea seguro: sin configuración, ningún origen cruzado queda autorizado y la API funciona igual.
- Que el apply sea «revisar y verificar»: el código ya está escrito y solo se comprueba contra la spec con `curl.exe`.

**Non-Goals:**

- Autenticación, sesiones o cookies: no existen hoy y no se introducen acá.
- Restringir métodos o encabezados por router: se resuelve con `*` (ver decisión 5).
- Validar el formato de cada origen al arrancar (decisión 7 y preguntas abiertas).
- Definir el valor real de `CORS_ORIGINS` en Easypanel: es GL-07.
- Cambiar el frontend, el contrato de la API o el esquema de la base.

## Decisions

### 1. `CORSMiddleware` de Starlette en lugar de middleware propio

`from fastapi.middleware.cors import CORSMiddleware` es el middleware CORS que ya viene con Starlette (y por lo tanto con `fastapi[standard]`). Implementa la negociación completa: encabezados simples, preflight, `Vary: Origin`, lista explícita o comodín, y el rechazo 400 del preflight no autorizado.

Alternativas descartadas: middleware `@app.middleware("http")` escrito a mano (habría que reimplementar preflight, `Vary` y la comparación de orígenes: más código, más superficie de error y ningún beneficio); agregar `fastapi-cors` u otra librería (violaría la regla de no sumar dependencias sin consultar y no aportaría nada sobre lo que ya trae Starlette).

### 2. Ubicación: `add_middleware` después de crear `app` y antes de `include_router`

El middleware se registra justo después de `app = FastAPI(lifespan=lifespan)` y antes del bloque de `include_router`. Técnicamente `add_middleware` debe ejecutarse antes de que la app empiece a servir (Starlette construye la pila de middleware al primer request o al arrancar), y el orden relativo a los routers no cambia el resultado. Se elige igual esa ubicación porque deja el archivo legible en el orden en que se razona: crear la app, envolverla, registrar rutas.

Alternativa descartada: ponerlo al final del archivo, después de los `include_router`. Funciona, pero separa la configuración transversal de la creación de la app y hace menos evidente que el middleware aplica a todos los routers.

### 3. Denegar por defecto: sin `CORS_ORIGINS`, `allow_origins=[]`

`get_cors_origins()` devuelve `[]` cuando la variable falta, está vacía o solo tiene espacios y comas. Con la lista vacía el middleware queda instalado pero no autoriza ningún origen: las peticiones se atienden normalmente y no llevan `access-control-allow-origin`. El arranque no falla, a diferencia de `DATABASE_URL`, porque CORS no es indispensable para servir (el circuito calificado va por Nginx, mismo origen).

Alternativa descartada: fallar al arrancar si falta `CORS_ORIGINS`, como se hace con `DATABASE_URL`. Se rechaza porque convertiría una función opcional en un requisito de despliegue y rompería `docs/ARRANQUE.md` §3, donde el backend se levanta solo con `DATABASE_URL`.

### 4. Nunca `allow_origins=["*"]`

El comodín abre la API a cualquier sitio de internet y, combinado con credenciales, el navegador lo considera inválido (la especificación CORS prohíbe `*` cuando la petición lleva credenciales). Además impediría cumplir el escenario de «origen no listado, sin autorización»: con `*` toda respuesta llevaría `access-control-allow-origin`. La lista explícita es la única forma de que el encabezado devuelva el origen exacto y de que un origen ajeno quede bloqueado.

### 5. `allow_credentials=False` con `allow_methods=["*"]` y `allow_headers=["*"]`

- `allow_credentials=False`: la API no tiene sesiones ni cookies, así que no se pierde nada y se evita el caso más delicado de CORS (origen explícito + credenciales). Además es el emparejamiento correcto para una lista explícita de orígenes: no hay motivo para habilitar credenciales hasta que exista autenticación.
- `allow_methods=["*"]`: la API expone GET y POST en varios routers, y PATCH/PUT en libros; el frontend usa GET y POST. Enumerar métodos por router sería trabajo de configuración sin efecto observable hoy.
- `allow_headers=["*"]`: el navegador preflighta `content-type: application/json` en los POST de altas y ventas; con `*` el preflight se resuelve sin mantener una lista de encabezados que el frontend podría ampliar (por ejemplo, un encabezado de correlación).

Alternativas descartadas: `allow_methods=["GET","POST"]` (dejaría fuera los `PATCH /libros/{id}` que ya existen y obligaría a ampliar la lista con cada endpoint nuevo); `allow_headers=["content-type"]` (suficiente hoy, pero frágil ante el primer encabezado nuevo); `allow_credentials=True` (sin autenticación no aporta y amplía el riesgo).

### 6. Normalización en `get_cors_origins()`

La función recorta espacios, quita la barra final con `rstrip("/")` y descarta las entradas vacías. El motivo es concreto: los navegadores envían `Origin` sin barra final (`http://localhost:8080`), así que un valor pegado desde una URL del navegador (`http://localhost:8080/`) nunca coincidiría y el síntoma sería «CORS no funciona» sin ningún error visible. Recortar los espacios tolera la lista escrita con `, ` y descartar vacías evita que una coma final genere una entrada `""`.

Alternativa descartada: comparar crudo y exigir que el operador escriba el valor exacto. Se rechaza porque el error es silencioso y aparece en el peor momento (despliegue, GL-07).

### 7. Origen del valor: entorno o `.env`, con el entorno por encima

`config.py` llama a `load_dotenv()` al importarse; `python-dotenv` **no sobrescribe** variables que ya existen en el proceso. Por lo tanto `$env:CORS_ORIGINS` definido en la shell gana sobre `backend/.env`, y el `.env` sirve para el caso cómodo (ARRANQUE §3.3) sin quedar versionado. Consecuencia para la verificación: para probar «sin la variable» no alcanza con `Remove-Item Env:CORS_ORIGINS` si `backend/.env` también la define; hay que revisar ese archivo (ver `tasks.md`).

Además, el valor se lee **al importar** `main.py` (el `get_cors_origins()` se evalúa al construir el middleware), así que cualquier cambio exige reiniciar `uvicorn`: no hay recarga en caliente de la política.

### 8. Relación con la vía interna de Nginx (PA-2)

Con `API_UPSTREAM`, el navegador pide `/api/...` al mismo origen que sirvió el HTML y Nginx reenvía al backend por la red interna: no hay petición cruzada y CORS no interviene. Se implementa igual porque el profesor lo pidió en la clase del 12/11, porque un valor de `CORS_ORIGINS` mal puesto no puede romper el circuito calificado (queda inerte) y porque mantiene usable el modo «backend directo» (frontend en `http://localhost:8080` llamando a `http://127.0.0.1:8000`) al probar sin contenedor.

### 9. Guarda de alcance: solo tres archivos

El change toca `backend/app/main.py`, `backend/app/core/config.py` y `backend/env.example`. No agrega dependencias, no agrega endpoints, no toca modelos, servicios, routers ni el seed, y no modifica los `.http` de `backend/test/`. Es el único change de la raíz con permiso para tocar `backend/` (regla dura 11 de `AGENTS.md`), y aun así se limita a lo mínimo.

## Risks / Trade-offs

- [Un origen mal escrito (`localhost:8080` sin esquema, o con `https` cuando el frontend va por `http`) no rompe nada: simplemente nunca coincide y el navegador bloquea] → La spec exige un escenario con origen listado y otro con origen no listado; el operador ve la diferencia en la pestaña Red. Validar al arrancar queda como pregunta abierta.
- [`allow_headers=["*"]` es más permisivo de lo necesario] → Aceptado por plazo: no hay encabezados sensibles involucrados y la API no usa credenciales. Se revisa si aparece autenticación.
- [`allow_methods=["*"]` habilita métodos que el frontend no usa (PUT, DELETE fuera de alcance)] → La autorización real la define el router: un método inexistente devuelve 405 aunque el preflight lo anuncie. No agrega endpoints.
- [El valor se lee al importar: cambiar `CORS_ORIGINS` exige reiniciar uvicorn] → Documentado en `tasks.md`; en Easypanel un cambio de variable provoca redeploy (GL-07).
- [`load_dotenv()` puede aportar un `CORS_ORIGINS` desde `backend/.env`, y un `backend/.env` copiado de `env.example` trae tres orígenes de ejemplo] → `env.example` usa dominios ficticios y locales; la verificación de «sin la variable» revisa el `.env` antes de afirmar el resultado.
- [Si mañana se agrega autenticación por cookies, `allow_credentials=False` bloquea el flujo] → Pregunta abierta 1: el cambio es de una línea y se decide con el diseño de autenticación, no antes.

## Migration Plan

- No hay migración de datos ni de esquema: es configuración en memoria, sin estado persistente.
- Despliegue local: definir `$env:CORS_ORIGINS` (o dejarlo en `backend/.env`) y reiniciar `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Rollback: quitar la variable y reiniciar (vuelve al modo denegar por defecto) o revertir el commit del change; no hay nada que limpiar en la base.
- El valor definitivo en Easypanel y el redeploy son GL-07.

## Open Questions

Ninguna de estas cambia la spec, el enfoque ni las tareas de este change. No se resuelven en silencio y no se edita `CHANGES.md` desde acá:

1. Si en el futuro se agrega autenticación por sesión o cookies, ¿`allow_credentials` pasa a `True`? Hoy no aplica: la API es stateless y sin autenticación.
2. ¿Conviene restringir orígenes por método y por encabezado en lugar de `"*"`? Propuesta: no por ahora; se revisa si se suman endpoints con métodos distintos o encabezados propios.
3. ¿Se valida `CORS_ORIGINS` al arrancar? Hoy una entrada sin esquema (`localhost:8080`) se acepta y nunca coincide con un `Origin` real. Propuesta: dejarlo así para la entrega; validar solo si el profesor lo pide o si aparece un error de configuración en GL-07.
4. ¿Quién define el valor final de `CORS_ORIGINS` en Easypanel? Corresponde a GL-07 (dueño Mariano, revisor Andrés), junto con `DATABASE_URL`.
5. Borde menor observado en la revisión: la comprensión de `get_cors_origins()` descarta las entradas vacías **antes** de quitar la barra final, así que una entrada que sea solo `/` queda como cadena vacía en la lista. No habilita ningún origen real (un navegador nunca envía `Origin` vacío) y no se corrige acá para no reescribir código ya revisado; se anota por si el revisor prefiere filtrar después del `rstrip`.

## UI Mockups

Decision: no (no UI). Este change solo configura encabezados CORS en el backend; no modifica pantallas, componentes, estilos ni interacciones del frontend.
