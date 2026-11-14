# Proposal

## Why

El profesor pidió en la clase del 12/11 que el backend documente y habilite CORS: hoy la API no envía ningún encabezado `Access-Control-Allow-Origin`, así que un navegador que la llame desde otro origen (por ejemplo el frontend en `http://localhost:8080` hablando directo con `http://127.0.0.1:8000`) bloquea la respuesta. Con la vía interna de Nginx el navegador habla con el mismo origen y CORS no hace falta para el circuito calificado, pero el pedido es explícito, el costo es mínimo y deja usable la variante de backend directo.

Es un change de **governance BAJO**: no toca dominio, ni esquema, ni endpoints, ni el stack.

## What Changes

- En `backend/app/main.py`, instalar `CORSMiddleware` (el de Starlette, sin dependencia nueva) sobre `app`, con los orígenes tomados de `get_cors_origins()` y `allow_credentials=False`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- En `backend/app/core/config.py`, agregar `get_cors_origins()`: lee `CORS_ORIGINS` (lista separada por comas, cada origen con esquema y sin barra final), recorta espacios, quita la barra final y descarta entradas vacías; **sin la variable devuelve `[]`**, es decir no se habilita ningún origen.
- Documentar la variable en `backend/env.example` (comentario + valor de ejemplo), sin valores reales.
- Verificar el comportamiento con `curl.exe` contra el backend local con seed: origen listado, origen no listado, preflight, ausencia de la variable, normalización de entradas y ausencia de regresión en `/health/ready` y `/libros/`.

**No cambia** el frontend, ni el despliegue, ni los endpoints, ni el contrato de `docs/CONTRATO-API.md`.

## Capabilities

### New Capabilities

- `backend-cors`: la política CORS de la API — qué orígenes pueden llamarla desde un navegador, cómo se configuran por variable de entorno y qué pasa cuando no se configura ninguno.

### Modified Capabilities

- Ninguna. `openspec/specs/` de la raíz solo tiene `frontend-container-image` (de GL-01) y este change no altera ninguno de sus requisitos: el proxy de Nginx sigue igual y no depende de CORS.

## Impact

- **Archivos** (los únicos que este change puede tocar, porque es el único change con alcance sobre `backend/`): `backend/app/main.py`, `backend/app/core/config.py` y `backend/env.example`. Nada más de `backend/` ni del resto del monorepo.
- **Dependencias**: ninguna. `CORSMiddleware` viene con Starlette, que ya entra por `fastapi[standard]`; no se agrega nada a `backend/requirements.txt`.
- **Base de datos**: no se toca. Sin migraciones (el proyecto usa `create_all`), sin cambios de esquema y sin correlación con el seed.
- **Sistemas**: la API arranca igual con o sin `CORS_ORIGINS`; el valor real de la variable en Easypanel pertenece a GL-07, no a este change.
- **Habilita**: GL-07, que declara `CORS_ORIGINS` entre las variables del servicio backend. Con la conexión interna de Nginx (PA-2, decidida) la variable no es imprescindible para el circuito calificado.
- **Verificación**: manual, con `curl.exe` contra el backend local con seed (`docs/ARRANQUE.md` §3). `backend/requirements.txt` **no incluye pytest** y el proyecto no tiene suite automatizada: los artefactos de prueba existentes son los archivos `.http` de `backend/test/`, que este change **no modifica**. No se inventa una suite; la evidencia es la salida real de los comandos.
- **Fuera de alcance**: cambios de frontend (GL-02 a GL-05), despliegue y valores de variables en Easypanel (GL-07), endpoints nuevos, dependencias nuevas, autenticación por cookies o sesiones, y `backend/test/*.http`.
- **Riesgo operativo**: al configurarse por entorno, un valor mal escrito no rompe el arranque; simplemente no coincide con ningún `Origin` real (ver preguntas abiertas en `design.md`).
