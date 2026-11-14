# Global de Programación III — Librería integrada y desplegada

> **Instrucciones para agentes de código** (OpenCode, Claude Code, Codex) que trabajan en la **raíz del monorepo** `libreria-global`.
> Este archivo y `CLAUDE.md` son **idénticos**: si cambiás uno, cambiá el otro (se verifican por hash).
> Dentro de `backend/` rige además `backend/AGENTS.md`; dentro de `frontend/`, los changes archivados de `frontend/openspec/` son historia del parcial 1.

## Qué se está construyendo

Integrar el **frontend** del parcial 1 (HTML, CSS y JS nativos, que guardaba todo en `localStorage`) con el **backend** FastAPI + PostgreSQL de la librería, y **desplegar ambos en Easypanel** (una VPS) como dos servicios. Los datos pasan a vivir en la API; el frontend se sirve con Nginx. Consigna oficial: `docs/Consignas_Global.pdf`. Cierre del campus: martes 17/11/2026 00:00; meta de entrega: lunes 16/11 a las 20:00.

Trabajan **3 personas**, cada una con sus changes (ver `docs/DIVISION-DEL-EQUIPO.md`). Antes de tocar nada, confirmá con la persona **cuál es su change** y trabajá solo en él.

## Stack Tecnológico (impuesto — no cambiar sin consultar)

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 y **JavaScript nativo** (ES2017+, `fetch` + `async/await`). **Sin frameworks, sin bundler, sin TypeScript, sin librerías de CDN** |
| Servidor web del frontend | Nginx 1.30 Alpine (imagen propia: `frontend/Dockerfile`) |
| Backend | FastAPI, SQLModel, SQLAlchemy 2.0 async, asyncpg, PostgreSQL (detalle en `backend/AGENTS.md`) |
| Contenedores | Docker, **un `Dockerfile` por componente** (sin Docker Compose) |
| Despliegue | Easypanel: dos servicios App del mismo proyecto, Build Path `/backend` y `/frontend` |
| Conexión | El navegador llama a `/api/...` (mismo origen); Nginx reenvía al backend con `API_UPSTREAM` (red interna) |

## Base de Conocimiento (leer solo lo que pide el change)

| Documento | Para qué |
|---|---|
| `docs/Consignas_Global.pdf` | La consigna: ejercicios, casos G-01…G-07, entrega |
| `docs/CONTRATO-API.md` | **Único** catálogo de endpoints, formas de datos, errores y datos de prueba |
| `docs/ARQUITECTURA-FRONTEND.md` | Archivos JS, dueños, contrato `window.Libreria` (`api`, `util`, `estado`) |
| `CHANGES.md` | Roadmap GL-01…GL-08, dependencias, «Leer antes», preguntas abiertas |
| `docs/DIVISION-DEL-EQUIPO.md` | Dueños, revisores, cronograma, archivos por dueño |
| `docs/ARRANQUE.md` | Cómo levantar el backend local, probar y desplegar |
| `docs/PROMPTS-OPSX.md` | Prompts de `/opsx:propose` por change |
| `.active-orchestrator-state.json` | Estado de la fundación de la raíz (`step: done`, no se rehace) y lista/revisión del roadmap. **El avance de cada change NO está acá**: se lee en `CHANGES.md` (`[x]`) y en `openspec/changes/` / `openspec/changes/archive/` |
| `backend/knowledge-base/` | Dominio de la librería (reglas `RN-*`, modelo de datos). Solo lectura salvo GL-06 |
| `frontend/openspec/specs/` | Specs del parcial 1 (historia; el comportamiento nuevo lo define cada change GL) |

## Roadmap de Changes (resumen — la fuente es `CHANGES.md`)

- **GL-01** monorepo-docker-frontend · **GL-02** cliente-http · **GL-03** catalogo-fetch · **GL-04** altas-fetch
- **GL-05** ventas-historial-fetch · **GL-06** cors-backend · **GL-07** despliegue-easypanel · **GL-08** evidencia-entrega
- Camino crítico: GL-01 → GL-02 → GL-05 → GL-07 → GL-08. GL-03/04/05 arrancan solo con GL-02 archivado.

## Reglas Duras

Contrato del proyecto. Ante conflicto, prevalece este orden: **consigna (PDF) > estas reglas > knowledge-base del backend > skills**.

**Datos y API**
1. **NUNCA** guardar registros (libros, clientes, ventas) en `localStorage`, `sessionStorage` ni `IndexedDB`. Todo viene de la API. Solo el **borrador de la venta** y listas auxiliares viven en memoria.
2. **NUNCA** escribir la dirección del backend en el JS (ni `localhost:8000`, ni un dominio). Siempre `fetch("/api/...")`, vía `Libreria.api`. Respetar la **barra final exacta** de cada ruta del backend (`/libros/`, `/libros/3`).
3. **NUNCA** inventar endpoints: usar solo los de `docs/CONTRATO-API.md`. No existen `GET /clientes/` ni `GET /autores/`; los clientes y autores se buscan por ID.
4. **NUNCA** recalcular ni reformatear numéricamente los importes confirmados: mostrar `precio_unitario`, `subtotal` y `total` **tal como llegan** (strings). Las estimaciones del borrador se rotulan «estimado».
5. En `POST /ventas/` mandar **solo** `cliente_id` y `renglones[{libro_id, cantidad}]`. Un renglón por libro.
6. Ante 409 y 422 mostrar el **mensaje del servidor** (`detail`); distinguir el error de conexión; **conservar el borrador** cuando se rechaza una venta.

