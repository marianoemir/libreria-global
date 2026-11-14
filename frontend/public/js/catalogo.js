// ============================================================
// js/catalogo.js — Catálogo (Ejercicio 1)
// Dueño: GL-03 (ver CHANGES.md y docs/DIVISION-DEL-EQUIPO.md)
// Contrato: docs/ARQUITECTURA-FRONTEND.md · API: docs/CONTRATO-API.md
// Consume L.api (base /api) y L.util. Sin fetch directo, sin persistencia.
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});

  // Estado local del módulo (anti-carreras por secuencia: solo vale la última).
  // seq global intencional (design D1): lista y detalle comparten contador;
  // la búsqueda descarta el detalle en vuelo y viceversa.
  var estado = { filtro: "", limit: 20, offset: 0, peticionSeq: 0 };
  var yaIniciado = false;

  function nodos() {
    var porId = L.util.porId;
    return {
      busqueda: porId("catalogo-busqueda"),
      form: porId("catalogo-buscador-form"),
      buscar: porId("catalogo-buscar-boton"),
      limit: porId("catalogo-limit"),
      cargando: porId("catalogo-cargando"),
      error: porId("catalogo-error"),
      errorTexto: porId("catalogo-error-texto"),
      reintentar: porId("catalogo-reintentar"),
      sinResultados: porId("catalogo-sin-resultados"),
      vacio: porId("catalogo-vacio"),
      lista: porId("catalogo-lista"),
      paginacion: porId("catalogo-paginacion"),
      anterior: porId("catalogo-anterior"),
      siguiente: porId("catalogo-siguiente"),
      pagina: porId("catalogo-pagina"),
      detalle: porId("catalogo-detalle")
    };
  }

  function leerFiltro(n) {
    return n.busqueda ? n.busqueda.value.trim() : "";
  }

  function leerLimit(n) {
    var v = n.limit ? parseInt(n.limit.value, 10) : NaN;
    if (isNaN(v) || v < 1 || v > 100) return 20;
    return v;
  }

  function ocultarTodos(n) {
    if (n.cargando) n.cargando.hidden = true;
    if (n.error) n.error.hidden = true;
    if (n.sinResultados) n.sinResultados.hidden = true;
    if (n.vacio) n.vacio.hidden = true;
    if (n.lista) n.lista.hidden = true;
    if (n.paginacion) n.paginacion.hidden = true;
  }

  function textoPagina(cantidad, limit, offset) {
    var desde = cantidad === 0 ? 0 : offset + 1;
    var hasta = offset + cantidad;
    return "Mostrando " + cantidad + " libro(s) (registros " + desde + "–" + hasta + ")";
  }

  // Tarjeta de un libro. Sin HTML inyectado: solo L.util.el + textContent.
  function tarjetaLibro(libro) {
    var el = L.util.el;
    var tarjeta = el("article", { className: "catalogo-libro" });
    tarjeta.appendChild(el("h3", { className: "catalogo-libro-titulo" }, libro.titulo));
    tarjeta.appendChild(el("p", { className: "catalogo-libro-isbn" }, "ISBN: " + libro.isbn));
    tarjeta.appendChild(el("p", { className: "catalogo-libro-precio" }, "Precio: " + L.util.importe(libro.precio)));
    var editorial = libro.editorial && libro.editorial.nombre ? libro.editorial.nombre : "Sin editorial";
    tarjeta.appendChild(el("p", { className: "catalogo-libro-editorial" }, "Editorial: " + editorial));
    var genero = libro.genero && libro.genero.nombre ? libro.genero.nombre : "Sin clasificar";
    tarjeta.appendChild(el("p", { className: "catalogo-libro-genero" }, "Género: " + genero));
    var boton = el("button", { type: "button", className: "boton" }, "Ver detalle");
    boton.dataset.id = String(libro.id);
    tarjeta.appendChild(boton);
    return tarjeta;
  }

  function pintarLista(n, data) {
    if (!n.lista) return;
    var cantidad = data.length;
    L.util.limpiar(n.lista);
    L.util.limpiar(n.detalle);
    if (cantidad === 0) {
      n.lista.hidden = true;
      if (n.paginacion) n.paginacion.hidden = true;
      // Sin filtro = catálogo vacío; con filtro = sin coincidencias.
      if (estado.filtro) {
        if (n.sinResultados) n.sinResultados.hidden = false;
      } else {
        if (n.vacio) n.vacio.hidden = false;
      }
      return;
    }
    data.forEach(function (libro) {
      n.lista.appendChild(tarjetaLibro(libro));
    });
    n.lista.hidden = false;
    // Paginación sin total: siguiente solo si la página vino llena.
    if (n.anterior) n.anterior.disabled = estado.offset === 0;
    if (n.siguiente) n.siguiente.disabled = !(cantidad === estado.limit);
    if (n.pagina) n.pagina.textContent = textoPagina(cantidad, estado.limit, estado.offset);
    if (n.paginacion) n.paginacion.hidden = false;
  }

  function pintarError(n, err) {
    if (!n.lista) return;
    L.util.limpiar(n.lista);
    L.util.limpiar(n.detalle);
    n.lista.hidden = true;
    if (n.paginacion) n.paginacion.hidden = true;
    L.util.mostrar(n.errorTexto, L.util.mensajeDeError(err));
    if (n.error) n.error.hidden = false;
  }

  function cargar() {
    var n = nodos();
    var seq = ++estado.peticionSeq;
    ocultarTodos(n);
    if (n.cargando) n.cargando.hidden = false;
    return L.api
      .get("/libros/", { titulo: estado.filtro, limit: estado.limit, offset: estado.offset })
      .then(function (res) {
        if (seq !== estado.peticionSeq) return; // respuesta vieja: se ignora
        ocultarTodos(n);
        pintarLista(n, res.data || []);
      })
      .catch(function (err) {
        if (seq !== estado.peticionSeq) return; // respuesta vieja: se ignora
        ocultarTodos(n);
        pintarError(n, err);
      });
  }

  function pintarDetalle(n, libro) {
    if (!n.detalle) return;
    var el = L.util.el;
    L.util.limpiar(n.detalle);
    n.detalle.className = "";
    var cont = el("article", { className: "catalogo-detalle-libro" });
    cont.appendChild(el("h3", {}, libro.titulo));
    cont.appendChild(el("p", {}, "ISBN: " + libro.isbn));
    cont.appendChild(el("p", {}, "Precio: " + L.util.importe(libro.precio)));
    var editorial = libro.editorial && libro.editorial.nombre ? libro.editorial.nombre : "Sin editorial";
    cont.appendChild(el("p", {}, "Editorial: " + editorial));
    var genero = libro.genero && libro.genero.nombre ? libro.genero.nombre : "Sin clasificar";
    cont.appendChild(el("p", {}, "Género: " + genero));
    var autores = Array.isArray(libro.autores) ? libro.autores : [];
    cont.appendChild(el("h4", {}, "Autores"));
    if (autores.length === 0) {
      cont.appendChild(el("p", {}, "Sin autores registrados."));
    } else {
      var ul = el("ul", {});
      autores.forEach(function (a) {
        var nombre = a.autor && a.autor.nombre ? a.autor.nombre : "Desconocido";
        ul.appendChild(el("li", {}, nombre + " — " + a.rol + " (orden " + a.orden + ")"));
      });
      cont.appendChild(ul);
    }
    n.detalle.appendChild(cont);
  }

  function verDetalle(id) {
    var n = nodos();
    if (!n.detalle) return null;
    var num = L.util.enteroPositivo(id);
    if (num === null) {
      L.util.limpiar(n.detalle);
      n.detalle.className = "mensaje mensaje-error";
      L.util.mostrar(n.detalle, "Libro no válido.");
      return null;
    }
    var seq = ++estado.peticionSeq;
    // El detalle vive en su propio nodo: la lista queda intacta.
    L.util.limpiar(n.detalle);
    n.detalle.className = "";
    return L.api
      .get("/libros/" + num)
      .then(function (res) {
        if (seq !== estado.peticionSeq) return;
        pintarDetalle(n, res.data);
      })
      .catch(function (err) {
        if (seq !== estado.peticionSeq) return;
        L.util.limpiar(n.detalle);
        n.detalle.className = "mensaje mensaje-error";
        L.util.mostrar(n.detalle, L.util.mensajeDeError(err));
      });
  }

  function iniciar() {
    if (yaIniciado) return;
    yaIniciado = true;
    var n = nodos();

    function buscar() {
      estado.filtro = leerFiltro(n);
      estado.limit = leerLimit(n);
      estado.offset = 0;
      cargar();
    }

    if (n.buscar) n.buscar.addEventListener("click", buscar);
    if (n.form) {
      n.form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        buscar();
      });
    }
    if (n.limit) {
      n.limit.addEventListener("change", function () {
        estado.filtro = leerFiltro(n);
        estado.limit = leerLimit(n);
        estado.offset = 0;
        cargar();
      });
    }
    if (n.anterior) {
      n.anterior.addEventListener("click", function () {
        estado.offset = Math.max(0, estado.offset - estado.limit);
        cargar();
      });
    }
    if (n.siguiente) {
      n.siguiente.addEventListener("click", function () {
        estado.offset = estado.offset + estado.limit;
        cargar();
      });
    }
    if (n.reintentar) {
      // Repite la última petición con los mismos parámetros.
      n.reintentar.addEventListener("click", function () {
        cargar();
      });
    }
    if (n.lista) {
      // Un solo listener delegado: el botón lleva el id en data-id.
      n.lista.addEventListener("click", function (ev) {
        var boton = ev.target && ev.target.closest ? ev.target.closest("button[data-id]") : null;
        if (!boton) return;
        verDetalle(boton.dataset.id);
      });
    }

    estado.filtro = leerFiltro(n);
    estado.limit = leerLimit(n);
    estado.offset = 0;
    cargar();
  }

  L.catalogo = { iniciar: iniciar };
})();
