// ============================================================
// js/clientes.js — Alta y búsqueda de clientes (Ejercicio 2)
// Dueño: GL-04 (ver CHANGES.md y docs/DIVISION-DEL-EQUIPO.md)
// Contrato: docs/ARQUITECTURA-FRONTEND.md · API: docs/CONTRATO-API.md
//
// Alcance del módulo:
//   - Alta de cliente: POST /clientes/ (nombre y email, sin campos extra).
//   - Búsqueda por ID: GET /clientes/{id}. La API NO tiene listado de
//     clientes, por eso se consulta de a uno (design.md D1).
//   - Tabla de la sesión: se dibuja SOLO desde L.estado.clientes y se
//     redibuja al escuchar "libreria:clientes" (design.md D5 y D13).
//
// Nada se guarda en el navegador (AGENTS.md regla 1), todo el acceso a la API
// pasa por L.api (regla 2) y el texto se arma con textContent / L.util.el
// (regla 7).
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});

  // Guarda de reentrada del alta: evita un segundo POST mientras el primero
  // está en vuelo, incluso antes de que el navegador pinte el botón deshabilitado
  // (design.md D7).
  var enviando = false;

  // Búsqueda por ID: contador de secuencia para descartar respuestas viejas
  // (ARQUITECTURA-FRONTEND §Estados de interfaz) y último ID efectivamente
  // consultado, que es el que repite el botón «Reintentar» (design.md D9).
  var secuenciaBusqueda = 0;
  var ultimoIdBuscado = null;

  // --- Validación del alta -------------------------------------

  // Nombre no vacío después de trim (design.md D2).
  function validarNombre(nombre) {
    return nombre !== "" ? null : "Ingresá el nombre del cliente.";
  }

  // Email con formato texto@dominio: exactamente una «@», sin espacios y con
  // al menos un punto en el dominio. El servidor no valida el formato, así que
  // el rechazo es del cliente (CONTRATO-API §Cliente, design.md D2).
  function validarEmail(email) {
    if (email === "") return "Ingresá el email del cliente.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "El email no es válido. Usá el formato texto@dominio (por ejemplo ana.gomez@example.com).";
    }
    return null;
  }

  // --- Alta ----------------------------------------------------

  // 201: el registro devuelto alimenta el estado compartido y el formulario se
  // vacía. La tabla NO se redibuja acá: lo hace el listener de
  // "libreria:clientes" que dispara L.registrarCliente (design.md D13).
  function usarClienteCreado(cliente) {
    var registro = cliente || {};
    var nombre = registro.nombre ? String(registro.nombre) : "";

    L.registrarCliente(registro);

    L.util.mostrar(
      L.util.porId("clientes-error"),
      ""
    );
    L.util.mostrar(
      L.util.porId("clientes-exito"),
      nombre ? "Cliente «" + nombre + "» agregado." : "Cliente agregado."
    );

    var form = L.util.porId("clientes-form");
    if (form) form.reset();
  }

  async function enviarCliente() {
    if (enviando) return;

    var form = L.util.porId("clientes-form");
    var campoNombre = L.util.porId("cliente-nombre");
    var campoEmail = L.util.porId("cliente-email");
    var boton = L.util.porId("clientes-agregar-boton");
    var errorEl = L.util.porId("clientes-error");
    var exitoEl = L.util.porId("clientes-exito");

    var nombre = campoNombre ? String(campoNombre.value).trim() : "";
    var email = campoEmail ? String(campoEmail.value).trim() : "";

    // Validación local: si falla, no se llama a la API (design.md D2).
    var problema = validarNombre(nombre) || validarEmail(email);
    if (problema) {
      L.util.mostrar(exitoEl, "");
      L.util.mostrar(errorEl, problema);
      if (!nombre && campoNombre) {
        campoNombre.focus();
      } else if (campoEmail) {
        campoEmail.focus();
      }
      return;
    }

    L.util.mostrar(errorEl, "");
    L.util.mostrar(exitoEl, "");

    enviando = true;
    if (boton) boton.disabled = true;

    try {
      // Cuerpo con exactamente los dos campos del contrato, ruta con barra final.
      var r = await L.api.post("/clientes/", { nombre: nombre, email: email });
      usarClienteCreado(r.data);
    } catch (e) {
      // 409/422/404 → el mensaje del servidor (e.mensaje = detail) ya viene
      // listo de api.js; e.esRed distingue la caída de conexión. No se toca el
      // formulario: los datos escritos se conservan (design.md D4). Tampoco se
      // reintenta solo: el reintento es volver a pulsar el botón (D9).
      L.util.mostrar(errorEl, L.util.mensajeDeError(e));
    } finally {
      enviando = false;
      if (boton) boton.disabled = false;
    }
  }

  // --- Búsqueda por ID -----------------------------------------

  // Habilita o deshabilita los controles de la búsqueda mientras hay una
  // petición en vuelo.
  function controlesBusqueda(activos) {
    var boton = L.util.porId("clientes-buscar-boton");
    var reintentar = L.util.porId("clientes-buscar-reintentar");
    if (boton) boton.disabled = !activos;
    if (reintentar) reintentar.disabled = !activos;
  }

  // Repite la última consulta: la usa el botón «Reintentar», que solo se
  // muestra después de un fallo (design.md D9).
  function reintentarBusqueda() {
    if (ultimoIdBuscado === null) return;
    ejecutarBusqueda(ultimoIdBuscado);
  }

  async function ejecutarBusqueda(id) {
    var mensajeEl = L.util.porId("clientes-buscar-mensaje");
    var reintentarEl = L.util.porId("clientes-buscar-reintentar");
    var turno = (secuenciaBusqueda += 1);

    ultimoIdBuscado = id;
    if (reintentarEl) reintentarEl.hidden = true;
    controlesBusqueda(false);
    L.util.mostrar(mensajeEl, "Buscando el cliente " + id + "…");

    try {
      var r = await L.api.get("/clientes/" + id);

      // Respuesta vieja: ya hay otra búsqueda más nueva en curso.
      if (turno !== secuenciaBusqueda) return;

      var cliente = r.data || {};
      // El cliente encontrado entra al estado compartido (y con eso a la tabla,
      // por el evento "libreria:clientes"): design.md D5 y D13.
      L.registrarCliente(cliente);
      L.util.mostrar(
        mensajeEl,
        "Cliente " + cliente.id + ": " + cliente.nombre + " (" + cliente.email + ")"
      );
    } catch (e) {
      if (turno !== secuenciaBusqueda) return;
      // 404 → "Cliente no encontrado." del servidor; e.esRed → mensaje de
      // conexión; 5xx → servidor no disponible. En los tres casos se ofrece
      // «Reintentar» con el mismo ID.
      L.util.mostrar(mensajeEl, L.util.mensajeDeError(e));
      if (reintentarEl) reintentarEl.hidden = false;
    } finally {
      if (turno === secuenciaBusqueda) controlesBusqueda(true);
    }
  }

  function buscarCliente() {
    var campo = L.util.porId("cliente-buscar-id");
    var mensajeEl = L.util.porId("clientes-buscar-mensaje");
    var reintentarEl = L.util.porId("clientes-buscar-reintentar");

    // ID entero >= 1 o no se llama a la API (design.md D2).
    var id = L.util.enteroPositivo(campo ? campo.value : "");

    if (id === null) {
      ultimoIdBuscado = null;
      if (reintentarEl) reintentarEl.hidden = true;
      L.util.mostrar(mensajeEl, "Ingresá un ID de cliente entero mayor o igual a 1.");
      if (campo) campo.focus();
      return;
    }

    ejecutarBusqueda(id);
  }

  // --- Tabla de la sesión --------------------------------------

  // Único camino de dibujo: lee L.estado.clientes (sin array propio). Se llama
  // al arrancar y cada vez que el estado avisa un cambio (design.md D13).
  function dibujarTabla() {
    var cuerpo = L.util.porId("clientes-lista");
    var vacioEl = L.util.porId("clientes-vacio");
    if (!cuerpo) return;

    var clientes = Array.from(L.estado.clientes.values());
    // Orden estable por ID para que la tabla no cambie de orden entre altas y
    // búsquedas (el Map conserva inserción; acá se ordena explícitamente).
    clientes.sort(function (a, b) { return a.id - b.id; });

    L.util.limpiar(cuerpo);

    clientes.forEach(function (cliente) {
      var fila = L.util.el("tr");
      fila.appendChild(L.util.el("td", null, cliente.id));
      fila.appendChild(L.util.el("td", null, cliente.nombre));
      fila.appendChild(L.util.el("td", null, cliente.email));
      cuerpo.appendChild(fila);
    });

    if (vacioEl) vacioEl.hidden = clientes.length > 0;
  }

  // --- Arranque ------------------------------------------------

  function iniciar() {
    var form = L.util.porId("clientes-form");
    var botonAgregar = L.util.porId("clientes-agregar-boton");
    var botonBuscar = L.util.porId("clientes-buscar-boton");
    var botonReintentar = L.util.porId("clientes-buscar-reintentar");

    if (form) {
      // El marcado es novalidate y el botón es type="button": la tecla Enter se
      // atiende acá, sin POST nativo a action="#" (design.md D7).
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        enviarCliente();
      });
    }
    if (botonAgregar) {
      botonAgregar.addEventListener("click", function () {
        enviarCliente();
      });
    }
    if (botonBuscar) {
      botonBuscar.addEventListener("click", function () {
        buscarCliente();
      });
    }
    if (botonReintentar) {
      botonReintentar.addEventListener("click", reintentarBusqueda);
    }

    // La tabla reacciona al alta y a la consulta por este evento, nunca por
    // llamada directa desde los manejadores.
    document.addEventListener("libreria:clientes", dibujarTabla);

    // Estado inicial: al recargar no hay nada persistido, así que la tabla
    // arranca vacía con su mensaje.
    dibujarTabla();
  }

  L.clientes = { iniciar: iniciar };
})();
