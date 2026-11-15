// ============================================================
// js/libros.js — Alta y listado de libros (Ejercicio 2)
// Dueño: GL-04 (ver CHANGES.md y docs/DIVISION-DEL-EQUIPO.md)
// Contrato: docs/ARQUITECTURA-FRONTEND.md · API: docs/CONTRATO-API.md
//
// Reglas que rigen este módulo:
//   - Todo pasa por L.api y por L.util: las filas, autorías y mensajes se arman
//     con textContent / L.util.el, nunca con marcado crudo a partir de datos
//     de la API o del formulario.
//   - Las rutas son las del backend con su barra final exacta ("/libros/",
//     "/libros/100", "/autores/1"); el prefijo "/api" lo agrega api.js.
//   - Las autorías y el estado del alta viven solo en memoria: no se persiste
//     nada en el navegador (regla 1).
//   - Los importes se muestran tal como llegan (L.util.importe, regla 4).
// ============================================================
(function () {
  "use strict";

  var L = (window.Libreria = window.Libreria || {});

  // Autorías del libro que se está cargando: solo en memoria (regla 1).
  // Cada entrada: { autor_id, rol, orden, nombre }.
  var autorias = [];

  // Guardas de reentrada y contadores para descartar respuestas viejas.
  var enviando = false;
  var verificandoAutor = false;
  var secuenciaOpciones = 0;
  var secuenciaListado = 0;

  // Etiquetas visibles de los roles. El `value` que viaja a la API no se toca.
  var ETIQUETAS_ROL = {
    autor: "Autor",
    coautor: "Coautor",
    traductor: "Traductor",
    ilustrador: "Ilustrador"
  };

  // --- Atajos de DOM y textos ---------------------------------

  function porId(id) {
    return L.util.porId(id);
  }

  function valor(id) {
    var nodo = porId(id);
    return nodo ? nodo.value : "";
  }

  function etiquetaRol(rol) {
    return ETIQUETAS_ROL[rol] || String(rol);
  }

  // Texto para los bloques con botón «Reintentar» (convención GL-02 D7).
  function textoErrorConReintento(err) {
    if (err && err.esRed) {
      return "No se pudo conectar con el servidor. Revisá tu conexión y pulsá «Reintentar».";
    }
    if (err && typeof err.status === "number" && err.status >= 500) {
      return "El servidor no está disponible (" + err.status + "). Pulsá «Reintentar» en unos minutos.";
    }
    return L.util.mensajeDeError(err);
  }

  // Texto del alta fallida: no se limpia nada (D4), así que el camino de
  // reintento es volver a pulsar «Agregar libro», no un botón aparte.
  function textoErrorAlta(err) {
    if (err && err.esRed) {
      return "No se pudo conectar con el servidor (error de conexión). Lo escrito sigue cargado: revisá la conexión y volvé a pulsar «Agregar libro».";
    }
    if (err && typeof err.status === "number" && err.status >= 500) {
      return "El servidor no está disponible (" + err.status + "). Lo escrito sigue cargado: volvé a pulsar «Agregar libro» en unos minutos.";
    }
    // 409/422/404: mensaje del servidor (regla 6).
    return L.util.mensajeDeError(err);
  }

  // --- Opciones de editorial y género (2.1) -------------------

  function marcarCargandoOpciones() {
    var editorial = porId("libro-editorial");
    var genero = porId("libro-genero");

    if (editorial) {
      L.util.limpiar(editorial);
      editorial.appendChild(L.util.el(
        "option",
        { value: "", disabled: true, selected: true },
        "Cargando editoriales…"
      ));
      editorial.disabled = true;
      editorial.setAttribute("aria-busy", "true");
    }

    if (genero) {
      L.util.limpiar(genero);
      genero.appendChild(L.util.el("option", { value: "" }, "Sin clasificar"));
      genero.disabled = true;
      genero.setAttribute("aria-busy", "true");
    }
  }

  function agregarOpciones(select, lista) {
    if (!select) return;
    (Array.isArray(lista) ? lista : []).forEach(function (registro) {
      if (!registro || registro.id === undefined || registro.id === null) return;
      select.appendChild(L.util.el("option", { value: registro.id }, registro.nombre));
    });
  }

  function pintarOpciones(editoriales, generos) {
    var editorial = porId("libro-editorial");
    var genero = porId("libro-genero");
    var listaEditoriales = Array.isArray(editoriales) ? editoriales : [];

    if (editorial) {
      L.util.limpiar(editorial);
      editorial.appendChild(L.util.el(
        "option",
        { value: "", disabled: true, selected: true },
        listaEditoriales.length ? "Elegí una editorial" : "No hay editoriales cargadas"
      ));
      agregarOpciones(editorial, listaEditoriales);
      editorial.disabled = false;
      editorial.removeAttribute("aria-busy");
      editorial.value = "";
    }

    if (genero) {
      L.util.limpiar(genero);
      // El género es opcional: «Sin clasificar» viaja como genero_id null (D8).
      genero.appendChild(L.util.el("option", { value: "" }, "Sin clasificar"));
      agregarOpciones(genero, generos);
      genero.disabled = false;
      genero.removeAttribute("aria-busy");
      genero.value = "";
    }
  }

  // Tras un fallo los selectores quedan sin datos viejos y usables.
  function limpiarOpciones() {
    var editorial = porId("libro-editorial");
    var genero = porId("libro-genero");

    if (editorial) {
      L.util.limpiar(editorial);
      editorial.appendChild(L.util.el(
        "option",
        { value: "", disabled: true, selected: true },
        "Reintentá para cargar las editoriales"
      ));
      editorial.disabled = true;
      editorial.removeAttribute("aria-busy");
    }

    if (genero) {
      L.util.limpiar(genero);
      genero.appendChild(L.util.el("option", { value: "" }, "Sin clasificar"));
      genero.disabled = false;
      genero.removeAttribute("aria-busy");
    }
  }

  async function cargarOpciones() {
    var secuencia = ++secuenciaOpciones;
    var bloqueError = porId("libros-opciones-error");
    var textoError = porId("libros-opciones-error-texto");

    if (bloqueError) bloqueError.hidden = true;
    if (textoError) textoError.textContent = "";
    marcarCargandoOpciones();

    try {
      var respuestas = await Promise.all([
        L.api.get("/editoriales/", { limit: 100 }),
        L.api.get("/generos/", { limit: 100 })
      ]);

      if (secuencia !== secuenciaOpciones) return; // respuesta vieja

      pintarOpciones(
        respuestas[0] ? respuestas[0].data : [],
        respuestas[1] ? respuestas[1].data : []
      );
    } catch (err) {
      if (secuencia !== secuenciaOpciones) return;
      // El texto va al span y se alterna `hidden` del contenedor (D7).
      if (textoError) textoError.textContent = textoErrorConReintento(err);
      if (bloqueError) bloqueError.hidden = false;
      limpiarOpciones();
    }
  }

  // --- Autorías verificadas por ID (3.1) ----------------------

  function buscarAutoria(autorId) {
    for (var i = 0; i < autorias.length; i++) {
      if (autorias[i].autor_id === autorId) return autorias[i];
    }
    return null;
  }

  // Reasigna `orden` por posición (D6) después de agregar o quitar.
  function renumerarAutorias() {
    autorias.forEach(function (autoria, indice) {
      autoria.orden = indice + 1;
    });
  }

  function dibujarAutorias() {
    var lista = porId("libro-autores-lista");
    var vacio = porId("libro-autores-vacio");

    if (lista) {
      L.util.limpiar(lista);
      autorias.forEach(function (autoria) {
        var item = L.util.el("li");
        item.appendChild(L.util.el(
          "span",
          null,
          autoria.nombre + " (" + etiquetaRol(autoria.rol) + ")"
        ));

        var quitar = L.util.el("button", { type: "button", className: "boton" }, "Quitar");
        quitar.addEventListener("click", function () {
          quitarAutoria(autoria.autor_id);
        });
        item.appendChild(quitar);
        lista.appendChild(item);
      });
    }

    if (vacio) vacio.hidden = autorias.length > 0;
  }

  function quitarAutoria(autorId) {
    for (var i = 0; i < autorias.length; i++) {
      if (autorias[i].autor_id === autorId) {
        autorias.splice(i, 1);
        break;
      }
    }
    renumerarAutorias();
    dibujarAutorias();
    L.util.mostrar(porId("libro-autor-mensaje"), "");
  }

  async function agregarAutoria() {
    if (verificandoAutor) return;

    var campoId = porId("libro-autor-id");
    var selectRol = porId("libro-autor-rol");
    var mensaje = porId("libro-autor-mensaje");
    var boton = porId("libro-autor-agregar-boton");

    // Guarda local: sin ID entero >= 1 no se llama a la API.
    var autorId = L.util.enteroPositivo(campoId ? campoId.value : "");
    if (autorId === null) {
      L.util.mostrar(mensaje, "Ingresá un ID de autor entero mayor o igual a 1.");
      return;
    }

    // Mismo autor dos veces: se avisa y no se repite el GET.
    if (buscarAutoria(autorId)) {
      L.util.mostrar(mensaje, "El autor " + autorId + " ya está en la lista.");
      return;
    }

    var rol = selectRol ? selectRol.value : "autor";

    verificandoAutor = true;
    if (boton) boton.disabled = true;
    L.util.mostrar(mensaje, "Verificando el autor " + autorId + "…");

    try {
      var respuesta = await L.api.get("/autores/" + autorId);
      var autor = respuesta.data || {};
      var nombre = autor.nombre ? String(autor.nombre) : "Autor " + autorId;

      autorias.push({
        autor_id: autorId,
        rol: rol,
        orden: autorias.length + 1,
        nombre: nombre
      });
      renumerarAutorias();

      if (campoId) campoId.value = ""; // listo para el siguiente
      dibujarAutorias();
      L.util.mostrar(mensaje, nombre + " agregado como " + etiquetaRol(rol) + ".");
    } catch (err) {
      // 404 «Autor no encontrado» u otro: mensaje del servidor, lista intacta.
      L.util.mostrar(mensaje, L.util.mensajeDeError(err));
    } finally {
      verificandoAutor = false;
      if (boton) boton.disabled = false;
    }
  }

  // --- Validación y envío del alta (4.1 / 4.6) ----------------

  function fallaValidacion(texto) {
    L.util.mostrar(porId("libros-error"), texto);
    return null;
  }

  // Valida solo lo que el cliente puede decidir sin consultar la base (D2).
  // Devuelve el cuerpo del POST o null (y en ese caso NADA se envía).
  function validar() {
    var titulo = valor("libro-titulo").trim();
    var isbn = valor("libro-isbn").trim();
    var textoStock = valor("libro-stock").trim();
    var precio = L.util.precioValido(valor("libro-precio"));
    var stock = textoStock === "" ? null : L.util.enteroNoNegativo(textoStock);
    var editorialId = L.util.enteroPositivo(valor("libro-editorial"));
    var generoId = L.util.enteroPositivo(valor("libro-genero"));

    if (!titulo) return fallaValidacion("Ingresá el título del libro.");
    if (!isbn) return fallaValidacion("Ingresá el ISBN del libro.");
    if (precio === null) {
      return fallaValidacion("El precio debe ser un número mayor que 0 y con hasta 2 decimales.");
    }
    // OQ-GL04-4: stock vacío no se asume 0, tiene su propio mensaje.
    if (textoStock === "") {
      return fallaValidacion("Ingresá el stock del libro: un entero mayor o igual a 0.");
    }
    if (stock === null) return fallaValidacion("El stock debe ser un entero mayor o igual a 0.");
    if (editorialId === null) return fallaValidacion("Elegí una editorial.");
    if (autorias.length === 0) return fallaValidacion("Agregá al menos un autor.");

    return {
      isbn: isbn,
      titulo: titulo,
      precio: Number(precio),
      stock: stock,
      editorial_id: editorialId,
      genero_id: generoId, // null cuando es «Sin clasificar» (D8)
      autores: autorias.map(function (autoria, indice) {
        return {
          autor_id: autoria.autor_id,
          rol: autoria.rol,
          orden: indice + 1 // posición en la lista (D6 / OQ-GL04-3)
        };
      })
    };
  }

  async function enviar() {
    if (enviando) return;

    L.util.ocultar(porId("libros-exito"));
    L.util.ocultar(porId("libros-error"));

    var cuerpo = validar();
    if (!cuerpo) return; // corta ANTES de cualquier petición

    var boton = porId("libros-agregar-boton");
    enviando = true;
    if (boton) boton.disabled = true;

    try {
      var respuesta = await L.api.post("/libros/", cuerpo);
      usarLibroCreado(respuesta.data);
    } catch (err) {
      // 409/422 → mensaje del servidor; sin limpiar campos ni autorías (D4).
      L.util.mostrar(porId("libros-error"), textoErrorAlta(err));
    } finally {
      enviando = false;
      if (boton) boton.disabled = false;
    }
  }

  // --- El 201: fila en el listado y formulario limpio (5.1) ---

  function filaDeLibro(libro) {
    var editorial = libro.editorial && libro.editorial.nombre ? libro.editorial.nombre : "";
    var genero = libro.genero && libro.genero.nombre ? libro.genero.nombre : "Sin clasificar";
    var fila = L.util.el("tr");

    [
      libro.id,
      libro.titulo,
      libro.isbn,
      editorial,
      genero,
      libro.stock,
      L.util.importe(libro.precio) // tal como llega, sin recalcular (regla 4)
    ].forEach(function (dato) {
      fila.appendChild(L.util.el("td", null, dato === undefined || dato === null ? "" : dato));
    });

    return fila;
  }

  function limpiarAlta() {
    var form = porId("libros-form");
    if (form) form.reset();

    // form.reset() no garantiza la opción por defecto de los selectores que se
    // generan por JS: se fija explícitamente el placeholder.
    var editorial = porId("libro-editorial");
    var genero = porId("libro-genero");
    var campoAutor = porId("libro-autor-id");
    if (editorial) editorial.value = "";
    if (genero) genero.value = "";
    if (campoAutor) campoAutor.value = "";

    autorias = [];
    dibujarAutorias();
    L.util.ocultar(porId("libro-autor-mensaje"));
  }

  // El cuerpo del 201 (LibroRead) alimenta el listado: sin refetch (D5).
  function usarLibroCreado(libro) {
    if (!libro) return;

    L.util.mostrar(porId("libros-exito"), "Libro «" + libro.titulo + "» agregado correctamente.");

    var lista = porId("libros-lista");
    if (lista) lista.appendChild(filaDeLibro(libro));

    // Con una fila nueva el listado ya no está vacío ni en error.
    var vacio = porId("libros-vacio");
    var errorTabla = porId("libros-tabla-error");
    if (vacio) vacio.hidden = true;
    if (errorTabla) errorTabla.hidden = true;

    limpiarAlta();
    L.util.ocultar(porId("libros-error"));
  }

  // --- Listado de libros registrados (5.2) --------------------

  async function cargarListado() {
    var secuencia = ++secuenciaListado;
    var tbody = porId("libros-lista");
    var cargando = porId("libros-cargando");
    var vacio = porId("libros-vacio");
    var bloqueError = porId("libros-tabla-error");
    var textoError = porId("libros-tabla-error-texto");

    if (bloqueError) bloqueError.hidden = true;
    if (textoError) textoError.textContent = "";
    if (vacio) vacio.hidden = true;
    if (cargando) cargando.hidden = false;
    if (tbody) L.util.limpiar(tbody);

    try {
      var respuesta = await L.api.get("/libros/", { limit: 100, offset: 0 });

      if (secuencia !== secuenciaListado) return; // respuesta vieja (D12)

      var libros = Array.isArray(respuesta.data) ? respuesta.data : [];
      if (tbody) {
        libros.forEach(function (libro) {
          tbody.appendChild(filaDeLibro(libro));
        });
      }
      if (vacio) vacio.hidden = libros.length > 0;
    } catch (err) {
      if (secuencia !== secuenciaListado) return;
      if (textoError) textoError.textContent = textoErrorConReintento(err);
      if (bloqueError) bloqueError.hidden = false;
    } finally {
      if (secuencia === secuenciaListado && cargando) cargando.hidden = true;
    }
  }

  // --- Arranque -----------------------------------------------

  function iniciar() {
    var form = porId("libros-form");
    var botonAgregar = porId("libros-agregar-boton");
    var botonAutor = porId("libro-autor-agregar-boton");
    var reintentarOpciones = porId("libros-opciones-reintentar");
    var reintentarListado = porId("libros-reintentar");

    // El formulario tiene novalidate y el botón es type="button" (D7): se
    // atiende el submit con preventDefault para que Enter no haga un POST nativo.
    if (form) {
      form.addEventListener("submit", function (evento) {
        evento.preventDefault();
        enviar();
      });
    }

    if (botonAgregar) botonAgregar.addEventListener("click", function () { enviar(); });
    if (botonAutor) botonAutor.addEventListener("click", function () { agregarAutoria(); });
    if (reintentarOpciones) reintentarOpciones.addEventListener("click", function () { cargarOpciones(); });
    if (reintentarListado) reintentarListado.addEventListener("click", function () { cargarListado(); });

    dibujarAutorias();
    cargarOpciones();
    cargarListado();
  }

  L.libros = { iniciar: iniciar };
})();
