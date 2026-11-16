// ============================================================
// js/ventas.js — Armado y confirmación de ventas (Ejercicio 3)
// Dueño: GL-05 (ver CHANGES.md y docs/DIVISION-DEL-EQUIPO.md)
// Contrato: docs/ARQUITECTURA-FRONTEND.md · API: docs/CONTRATO-API.md
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});
  var libros = [];
  var librosPorId = new Map();
  var offsetLibrosPendiente = 0;
  var cargandoLibros = false;
  var ultimoIdClienteBuscado = null;
  var buscandoCliente = false;
  var borrador = [];
  var enviandoVenta = false;

  function cargarLibros() {
    if (cargandoLibros) return;
    cargandoLibros = true;
    var cargandoEl = L.util.porId("ventas-libros-cargando");
    var errorEl = L.util.porId("ventas-libros-error");
    var errorTextoEl = L.util.porId("ventas-libros-error-texto");
    var reintentarEl = L.util.porId("ventas-libros-reintentar");
    var vacioEl = L.util.porId("ventas-libros-vacio");
    var botonAgregar = L.util.porId("ventas-agregar-renglon-boton");
    if (cargandoEl) cargandoEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
    if (reintentarEl) reintentarEl.hidden = true;
    if (vacioEl) vacioEl.hidden = true;
    if (botonAgregar) botonAgregar.disabled = true;

    (async function () {
      try {
        var pagina;
        do {
          pagina = await L.api.get("/libros/", { limit: 100, offset: offsetLibrosPendiente });
          var recibidos = Array.isArray(pagina.data) ? pagina.data : [];
          recibidos.forEach(function (libro) {
            if (!librosPorId.has(libro.id)) {
              librosPorId.set(libro.id, libro);
              libros.push(libro);
            }
          });
          offsetLibrosPendiente += recibidos.length;
          dibujarSelectorLibros();
        } while (recibidos.length === 100);

        if (vacioEl) vacioEl.hidden = libros.length > 0;
        if (botonAgregar) botonAgregar.disabled = libros.length === 0;
      } catch (e) {
        if (errorTextoEl) errorTextoEl.textContent = L.util.mensajeDeError(e);
        if (errorEl) errorEl.hidden = false;
        if (reintentarEl) reintentarEl.hidden = false;
      } finally {
        cargandoLibros = false;
        if (cargandoEl) cargandoEl.hidden = true;
      }
    })();
  }

  function dibujarSelectorLibros() {
    var selector = L.util.porId("renglon-libro");
    if (!selector) return;
    L.util.limpiar(selector);
    var inicial = L.util.el("option", { value: "", disabled: true, selected: true }, "Seleccioná un libro");
    selector.appendChild(inicial);
    libros.forEach(function (libro) {
      selector.appendChild(L.util.el("option", { value: libro.id }, libro.titulo));
    });
  }

  function dibujarSelectorClientes() {
    var selector = L.util.porId("venta-cliente");
    if (!selector) return;
    var seleccionado = selector.value;
    L.util.limpiar(selector);
    selector.appendChild(L.util.el("option", {
      value: "",
      disabled: true,
      selected: !seleccionado
    }, "Seleccioná un cliente"));
    Array.from(L.estado.clientes.values()).sort(function (a, b) {
      return a.id - b.id;
    }).forEach(function (cliente) {
      selector.appendChild(L.util.el(
        "option",
        { value: String(cliente.id), selected: String(cliente.id) === seleccionado },
        cliente.id + " — " + cliente.nombre
      ));
    });
    if (seleccionado) selector.value = seleccionado;
  }

  async function ejecutarBusquedaCliente(id) {
    if (buscandoCliente) return;
    var campo = L.util.porId("venta-cliente-id");
    var boton = L.util.porId("venta-cliente-buscar-boton");
    var reintentar = L.util.porId("ventas-cliente-reintentar");
    var mensaje = L.util.porId("venta-cliente-mensaje");
    ultimoIdClienteBuscado = id;
    buscandoCliente = true;
    if (boton) boton.disabled = true;
    if (reintentar) reintentar.hidden = true;
    L.util.mostrar(mensaje, "Buscando el cliente " + id + "…");
    try {
      var respuesta = await L.api.get("/clientes/" + id);
      var cliente = respuesta.data;
      L.registrarCliente(cliente);
      var selector = L.util.porId("venta-cliente");
      if (selector) selector.value = String(cliente.id);
      L.util.mostrar(mensaje, "Cliente " + cliente.id + ": " + cliente.nombre + " (" + cliente.email + ")");
    } catch (e) {
      L.util.mostrar(mensaje, L.util.mensajeDeError(e));
      if (reintentar) reintentar.hidden = false;
    } finally {
      buscandoCliente = false;
      if (boton) boton.disabled = false;
    }
  }

  function buscarCliente() {
    var campo = L.util.porId("venta-cliente-id");
    var id = L.util.enteroPositivo(campo ? campo.value : "");
    if (id === null) {
      L.util.mostrar(L.util.porId("venta-cliente-mensaje"), "Ingresá un ID de cliente entero mayor o igual a 1.");
      if (campo) campo.focus();
      return;
    }
    ejecutarBusquedaCliente(id);
  }

  function reintentarBusquedaCliente() {
    if (ultimoIdClienteBuscado !== null) ejecutarBusquedaCliente(ultimoIdClienteBuscado);
  }

  function dibujarBorrador() {
    var cuerpo = L.util.porId("ventas-renglones");
    var vacio = L.util.porId("ventas-renglones-vacio");
    var totalEl = L.util.porId("ventas-total");
    if (!cuerpo) return;
    L.util.limpiar(cuerpo);
    var total = 0;
    borrador.forEach(function (fila, indice) {
      var filaEl = L.util.el("tr");
      var cantidad = L.util.enteroPositivo(fila.cantidad);
      var subtotal = cantidad === null ? null : L.util.multiplicarImporte(fila.libro.precio, cantidad);
      if (subtotal !== null) total += subtotal;
      filaEl.appendChild(L.util.el("td", null, fila.libro.titulo));

      var cantidadEl = L.util.el("input", {
        type: "number",
        min: "1",
        step: "1",
        value: fila.cantidad,
        className: "campo"
      });
      cantidadEl.setAttribute("aria-label", "Cantidad de " + fila.libro.titulo);
      cantidadEl.addEventListener("change", function () {
        var nuevaCantidad = L.util.enteroPositivo(cantidadEl.value);
        borrador[indice].cantidad = cantidadEl.value;
        if (nuevaCantidad === null) {
          L.util.mostrar(L.util.porId("ventas-error"), "La cantidad debe ser un entero positivo.");
        } else {
          L.util.mostrar(L.util.porId("ventas-error"), "");
        }
        dibujarBorrador();
      });
      var cantidadCelda = L.util.el("td");
      cantidadCelda.appendChild(cantidadEl);
      filaEl.appendChild(cantidadCelda);
      filaEl.appendChild(L.util.el("td", null, L.util.importe(fila.libro.precio) + " (estimado)"));
      filaEl.appendChild(L.util.el("td", null, subtotal === null ? "Subtotal estimado: —" : "Subtotal estimado: " + L.util.importe(subtotal)));

      var quitar = L.util.el("button", { type: "button", className: "boton" }, "Quitar");
      quitar.setAttribute("aria-label", "Quitar " + fila.libro.titulo);
      quitar.addEventListener("click", function () {
        borrador.splice(indice, 1);
        L.util.mostrar(L.util.porId("ventas-error"), "");
        dibujarBorrador();
      });
      var accionCelda = L.util.el("td");
      accionCelda.appendChild(quitar);
      filaEl.appendChild(accionCelda);
      cuerpo.appendChild(filaEl);
    });
    if (vacio) vacio.hidden = borrador.length > 0;
    if (totalEl) totalEl.textContent = L.util.importe(total) + " (estimado)";
  }

  function agregarRenglon() {
    var selector = L.util.porId("renglon-libro");
    var cantidadEl = L.util.porId("renglon-cantidad");
    var idLibro = L.util.enteroPositivo(selector ? selector.value : "");
    var cantidad = L.util.enteroPositivo(cantidadEl ? cantidadEl.value : "");
    var libro = idLibro === null ? null : librosPorId.get(idLibro);
    if (!libro) {
      L.util.mostrar(L.util.porId("ventas-error"), "Seleccioná un libro del catálogo.");
      return;
    }
    if (cantidad === null) {
      L.util.mostrar(L.util.porId("ventas-error"), "La cantidad debe ser un entero positivo.");
      if (cantidadEl) cantidadEl.focus();
      return;
    }
    var existente = borrador.find(function (fila) { return fila.libro.id === libro.id; });
    if (existente) {
      var anterior = L.util.enteroPositivo(existente.cantidad);
      if (anterior === null) {
        L.util.mostrar(L.util.porId("ventas-error"), "Corregí la cantidad del renglón antes de agregar el mismo libro.");
        return;
      }
      existente.cantidad = anterior + cantidad;
    } else {
      borrador.push({ libro: libro, cantidad: cantidad });
    }
    L.util.mostrar(L.util.porId("ventas-error"), "");
    if (cantidadEl) cantidadEl.value = "1";
    dibujarBorrador();
  }

  function dibujarComprobante(venta) {
    var destino = L.util.porId("ventas-comprobante");
    if (!destino) return;
    L.util.limpiar(destino);
    var comprobante = L.util.el("section", { className: "venta-comprobante" });
    comprobante.appendChild(L.util.el("h3", null, "Comprobante de venta " + venta.id));
    comprobante.appendChild(L.util.el("p", null, "Fecha: " + L.util.fechaLocal(venta.fecha)));
    var cliente = venta.cliente || {};
    comprobante.appendChild(L.util.el("p", null, "Cliente: " + (cliente.nombre || "")));
    var lista = L.util.el("ul");
    (venta.renglones || []).forEach(function (renglon) {
      lista.appendChild(L.util.el("li", null,
        renglon.titulo + " × " + renglon.cantidad +
        " — " + L.util.importe(renglon.precio_unitario) +
        "; subtotal " + L.util.importe(renglon.subtotal)
      ));
    });
    comprobante.appendChild(lista);
    comprobante.appendChild(L.util.el("p", { className: "venta-comprobante-total" }, "Total: " + L.util.importe(venta.total)));
    destino.appendChild(comprobante);
  }

  async function confirmarVenta() {
    if (enviandoVenta) return;
    var boton = L.util.porId("ventas-confirmar-boton");
    var clienteSelect = L.util.porId("venta-cliente");
    var renglones = [];
    for (var i = 0; i < borrador.length; i += 1) {
      var cantidad = L.util.enteroPositivo(borrador[i].cantidad);
      if (cantidad === null) {
        L.util.mostrar(L.util.porId("ventas-error"), "La cantidad de cada renglón debe ser un entero positivo.");
        return;
      }
      renglones.push({ libro_id: borrador[i].libro.id, cantidad: cantidad });
    }
    if (renglones.length === 0) {
      L.util.mostrar(L.util.porId("ventas-error"), "Agregá al menos un libro antes de confirmar.");
      return;
    }
    var clienteId = L.util.enteroPositivo(clienteSelect ? clienteSelect.value : "");
    if (clienteId === null) {
      L.util.mostrar(L.util.porId("ventas-error"), "Seleccioná un cliente antes de confirmar la venta.");
      return;
    }
    var cuerpo = {
      cliente_id: clienteId,
      renglones: renglones
    };
    enviandoVenta = true;
    if (boton) boton.disabled = true;
    L.util.mostrar(L.util.porId("ventas-error"), "");
    L.util.mostrar(L.util.porId("ventas-exito"), "");
    try {
      var respuesta = await L.api.post("/ventas/", cuerpo);
      var venta = respuesta.data;
      dibujarComprobante(venta);
      borrador = [];
      dibujarBorrador();
      L.util.mostrar(L.util.porId("ventas-exito"), "Venta " + venta.id + " confirmada.");
      document.dispatchEvent(new CustomEvent("libreria:venta-registrada", { detail: { id: venta.id } }));
    } catch (e) {
      if (e && (e.status === 409 || e.status === 422)) {
        L.util.mostrar(L.util.porId("ventas-error"), L.util.mensajeDeError(e));
      } else if (e && e.esRed) {
        L.util.mostrar(
          L.util.porId("ventas-error"),
          "Error de conexión: " + L.util.mensajeDeError(e) +
          " El resultado de la venta puede ser incierto. Revisá el historial antes de reenviar manualmente."
        );
      } else if (e && e.status >= 500) {
        L.util.mostrar(
          L.util.porId("ventas-error"),
          "Error del servidor: " + L.util.mensajeDeError(e) +
          " El resultado de la venta puede ser incierto. Revisá el historial antes de reenviar manualmente."
        );
      } else {
        L.util.mostrar(L.util.porId("ventas-error"), L.util.mensajeDeError(e));
      }
    } finally {
      enviandoVenta = false;
      if (boton) boton.disabled = false;
    }
  }

  function iniciar() {
    var reintentarLibros = L.util.porId("ventas-libros-reintentar");
    var buscarClienteBoton = L.util.porId("venta-cliente-buscar-boton");
    var reintentarCliente = L.util.porId("ventas-cliente-reintentar");
    var agregarRenglonBoton = L.util.porId("ventas-agregar-renglon-boton");
    var confirmarBoton = L.util.porId("ventas-confirmar-boton");
    if (reintentarLibros) reintentarLibros.addEventListener("click", cargarLibros);
    if (buscarClienteBoton) buscarClienteBoton.addEventListener("click", buscarCliente);
    if (reintentarCliente) reintentarCliente.addEventListener("click", reintentarBusquedaCliente);
    if (agregarRenglonBoton) agregarRenglonBoton.addEventListener("click", agregarRenglon);
    if (confirmarBoton) confirmarBoton.addEventListener("click", confirmarVenta);
    document.addEventListener("libreria:clientes", dibujarSelectorClientes);
    dibujarSelectorClientes();
    dibujarBorrador();
    cargarLibros();
  }

  L.ventas = { iniciar: iniciar };
})();
