// ============================================================
// js/api.js — Cliente HTTP único hacia la API (GL-02)
// Contrato completo en docs/ARQUITECTURA-FRONTEND.md y docs/CONTRATO-API.md
// Se carga DESPUÉS de util.js y ANTES de los módulos.
//
// Regla: el JS solo conoce el prefijo público "/api". Nginx lo reenvía al
// backend (API_UPSTREAM) quitando el prefijo: "/api/libros/" llega a FastAPI
// como "/libros/". Nunca escribir la dirección del backend acá.
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});

  var BASE = "/api";

  // Error uniforme para toda la aplicación.
  //   status:  código HTTP (0 si no hubo respuesta: red caída, servidor apagado)
  //   mensaje: texto listo para mostrar al usuario
  //   esRed:   true solo cuando no se pudo conectar
  //   cuerpo:  JSON de la respuesta de error, si lo hubo
  function ApiError(status, mensaje, esRed, cuerpo) {
    this.name = "ApiError";
    this.status = status;
    this.mensaje = mensaje;
    this.esRed = !!esRed;
    this.cuerpo = cuerpo === undefined ? null : cuerpo;
    this.message = mensaje;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  // FastAPI devuelve {"detail": "texto"} (404/409/…) o
  // {"detail": [{"loc": ["body","precio"], "msg": "...", "type": "..."}]} (422).
  function extraerMensaje(status, cuerpo) {
    var detalle = cuerpo && typeof cuerpo === "object" ? cuerpo.detail : undefined;

    if (typeof detalle === "string" && detalle.trim() !== "") {
      return detalle;
    }

    if (Array.isArray(detalle) && detalle.length > 0) {
      var partes = detalle.map(function (item) {
        var msg = item && item.msg ? String(item.msg) : "dato inválido";
        var loc = item && Array.isArray(item.loc) ? item.loc : [];
        var campo = loc.filter(function (p) {
          return p !== "body" && p !== "query" && p !== "path";
        }).join(".");
        return campo ? campo + ": " + msg : msg;
      });
      return "Datos inválidos — " + partes.join("; ");
    }

    if (status === 502 || status === 503 || status === 504) {
      return "El servidor no está disponible (" + status + "). Intentá de nuevo en unos minutos.";
    }
    if (status >= 500) {
      return "Error del servidor (" + status + "). Intentá de nuevo.";
    }
    if (status === 404) return "No se encontró el recurso pedido.";
    if (status === 409) return "La operación entra en conflicto con los datos existentes.";
    if (status === 422) return "Los datos enviados no son válidos.";
    return "La solicitud falló (código " + status + ").";
  }

  function armarQuery(params) {
    if (!params) return "";
    var pares = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === "") return;
      pares.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
    });
    return pares.length ? "?" + pares.join("&") : "";
  }

  // ruta: la del backend, con barra inicial y la barra final que la ruta traiga
  // (ej. "/libros/", "/libros/3", "/ventas/"). Devuelve {status, data}.
  async function pedir(metodo, ruta, opciones) {
    opciones = opciones || {};
    var url = BASE + ruta + armarQuery(opciones.params);

    var init = { method: metodo, headers: { Accept: "application/json" } };
    if (opciones.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opciones.body);
    }

    var respuesta;
    try {
      respuesta = await fetch(url, init);
    } catch (e) {
      throw new ApiError(
        0,
        "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
        true
      );
    }

    var cuerpo = null;
    try {
      var texto = await respuesta.text();
      cuerpo = texto ? JSON.parse(texto) : null;
    } catch (e) {
      cuerpo = null; // p. ej. página HTML de error de Nginx (502)
    }

    if (!respuesta.ok) {
      throw new ApiError(respuesta.status, extraerMensaje(respuesta.status, cuerpo), false, cuerpo);
    }

    return { status: respuesta.status, data: cuerpo };
  }

  L.api = {
    ApiError: ApiError,
    // Solo para pruebas fuera del navegador; en producción queda "/api".
    get base() { return BASE; },
    set base(valor) { BASE = String(valor).replace(/\/+$/, ""); },
    get: function (ruta, params) { return pedir("GET", ruta, { params: params }); },
    post: function (ruta, body) { return pedir("POST", ruta, { body: body }); },
    patch: function (ruta, body) { return pedir("PATCH", ruta, { body: body }); }
  };
})();
