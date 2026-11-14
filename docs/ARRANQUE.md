# Guía de arranque (paso a paso, Windows + PowerShell)

> Para los 3 integrantes. Los comandos están pensados para **PowerShell** y para estar parado en la carpeta indicada. Si algo falla, pegá **el error completo** (sin contraseñas) en el grupo o al agente.
> Lo que no pude verificar desde donde preparé esto está marcado con **[VERIFICAR]**.

---

## 1. Clonar el repo y leer (todos)

```powershell
git clone https://github.com/marianoemir/libreria-global.git
cd libreria-global
```

Leé, en este orden: `docs/Consignas_Global.pdf` → `CONTEXTO-GLOBAL.md` → `CHANGES.md` → `docs/DIVISION-DEL-EQUIPO.md`. Después, solo lo que diga «Leer antes» de **tu** change.

> Si ya tenías el repo: `git pull`. Hacelo **siempre** antes de empezar un change y antes de abrir un PR.

---

## 2. Setup de la raíz (solo Mariano, una vez)

Objetivo: que `/opsx:propose` funcione en la raíz y que el agente conozca las reglas del proyecto. **No se corre `/active-orchestrator:init`** (la fundación ya existe en cada repo). El kit trae un `.active-orchestrator-state.json` con `step: done` para que la raíz tenga su estado registrado (ver nota al final de esta sección).

1. Descomprimí el kit **encima** de la carpeta del repo (que pise/agregue archivos). Debe quedar `AGENTS.md`, `CLAUDE.md`, `CHANGES.md`, `docs/`, etc. en la raíz, y los cambios de `frontend/` y `backend/` (CORS) incluidos.
2. Inicializá OpenSpec en la raíz (elegí tu agente cuando pregunte):
   ```powershell
   openspec init
   ```
   Alternativa si tu agente tiene el comando: `/active-orchestrator:openspec` (hace solo `openspec init`). **[VERIFICAR]** qué pregunta tu versión; si ofrece sobrescribir o hay algo raro, pegá lo que muestra en el grupo.
3. Abrí `openspec/config.yaml` y pegá en `context:` el texto de `docs/openspec-config-context.md`.
4. Verificá que `AGENTS.md` y `CLAUDE.md` sean idénticos:
   ```powershell
   (Get-FileHash AGENTS.md).Hash -eq (Get-FileHash CLAUDE.md).Hash
   ```
   Debe imprimir `True`.
5. Commit y push (rama `main`; es el único commit directo a `main`):
   ```powershell
   git add .
   git commit -m "docs: roadmap, reglas y guias del Global (GL-01..GL-08)"
   git push
   ```
6. Avisar al grupo: **«subí la raíz, hagan `git pull`»**.

> **Sobre `.active-orchestrator-state.json`:** guarda el estado de la *fundación* (fases hechas) y la lista y revisión del roadmap; **no** registra qué changes ya se hicieron (eso está en `CHANGES.md` con `[x]` y en `openspec/changes/archive/`). Este archivo de la raíz está escrito a mano copiando el formato del de `backend/` (`version: 5`); **[VERIFICAR]** que tu versión de Active Stack lo acepte: si `openspec init` o un comando del orquestador lo reescribe, está bien, pero que `step` siga en `done`.

---

## 3. Backend local con datos de prueba (todos)

Sirve para probar el frontend contra la API real. Necesitás Docker Desktop y Python 3.12.

**3.1 Base de datos PostgreSQL local** (una vez):

```powershell
docker run -d --name pg-libreria -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=libreria -p 5432:5432 postgres:16
```

Si el puerto 5432 está ocupado, usá `-p 5433:5432` y poné `5433` en la URL de abajo. Para reiniciarla más tarde: `docker start pg-libreria`.

**3.2 Entorno Python** (desde `libreria-global\backend`):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Si PowerShell bloquea el script de activación: `Set-ExecutionPolicy -Scope Process Bypass` y repetir.

**3.3 Variables** (en esa misma ventana de PowerShell):

```powershell
$env:DATABASE_URL = "postgresql+asyncpg://postgres:dev@localhost:5432/libreria"
```

(O copiá `env.example` a `.env` y editá la `DATABASE_URL`. El `.env` está ignorado por Git: **nunca** lo subas.)

**3.4 Arrancar la API** (deja la ventana ocupada; abrí otra para lo siguiente):

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

La primera vez crea las tablas. Comprobá en el navegador: `http://127.0.0.1:8000/health/ready` → `{"estado":"listo"}` y `http://127.0.0.1:8000/docs` (documentación de FastAPI).

**3.5 Cargar los datos de prueba** (otra ventana, con el venv activado y la misma `DATABASE_URL`):

```powershell
cd libreria-global\backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL = "postgresql+asyncpg://postgres:dev@localhost:5432/libreria"
python -m app.seed
```

Después `http://127.0.0.1:8000/libros/` debe mostrar 5 libros. **El seed borra y recarga las 9 tablas**: solo sobre una base de pruebas. Si tu venta de prueba dejó datos raros, repetirlo deja todo como al inicio.

---

## 4. Frontend en local con Nginx (desde GL-01)

