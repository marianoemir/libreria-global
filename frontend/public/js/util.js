// ============================================================
// js/util.js — Utilidades compartidas (GL-02)
// Contrato completo en docs/ARQUITECTURA-FRONTEND.md
// Se carga ANTES que api.js y que los módulos.
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});

  // --- DOM -----------------------------------------------------

  // Crea un elemento. props se asignan como propiedades (className, type, id...).
  // El texto va SIEMPRE por textContent: nunca innerHTML con datos de la API.
  function el(tag, props, texto) {
    var nodo = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) { nodo[k] = props[k]; });
    }
    if (texto !== undefined && texto !== null) nodo.textContent = String(texto);
    return nodo;
  }

  function porId(id) {
    return document.getElementById(id);
  }

  function limpiar(nodo) {
    if (!nodo) return;
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  }

  // Muestra un mensaje en un <p hidden>. Si texto es vacío, lo oculta.
  function mostrar(nodo, texto) {
    if (!nodo) return;
    nodo.textContent = texto || "";
    nodo.hidden = !texto;
  }

  function ocultar(nodo) {
    if (!nodo) return;
    nodo.textContent = "";
    nodo.hidden = true;
  }

  // --- Formatos ------------------------------------------------

  // Importes: la API devuelve strings con 2 decimales ("25000.00").
  // Se muestran TAL CUAL (sin recalcular) para que coincidan con la API.
  // Solo si llega un número (estimaciones del borrador) se formatea.
  function importe(valor) {
    if (valor === undefined || valor === null || valor === "") return "$0.00";
    if (typeof valor === "number") return "$" + valor.toFixed(2);
    return "$" + String(valor);
  }

  // Estimaciones del borrador de venta: aritmética en centavos enteros
  // para no arrastrar errores de punto flotante. Devuelve un número (pesos).
  function multiplicarImporte(precio, cantidad) {
    var centavos = Math.round(Number(precio) * 100);
    return (centavos * cantidad) / 100;
  }

  function fechaLocal(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleString("es-AR");
  }

  // --- Validación de enteros ----------------------------------

  // Entero > 0 o null (vacío, 0, negativo, decimal o texto).
  function enteroPositivo(valor) {
    var t = String(valor === undefined || valor === null ? "" : valor).trim();
    if (!/^\d+$/.test(t)) return null;
    var n = parseInt(t, 10);
    return n > 0 ? n : null;
  }

  // Entero >= 0 o null.
  function enteroNoNegativo(valor) {
    var t = String(valor === undefined || valor === null ? "" : valor).trim();
    if (!/^\d+$/.test(t)) return null;
    return parseInt(t, 10);
  }

  // Número positivo con hasta 2 decimales o null.
  function precioValido(valor) {
    var t = String(valor === undefined || valor === null ? "" : valor).trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    var n = Number(t);
    return n > 0 ? n : null;
  }

  // --- Errores -------------------------------------------------

  // Texto para mostrar al usuario a partir de cualquier error capturado.
  function mensajeDeError(err) {
    if (err && err.mensaje) return err.mensaje;
    return "Ocurrió un error inesperado. Intentá de nuevo.";
  }

  // --- Estado compartido entre módulos ------------------------
  // La API NO lista clientes (solo GET /clientes/{id}): se recuerdan en memoria
  // los clientes registrados o consultados en esta sesión.
  // Los escribe js/clientes.js (alta y búsqueda) y js/historial.js (clientes de ventas);
  // los lee js/clientes.js (tabla) y js/ventas.js (selector).
  var estado = { clientes: new Map() };

  function registrarCliente(cliente) {
    if (!cliente || typeof cliente.id !== "number") return;
    estado.clientes.set(cliente.id, {
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email
    });
    document.dispatchEvent(new CustomEvent("libreria:clientes"));
  }

  L.util = {
    el: el,
    porId: porId,
    limpiar: limpiar,
    mostrar: mostrar,
    ocultar: ocultar,
    importe: importe,
    multiplicarImporte: multiplicarImporte,
    fechaLocal: fechaLocal,
    enteroPositivo: enteroPositivo,
    enteroNoNegativo: enteroNoNegativo,
    precioValido: precioValido,
    mensajeDeError: mensajeDeError
  };
  L.estado = estado;
  L.registrarCliente = registrarCliente;
})();
