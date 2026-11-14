// ============================================================
// js/app.js — Arranque (GL-02)
// Solo orquesta: cada módulo se registra en window.Libreria y expone iniciar().
// No contiene lógica de negocio ni acceso a la API.
// Reemplaza al app.js del parcial 1, que guardaba los datos en el navegador.
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});

  // Orden de arranque. Un módulo que todavía no existe se ignora.
  var MODULOS = ["catalogo", "libros", "clientes", "ventas", "historial"];

  document.addEventListener("DOMContentLoaded", function () {
    MODULOS.forEach(function (nombre) {
      var modulo = L[nombre];
      if (modulo && typeof modulo.iniciar === "function") {
        modulo.iniciar();
      }
    });
  });
})();