Con el backend corriendo en el puerto 8000 (paso 3) y desde `libreria-global\frontend`:

```powershell
docker build -t libreria-frontend .
docker run --rm --name libreria-frontend -p 127.0.0.1:8080:80 -e API_UPSTREAM=host.docker.internal:8000 libreria-frontend
```

- Abrí `http://127.0.0.1:8080/` (la página) y `http://127.0.0.1:8080/api/health/ready` (debe dar 200: pasó por Nginx al backend).
- **Cada vez que cambies archivos de `public/`** hay que reconstruir la imagen (`docker build` de nuevo) y volver a correr el contenedor. Para probar rápido sin Docker, abrir `index.html` directo **no sirve** (no hay proxy a `/api`).
- Para ver las peticiones: F12 → pestaña **Red** (Network) → filtrar por `api`.

---

## 5. Despliegue en Easypanel (GL-07, Mariano)

Resumen del PDF (Ejercicio 5). Antes, confirmar **PA-2/PA-3** de `CHANGES.md` (nombre interno del servicio y base de datos).

**Backend** (servicio App):
1. Source: este repositorio, rama `main`, **Build Path `/backend`**, builder Dockerfile (ruta `Dockerfile`).
2. Environment: `DATABASE_URL` (con `postgresql+asyncpg://` y el host/puerto **internos** de Postgres, en Credentials del servicio de base), `CORS_ORIGINS` (dominio HTTPS del frontend), `SQL_ECHO=false`.
3. Deploy. Esperar `Running`. En el **Shell** del servicio, comprobar:
   ```
   python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8000/health/ready').status)"
   ```
   Debe imprimir `200`.
4. Carga inicial: `python -m app.seed` en el Shell, **solo si la base no tiene datos que se quieran conservar**.
5. **Quitar el dominio automático** (el backend queda solo en la red interna).

**Frontend** (servicio App):
1. Source: mismo repo y rama, **Build Path `/frontend`**, builder Dockerfile.
2. Environment: `API_UPSTREAM=<proyecto>_<servicio-backend>:8000` (host:puerto, **sin** `http://` ni barra final). Ej. del PDF: `grupo1_backend:8000`; acá el proyecto sería `grupo10` **[VERIFICAR el nombre exacto en Easypanel]**.
3. Domains: dominio HTTPS asignado, protocolo interno HTTP, **puerto de destino 80**.
4. Deploy y probar: `https://<dominio>/`, `https://<dominio>/api/health/ready` (200), catálogo, una venta.

**Diagnóstico** (del PDF):

| Síntoma | Dónde mirar |
|---|---|
| Falla un `COPY` al construir | Build Path, nombres exactos, que exista `public/` |
| Nginx no arranca o `/api/` da **502** | logs del frontend; `API_UPSTREAM`; nombre interno del backend; puerto; que el backend esté `Running` |
| `/api/health/ready` falla | logs del backend; `DATABASE_URL`; conexión a Postgres |
| Una petición da **404** | prefijo `/api` y barra final de la ruta |

---

## 6. Problemas frecuentes

| Problema | Causa probable / solución |
|---|---|
| `ModuleNotFoundError: app` al arrancar uvicorn | Estás parado en la carpeta equivocada: tiene que ser `libreria-global\backend` |
| `Connect call failed` / no conecta a la base | El contenedor `pg-libreria` no está corriendo (`docker start pg-libreria`) o el puerto/usuario de `DATABASE_URL` no coinciden |
| `/api/...` da **502** en `127.0.0.1:8080` | El backend no está corriendo, o escucha solo en `127.0.0.1`: arrancarlo con `--host 0.0.0.0` |
| `/api/...` da **404** | Falta o sobra la barra final (`/libros/` vs `/libros`), o falta el prefijo `/api` |
| La página carga pero no hay datos y no hay errores | Falta el seed (paso 3.5) |
| Hice un cambio en `public/` y no se ve | Hay que reconstruir la imagen (`docker build`) y volver a correr el contenedor; probar con Ctrl+F5 |
| El navegador muestra un error de CORS | El JS está llamando a otra dirección (no a `/api`); revisar la regla 2 de `AGENTS.md` |
| `git push` rechazado | Falta `git pull` (alguien subió antes); resolver y reintentar |
| PowerShell no deja activar el venv | `Set-ExecutionPolicy -Scope Process Bypass` |

---

## 7. Armar el ZIP de entrega (GL-08)

Desde la raíz, con todo commiteado:

```powershell
git archive --format=zip -o ..\entrega.zip HEAD
```

Esto incluye lo versionado (y deja afuera `.git` y lo ignorado: `.env`, `node_modules`, `.venv`). Verificá el contenido antes de entregar:

```powershell
Expand-Archive ..\entrega.zip -DestinationPath ..\entrega-revision -Force
Get-ChildItem ..\entrega-revision
Get-ChildItem ..\entrega-revision -Recurse -Force -Filter ".env*"
```

Debe haber `frontend\`, `backend\`, `README.md`, `DEPLOY.md`, `evidencia\` y **ningún** `.env` ni credencial.
