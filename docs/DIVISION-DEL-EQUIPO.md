# División del equipo — Global (3 integrantes)

> Propuesta de reparto basada en cómo se trabajó el backend (`backend/docs/DIVISION-DEL-EQUIPO.md`). **Ajustable entre ustedes**: si cambian algo, editen esta tabla y `CHANGES.md` en el mismo commit.
> Cierre del campus: **martes 17/11/2026 00:00**. Meta interna: **entregar el lunes 16/11 antes de las 20:00**.

## Quién hace qué

| Change | Qué es | Dueño | Revisor | Horas (orientativas) |
|---|---|---|---|---|
| Setup de la raíz | `openspec init`, `AGENTS.md`/`CLAUDE.md`, `CHANGES.md`, docs | Mariano | — | 0,5 |
| **GL-01** monorepo-docker-frontend | Dockerfile + Nginx del frontend, prueba local | Mariano | Andrés | 2–3 |
| **GL-06** cors-backend | CORS por variable de entorno | Mariano | Facundo | 1 |
| **GL-02** cliente-http | `api.js`, `util.js`, partición del JS, sin `localStorage` | Facundo | Mariano | 2–3 |
| **GL-04** altas-fetch | Alta de libros y clientes (Ej. 2) | Facundo | Andrés | 4–5 |
| **GL-03** catalogo-fetch | Catálogo con búsqueda y paginación (Ej. 1) | Andrés | Facundo | 3–4 |
| **GL-05** ventas-historial-fetch | Ventas e historial (Ej. 3, el más pesado) | Andrés | Mariano | 5–6 |
| **GL-07** despliegue-easypanel | Servicios en Easypanel, `DEPLOY.md` | Mariano | Andrés | 4–5 |
| **GL-08** evidencia-entrega | G-01…G-07, README, ZIP | todos | cruzado | 3–4 |

**Por qué este reparto:** Mariano ya lleva Docker, el VPS y `main.py`; Facundo hizo los CRUD de editoriales, géneros y autores (que consume el alta de libros); Andrés hizo clientes y los casos `.http` de ventas (que consume el Ejercicio 3).

**Las horas son estimaciones mías**, no medidas: sirven para ordenar, no para prometer plazos.

## Cronograma propuesto

| Cuándo | Qué | Quién |
|---|---|---|
| **Sáb 14 · mañana** | Setup de la raíz y push (los otros dos esperan el `git pull`). Después GL-01 y GL-06 | Mariano |
| **Sáb 14 · mañana** | Leer `docs/Consignas_Global.pdf`, `CONTEXTO-GLOBAL.md` y `docs/ARRANQUE.md`; **dejar corriendo el backend local con seed** | Facundo y Andrés |
| **Sáb 14 · mediodía** | **GL-02** (propose → apply → archive → merge). Es el cuello de botella: todo lo demás espera | Facundo |
| **Sáb 14 · tarde y noche** | **Gate A:** en paralelo GL-03 (Andrés), GL-04 (Facundo), GL-05 (Andrés, después del 03) | Facundo, Andrés |
| **Dom 15** | Terminar y mergear GL-03/04/05. Integración local completa (G-01…G-06 en `127.0.0.1:8080`). **Gate B** ⇒ GL-07: despliegue | todos / Mariano |
| **Lun 16 · mañana** | GL-07 terminado y verificado en la URL pública. Empieza GL-08 | Mariano / todos |
| **Lun 16 · hasta 20:00** | GL-08: evidencia, README, DEPLOY, ZIP, entrega | todos |
| **Lun 16 · 20:00–24:00** | **Colchón.** Solo para imprevistos, no para trabajo planificado | — |

> Si GL-02 no está mergeado el sábado a la tarde, es lo primero que hay que destrabar entre los tres.

## Reglas de coordinación

1. **Una rama por change:** `feature/gl-03-catalogo-fetch`, etc. Se parte de `main` actualizado (`git pull`).
2. **PR a `main` con «Create a merge commit»** (como en el backend). Lo revisa el revisor de la tabla **antes** de mergear. Si el revisor no está, otro integrante.
3. **Un commit por change archivado** además de los commits chicos de trabajo; mensajes convencionales: `feat(gl-03): …`, `fix(gl-04): …`, `docs(gl-07): …`.
4. **No se commitea ni se pushea sin que la persona lo pida** (regla del agente, ver `AGENTS.md`).
5. **Cada change toca solo sus archivos** (tabla siguiente). Si necesitás tocar algo ajeno, se lo pedís al dueño por el grupo.
6. **`git pull` antes de cada `propose`** y antes de abrir un PR.
7. **Nada de secretos** en commits, capturas ni mensajes: ni `.env`, ni `DATABASE_URL` real, ni contraseñas de la VPS.

## Archivos y dueños (para evitar conflictos de merge)

| Archivo / carpeta | Dueño | Se toca en |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md` (idénticos), `CHANGES.md`, `docs/` | Mariano (cualquiera puede proponer cambios) | todos: solo marcar `[x]` en el propio change |
| `frontend/Dockerfile`, `.dockerignore`, `default.conf.template` | Mariano | GL-01 |
| `backend/app/main.py`, `backend/app/core/config.py`, `backend/env.example` | Mariano | GL-06 |
| `frontend/public/js/util.js`, `api.js`, `app.js` | Facundo | GL-02 |
| `frontend/public/index.html` | Facundo la deja armada; **cada uno edita solo su sección** | GL-02 y luego cada uno |
| `frontend/public/js/libros.js`, `clientes.js` | Facundo | GL-04 |
| `frontend/public/js/catalogo.js` | Andrés | GL-03 |
| `frontend/public/js/ventas.js`, `historial.js` | Andrés | GL-05 |
| `frontend/public/css/styles.css` | de todos: **solo agregar reglas al final** | cada change |
| `README.md`, `DEPLOY.md`, `evidencia/` | Mariano arma el esqueleto; todos completan en GL-08 | GL-07, GL-08 |
| `openspec/changes/<change>/` | el dueño del change | su change |

Si hay conflicto en `CHANGES.md` (dos personas marcaron `[x]`), se conservan **ambas** marcas.

## Qué hace cada uno al empezar (checklist)

**Todos:**
- [ ] `git clone https://github.com/marianoemir/libreria-global.git` (o `git pull` si ya lo tenés).
- [ ] Leer `docs/Consignas_Global.pdf` (la consigna completa), `CONTEXTO-GLOBAL.md` y `CHANGES.md`.
- [ ] Seguir `docs/ARRANQUE.md` hasta tener el **backend local con seed** funcionando.
- [ ] Abrir el agente **en la raíz del repo** y arrancar tu change con el prompt de `docs/PROMPTS-OPSX.md`.

**Mariano:** setup de la raíz (`docs/ARRANQUE.md` §2) → GL-01 → GL-06 → (después del Gate B) GL-07.
**Facundo:** esperar el push de la raíz → GL-02 → GL-04.
**Andrés:** esperar el push de la raíz → preparar GL-03 y GL-05 (leer y dejar listo el `propose`) → arrancar cuando GL-02 esté mergeado.

## Cómo pedir ayuda al agente sin perder tokens

- Una **sesión nueva por change** (no arrastrar contexto viejo).
- Pedir siempre **archivos puntuales** (los de «Leer antes» del change), no «todo el repo».
- Dejar el avance en Git seguido; así se puede retomar sin repetir trabajo.
- Si el agente «razonó» un resultado, no vale: la evidencia es la salida real (Red del navegador, respuesta de la API, resultado del comando).