**Frontend**
7. **NUNCA** `innerHTML` con datos de la API ni de formularios: usar `textContent` o `Libreria.util.el`.
8. **NUNCA** agregar frameworks, librerías externas, TypeScript ni herramientas de build.
9. Distinguir los estados de interfaz: cargando, vacío, sin coincidencias, error de conexión («Reintentar»), éxito. Deshabilitar el botón mientras se envía una alta o una venta.
10. Cada módulo JS usa solo `window.Libreria` para hablar con los demás; no leer variables internas ajenas.

**Alcance y proceso**
11. **Un change = un dueño.** Tocar solo los archivos de tu change (tabla en `docs/DIVISION-DEL-EQUIPO.md`). **No modificar `backend/`** salvo GL-06 (CORS) o pedido explícito del dueño. No reescribir changes ya archivados (los de `backend/` y `frontend/openspec/`).
12. **No inventar reglas de negocio** ni decisiones: lo no resuelto va a «Preguntas abiertas» de `CHANGES.md`, no a una decisión silenciosa. Toda decisión de diseño se justifica en `design.md`.
13. **No hacer `/opsx:propose` si las dependencias del change no están archivadas y mergeadas.** `propose` **no** implementa. No pasar a `apply` sin revisar los artefactos con el checklist de abajo.

**Seguridad y entrega**
14. **NUNCA** secretos en el repo, en capturas ni en mensajes: `.env` ignorado, `env.example` solo con nombres y valores de ejemplo, ninguna `DATABASE_URL` real. Datos ficticios.
15. **NUNCA** correr `python -m app.seed` sobre una base con datos que se quieran conservar: **borra y recarga las 9 tablas**.
16. **No commitear ni pushear sin pedido explícito de la persona.** Rama por change (`feature/gl-0X-nombre`), commits convencionales (`feat:`, `fix:`, `docs:`, `chore:`), PR con «Create a merge commit».
17. **Evidencia = salida real** de la herramienta (pestaña Red, respuesta de la API, resultado del comando). Si el agente «razonó» un resultado, no cuenta como verificado.
18. Mantener `AGENTS.md` y `CLAUDE.md` idénticos.
19. **No correr `/active-orchestrator:init` en la raíz**: la fundación ya está `done` en `.active-orchestrator-state.json`. Si se rectifica el roadmap, agregar changes nuevos y actualizar `roadmap.changes` y `roadmap.revision` de ese archivo junto con `CHANGES.md`.

## Flujo de Trabajo

```
1. Leer       CHANGES.md → dependencias y «Leer antes» del change (solo esos archivos)
2. Proponer   /opsx:propose GL-0X-nombre   → proposal + design + specs + tasks   (NO implementa)
3. Revisar    los 4 artefactos con el checklist
4. Aplicar    /opsx:apply GL-0X-nombre     → implementar las tasks en orden
5. Verificar  cada escenario de la spec contra el backend real con seed (pestaña Red + casos G-xx)
6. Archivar   /opsx:archive GL-0X-nombre   → pasa a openspec/changes/archive/ y sincroniza specs
7. Cerrar     marcar [x] en CHANGES.md, commit y PR
```

**Checklist antes de `/opsx:apply`:** ¿las dependencias están archivadas? · ¿cada regla citada existe en el PDF, el contrato o la KB (no es invento)? · ¿lo ambiguo quedó como pregunta abierta? · ¿hay ≥ 3 escenarios verificables (esperado, error de negocio, borde) y una task de verificación por escenario? · ¿no se tocó el alcance de otro change?

**Checklist antes de archivar:** escenarios verificados con evidencia real · sin secretos ni datos reales en el diff · `CHANGES.md` actualizado · `AGENTS.md` y `CLAUDE.md` siguen idénticos.

**Verificación en este proyecto:** no hay framework de tests de frontend. Se verifica con la app corriendo contra el backend real con seed (`http://127.0.0.1:8080` por el contenedor de GL-01), la pestaña Red y los casos G-xx; la lógica pura se puede probar con `node` (ver `docs/referencia/frontend-js/prueba-api.js`).

## Skills disponibles

- `backend/.agents/skills/` (FastAPI, SQLModel, etc.): **solo** para GL-06 y para leer el backend. No usarlas para el frontend.
- Comandos de `/opsx:*` y skills `openspec-*`: los provee `openspec init` en la raíz (los repos originales traen los suyos en `backend/.opencode/` y `frontend/.opencode/`).

## Entregables de la cátedra

ZIP por grupo (generado con `git archive --format=zip -o entrega.zip HEAD`) con `frontend/`, `backend/`, `README.md`, `DEPLOY.md` y `evidencia/`. **Excluir** `.env`, `.git`, dependencias instaladas y credenciales. La URL desplegada debe seguir operativa durante la corrección.
