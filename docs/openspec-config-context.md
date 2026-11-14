# Texto para `openspec/config.yaml` (raíz)

> Después de `openspec init` en la raíz, abrí `openspec/config.yaml`. Dejá lo que generó (`schema: …`) y reemplazá o agregá la clave `context:` con el bloque de abajo. Respetá la **indentación de 2 espacios** (YAML).
> `frontend/openspec/config.yaml` y `backend/openspec/config.yaml` muestran el formato que ya usaron: copiá su estilo si tu versión genera algo distinto.

```yaml
context: |
  Proyecto: Global de Programación III — Librería integrada y desplegada (monorepo libreria-global).
  Objetivo: integrar el frontend del parcial 1 (HTML/CSS/JS nativos, antes con localStorage) con el
  backend FastAPI + PostgreSQL, y desplegar ambos en Easypanel como dos servicios.
  Consigna oficial: docs/Consignas_Global.pdf. Roadmap: CHANGES.md (GL-01..GL-08). Reglas: AGENTS.md.

  Stack impuesto (no cambiar sin consultar):
  - Frontend: HTML5, CSS3 y JavaScript nativo (fetch + async/await). Sin frameworks, bundler, TypeScript ni librerías externas.
  - Servidor del frontend: Nginx 1.30 Alpine; imagen propia (frontend/Dockerfile); proxy /api/ -> API_UPSTREAM.
  - Backend: FastAPI, SQLModel, SQLAlchemy 2.0 async, asyncpg, PostgreSQL (backend/AGENTS.md rige dentro de backend/).
  - Contenedores: un Dockerfile por componente, sin Docker Compose.
  - Despliegue: Easypanel, dos servicios App con Build Path /backend y /frontend.

  Estructura: backend/ (API), frontend/public/ (index.html, css/, js/ con util, api, catalogo, libros,
  clientes, ventas, historial, app), docs/, evidencia/.

  Reglas clave del dominio y la integración:
  - Ningún registro en localStorage/sessionStorage/IndexedDB: todo viene de la API. El borrador de la venta vive en memoria.
  - El JS solo conoce el prefijo /api (fetch("/api/...") vía Libreria.api); nunca la dirección del backend. Respetar la barra final de cada ruta.
  - Solo existen los endpoints de docs/CONTRATO-API.md. No hay listado de clientes ni de autores: se buscan por ID.
  - POST /ventas/ envía solo cliente_id y renglones[{libro_id, cantidad}]; un renglón por libro. El servidor copia precios y calcula importes.
  - Los importes confirmados (precio_unitario, subtotal, total) se muestran tal como llegan (strings), sin recalcular.
  - 409 y 422: mostrar el mensaje del servidor; distinguir error de conexión; conservar el borrador de la venta si se rechaza.
  - Nunca innerHTML con datos de la API. Estados de UI: cargando, vacío, sin coincidencias, error de conexión (reintentar), éxito.

  Restricciones de datos y seguridad: datos ficticios; sin secretos en el repo (.env ignorado, env.example sin valores reales);
  el seed (python -m app.seed) borra y recarga las 9 tablas: no correrlo sobre datos a conservar.

  Política de verificación: no hay tests automáticos de frontend. Cada escenario se verifica contra el backend real con seed
  (pestaña Red del navegador, casos G-01..G-07 de la cátedra); la lógica pura puede probarse con node.
  Ver docs/ARQUITECTURA-FRONTEND.md y docs/DIVISION-DEL-EQUIPO.md (un change = un dueño; archivos por dueño).
```
