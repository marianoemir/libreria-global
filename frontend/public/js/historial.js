// ============================================================
// js/historial.js — Historial y detalle de ventas (Ejercicio 3)
// Dueño: GL-05 (ver CHANGES.md y docs/DIVISION-DEL-EQUIPO.md)
// Contrato: docs/ARQUITECTURA-FRONTEND.md · API: docs/CONTRATO-API.md
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});
  var LIMITE = 20;
  var offsetActual = 0;
  var paginaActual = [];
  var leyendoLista = false;
  var leyendoDetalle = false;
  var buscandoVentaRegistrada = false;
  var reintentoPendiente = null;

  function mostrarError(mensaje) {
    var error = L.util.porId("historial-error");
    var texto = L.util.porId("historial-error-texto");
    var reintentar = L.util.porId("historial-reintentar");
    if (texto) texto.textContent = mensaje;
    if (error) error.hidden = false;
    if (reintentar) reintentar.hidden = false;
  }

  function limpiarError() {
    var error = L.util.porId("historial-error");
    var texto = L.util.porId("historial-error-texto");
    var reintentar = L.util.porId("historial-reintentar");
    if (error) error.hidden = true;
    if (texto) texto.textContent = "";
    if (reintentar) reintentar.hidden = true;
  }

  function registrarClientes(ventas) {
    (ventas || []).forEach(function (venta) {
      if (venta && venta.cliente) L.registrarCliente(venta.cliente);
    });
  }

  function dibujarPagina(ventas) {
    var cuerpo = L.util.porId("historial-lista");
    var vacio = L.util.porId("historial-vacio");
    var paginacion = L.util.porId("historial-paginacion");
    var anterior = L.util.porId("historial-anterior");
    var siguiente = L.util.porId("historial-siguiente");
    var numero = L.util.porId("historial-pagina");
    if (!cuerpo) return;
    paginaActual = ventas;
    registrarClientes(ventas);
    L.util.limpiar(cuerpo);
    ventas.forEach(function (venta) {
      var fila = L.util.el("tr");
      fila.appendChild(L.util.el("td", null, venta.id));
      fila.appendChild(L.util.el("td", null, L.util.fechaLocal(venta.fecha)));
      fila.appendChild(L.util.el("td", null, venta.cliente ? venta.cliente.nombre : ""));
      fila.appendChild(L.util.el("td", null, L.util.importe(venta.total)));
      var boton = L.util.el("button", { type: "button", className: "boton" }, "Ver detalle");
      boton.setAttribute("aria-label", "Ver detalle de la venta " + venta.id);
      boton.addEventListener("click", function () { abrirDetalle(venta.id); });
      var celda = L.util.el("td");
      celda.appendChild(boton);
      fila.appendChild(celda);
      cuerpo.appendChild(fila);
    });
    if (vacio) vacio.hidden = offsetActual !== 0 || ventas.length !== 0;
    if (paginacion) paginacion.hidden = ventas.length === 0 && offsetActual === 0;
    if (anterior) anterior.disabled = offsetActual === 0;
    if (siguiente) siguiente.disabled = ventas.length < LIMITE;
    if (numero) numero.textContent = "Página " + (Math.floor(offsetActual / LIMITE) + 1);
  }

  async function cargarPagina(offset) {
    if (leyendoLista) return;
    leyendoLista = true;
    reintentoPendiente = { tipo: "lista", offset: offset };
    var cargando = L.util.porId("historial-cargando");
    if (cargando) cargando.hidden = false;
    limpiarError();
    try {
      var respuesta = await L.api.get("/ventas/", { limit: LIMITE, offset: offset });
      offsetActual = offset;
      dibujarPagina(Array.isArray(respuesta.data) ? respuesta.data : []);
      reintentoPendiente = null;
    } catch (e) {
      mostrarError(L.util.mensajeDeError(e));
    } finally {
      leyendoLista = false;
      if (cargando) cargando.hidden = true;
    }
  }

  function dibujarDetalle(venta) {
    var destino = L.util.porId("historial-detalle");
    if (!destino) return;
    L.util.limpiar(destino);
    if (venta.cliente) L.registrarCliente(venta.cliente);
    var detalle = L.util.el("section", { className: "historial-detalle" });
    detalle.appendChild(L.util.el("h3", null, "Detalle de venta " + venta.id));
    detalle.appendChild(L.util.el("p", null, "Fecha: " + L.util.fechaLocal(venta.fecha)));
    detalle.appendChild(L.util.el("p", null, "Cliente: " + (venta.cliente ? venta.cliente.nombre : "")));
    var lista = L.util.el("ul");
    (venta.renglones || []).forEach(function (renglon) {
      lista.appendChild(L.util.el("li", null,
        renglon.titulo + " × " + renglon.cantidad +
        " — precio unitario " + L.util.importe(renglon.precio_unitario) +
        "; subtotal " + L.util.importe(renglon.subtotal)
      ));
    });
    detalle.appendChild(lista);
    detalle.appendChild(L.util.el("p", { className: "historial-detalle-total" }, "Total: " + L.util.importe(venta.total)));
    destino.appendChild(detalle);
  }

  async function abrirDetalle(id) {
    if (leyendoDetalle) return;
    leyendoDetalle = true;
    reintentoPendiente = { tipo: "detalle", id: id };
    limpiarError();
    var cargando = L.util.porId("historial-cargando");
    var destino = L.util.porId("historial-detalle");
    if (cargando) cargando.hidden = false;
    if (destino) {
      L.util.limpiar(destino);
      destino.appendChild(L.util.el("p", null, "Cargando detalle de la venta " + id + "…"));
    }
    try {
      var respuesta = await L.api.get("/ventas/" + id);
      dibujarDetalle(respuesta.data);
      reintentoPendiente = null;
    } catch (e) {
      if (destino) L.util.limpiar(destino);
      mostrarError(L.util.mensajeDeError(e));
    } finally {
      leyendoDetalle = false;
      if (cargando) cargando.hidden = true;
    }
  }

  async function buscarVentaRegistrada(id, desdeOffset) {
    if (buscandoVentaRegistrada) return;
    buscandoVentaRegistrada = true;
    var offset = desdeOffset;
    var cargando = L.util.porId("historial-cargando");
    if (cargando) cargando.hidden = false;
    limpiarError();
    try {
      while (true) {
        reintentoPendiente = { tipo: "venta-registrada", id: id, offset: offset };
        var respuesta = await L.api.get("/ventas/", { limit: LIMITE, offset: offset });
        var ventas = Array.isArray(respuesta.data) ? respuesta.data : [];
        var encontrada = ventas.some(function (venta) { return String(venta.id) === String(id); });
        if (encontrada) {
          offsetActual = offset;
          dibujarPagina(ventas);
          reintentoPendiente = null;
          limpiarError();
          return;
        }
        if (ventas.length < LIMITE) {
          reintentoPendiente = { tipo: "venta-registrada", id: id, offset: 0 };
          mostrarError("La venta " + id + " no se localizó en el historial. Podés reintentar la consulta.");
          return;
        }
        offset += LIMITE;
      }
    } catch (e) {
      mostrarError("No se pudo actualizar el historial después de confirmar la venta: " + L.util.mensajeDeError(e));
    } finally {
      buscandoVentaRegistrada = false;
      if (cargando) cargando.hidden = true;
    }
  }

  function reintentar() {
    if (reintentoPendiente && reintentoPendiente.tipo === "lista") {
      cargarPagina(reintentoPendiente.offset);
    } else if (reintentoPendiente && reintentoPendiente.tipo === "detalle") {
      abrirDetalle(reintentoPendiente.id);
    } else if (reintentoPendiente && reintentoPendiente.tipo === "venta-registrada") {
      buscarVentaRegistrada(reintentoPendiente.id, reintentoPendiente.offset);
    }
  }

  function iniciar() {
    var anterior = L.util.porId("historial-anterior");
    var siguiente = L.util.porId("historial-siguiente");
    var reintentarBoton = L.util.porId("historial-reintentar");
    if (anterior) anterior.addEventListener("click", function () { cargarPagina(Math.max(0, offsetActual - LIMITE)); });
    if (siguiente) siguiente.addEventListener("click", function () { cargarPagina(offsetActual + LIMITE); });
    if (reintentarBoton) reintentarBoton.addEventListener("click", reintentar);
    document.addEventListener("libreria:venta-registrada", function (evento) {
      var detalle = evento && evento.detail;
      var id = detalle && typeof detalle === "object" ? detalle.id : detalle;
      if (id !== undefined && id !== null) buscarVentaRegistrada(id, 0);
    });
    cargarPagina(0);
  }

  L.historial = { iniciar: iniciar };
})();
