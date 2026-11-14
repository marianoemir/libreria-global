# Spec Delta — frontend-app-shell

## Purpose

Define la estructura del frontend: qué archivos se cargan y en qué orden, el contrato `window.Libreria` que usan los módulos para no acoplarse, el estado compartido que vive en memoria y la prohibición de persistir registros en el navegador.

## ADDED Requirements

### Requirement: Archivos y orden de carga

`frontend/public/index.html` MUST cargar, con `defer` y en este orden, `js/util.js`, `js/api.js`, `js/catalogo.js`, `js/libros.js`, `js/clientes.js`, `js/ventas.js`, `js/historial.js` y `js/app.js`. Cada archivo MUST existir en `frontend/public/js/` y la página MUST NOT necesitar ningún otro script para funcionar.

#### Scenario: El HTML declara los ocho scripts en orden

- **WHEN** se inspecciona `index.html`
- **THEN** aparecen los ocho `<script>` con `defer`, en el orden util, api, catalogo, libros, clientes, ventas, historial, app

#### Scenario: Todos los archivos existen y se sirven

- **WHEN** se solicitan los ocho archivos por el servidor del frontend
- **THEN** cada uno responde 200 con JavaScript válido

### Requirement: Contrato `window.Libreria` y arranque

Cada módulo MUST registrarse como `window.Libreria.<modulo> = { iniciar }` y MUST NOT leer ni escribir variables internas de otro módulo. El arranque MUST invocar `iniciar()` una sola vez por módulo, en el orden catálogo, libros, clientes, ventas e historial, cuando el documento terminó de cargar, e ignorar sin error los módulos no registrados.

#### Scenario: El arranque inicializa los cinco módulos

- **WHEN** la página termina de cargar con los cinco módulos registrados
- **THEN** `iniciar()` se ejecuta una vez en cada uno, en el orden catálogo, libros, clientes, ventas e historial

#### Scenario: Un módulo ausente no rompe el arranque

- **WHEN** uno de los módulos no está registrado
- **THEN** el arranque continúa con los demás y la consola no muestra errores

### Requirement: Módulos pendientes no rompen la página

Los módulos creados por esta base MUST quedar sin lógica de negocio y MUST NOT llamar a la API ni mostrar registros. Con ellos, la página MUST cargar sin errores de consola, sin peticiones a `/api/` y con todas las secciones del menú visibles, hasta que los changes de cada módulo se archiven.

#### Scenario: La página carga vacía pero sana

- **WHEN** se abre la página en el navegador con los módulos pendientes
- **THEN** no hay errores en consola ni peticiones a `/api/` en la pestaña Red
- **AND** las secciones Catálogo, Libros, Clientes, Ventas e Historial se pueden alcanzar desde el menú

### Requirement: Sin persistencia de registros en el navegador

El código servido MUST NOT usar `localStorage`, `sessionStorage` ni `indexedDB` para guardar libros, clientes, ventas ni ningún registro. El único estado compartido MUST vivir en memoria durante la sesión y perderse al recargar.

#### Scenario: El código servido no menciona storage del navegador

- **WHEN** se busca `localstorage`, `sessionstorage` o `indexeddb` sin distinguir mayúsculas en `frontend/public/`
- **THEN** no hay ninguna coincidencia

#### Scenario: El estado compartido no sobrevive a la recarga

- **WHEN** se registra un cliente en memoria y se recarga la página
- **THEN** el estado de clientes de la nueva sesión está vacío, porque se rearma consultando la API

### Requirement: Estado de clientes compartido en memoria

Como la API no lista clientes, los clientes registrados o consultados en la sesión MUST recordarse en memoria indexados por `id` numérico, con `nombre` y `email`, descartando objetos inválidos y campos extra. Cada registro MUST emitir un evento del documento para que los módulos interesados se redibujen.

#### Scenario: Se guarda solo lo válido y se avisa

- **WHEN** se registra `{id: 2, nombre, email, perfil}` y luego un objeto sin `id` numérico
- **THEN** el estado queda con el cliente 2 y solo los campos `id`, `nombre` y `email`
- **AND** se emite un único evento, porque el segundo objeto se descarta

### Requirement: Secciones e ID del borrador

`index.html` MUST contener las cinco secciones en el orden del menú, cada una con su prefijo de `id` documentado (`catalogo-`, `libro-`/`libros-`, `cliente-`/`clientes-`, `venta-`/`ventas-`/`renglon-`, `historial-`), y cada enlace del menú MUST apuntar a su sección.

#### Scenario: Las secciones y el menú coinciden

- **WHEN** se inspecciona `index.html`
- **THEN** existen `#catalogo`, `#libros`, `#clientes`, `#ventas` e `#historial`, y cada enlace del menú apunta al `id` de su sección

#### Scenario: Los prefijos de ID están disponibles para los dueños

- **WHEN** se buscan los prefijos documentados en `index.html`
- **THEN** cada prefijo aparece al menos una vez
