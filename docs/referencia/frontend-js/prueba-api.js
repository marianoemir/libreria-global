// Prueba de js/util.js y js/api.js contra un servidor falso (sin navegador ni backend real).
// Uso:  node prueba-api.js  (desde esta carpeta)   o   node prueba-api.js ../../../frontend/public/js
const http = require("http");
const fs = require("fs");
const vm = require("vm");

// Entorno mínimo de navegador
global.window = global;
global.document = { dispatchEvent(e) { global.__ev = (global.__ev||0)+1; }, createElement(t){ return {tagName:t, children:[], appendChild(){}, removeChild(){}, firstChild:null}; } };
global.CustomEvent = class { constructor(n){ this.type=n; } };

const dir = (process.argv[2] || __dirname).replace(/\/?$/, "/"); // uso: node prueba-api.js [carpeta-con-util.js-y-api.js]
for (const f of ["util.js","api.js"]) vm.runInThisContext(fs.readFileSync(dir+f,"utf8"), {filename:f});
const L = window.Libreria;

let ok = 0, fail = 0;
function check(nombre, cond, extra) { (cond ? ok++ : fail++); console.log((cond ? "OK   " : "FALLA"), nombre, cond ? "" : JSON.stringify(extra)); }

const visto = [];
const srv = http.createServer((req, res) => {
  let body = ""; req.on("data", c => body += c); req.on("end", () => {
    visto.push({m: req.method, u: req.url, ct: req.headers["content-type"], body});
    const j = (code, obj) => { res.writeHead(code, {"Content-Type":"application/json"}); res.end(JSON.stringify(obj)); };
    if (req.url.startsWith("/api/libros/?")) return j(200, [{id:1, precio:"25000.00"}]);
    if (req.url === "/api/libros/" && req.method === "POST") {
      const b = JSON.parse(body);
      if (b.isbn === "DUP") return j(409, {detail:"Ya existe un libro con ese ISBN"});
      if (b.precio <= 0) return j(422, {detail:[{loc:["body","precio"],msg:"Input should be greater than 0",type:"greater_than"},{loc:["body","autores",0,"rol"],msg:"Input should be 'autor'",type:"literal_error"}]});
      return j(201, {id:9, ...b});
    }
    if (req.url === "/api/clientes/99") return j(404, {detail:"Cliente no encontrado."});
    if (req.url === "/api/caido") { res.writeHead(502, {"Content-Type":"text/html"}); return res.end("<html>502 Bad Gateway</html>"); }
    if (req.url === "/api/vacio") { res.writeHead(204); return res.end(); }
    if (req.url === "/api/error500") return j(500, {});
    j(404, {detail:"Not Found"});
  });
});

(async () => {
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port;
  check("base por defecto es /api", L.api.base === "/api", L.api.base);
  L.api.base = `http://127.0.0.1:${port}/api/`;
  check("base se normaliza sin barra final", L.api.base === `http://127.0.0.1:${port}/api`, L.api.base);

  let r = await L.api.get("/libros/", {titulo:"rayu", limit:5, offset:0, vacio:"", nulo:null, undef:undefined});
  check("GET 200 devuelve data", r.status === 200 && r.data[0].precio === "25000.00", r);
  const u = visto[visto.length-1].u;
  check("query: titulo/limit/offset presentes, vacíos omitidos", u === "/api/libros/?titulo=rayu&limit=5&offset=0", u);
  check("GET conserva la barra final", u.startsWith("/api/libros/?"), u);

  r = await L.api.post("/libros/", {isbn:"X", precio:10});
  const v = visto[visto.length-1];
  check("POST 201 + Content-Type JSON + cuerpo serializado", r.status === 201 && v.ct === "application/json" && JSON.parse(v.body).isbn === "X", v);

  try { await L.api.post("/libros/", {isbn:"DUP", precio:10}); check("409 lanza", false); }
  catch (e) { check("409: mensaje = detail del servidor", e instanceof L.api.ApiError && e.status === 409 && e.mensaje === "Ya existe un libro con ese ISBN" && !e.esRed, e); }

  try { await L.api.post("/libros/", {isbn:"Y", precio:0}); check("422 lanza", false); }
  catch (e) { check("422: lista de errores legible con campo", e.status === 422 && e.mensaje === "Datos inválidos — precio: Input should be greater than 0; autores.0.rol: Input should be 'autor'", e.mensaje); }

  try { await L.api.get("/clientes/99"); check("404 lanza", false); }
  catch (e) { check("404: detail string", e.status === 404 && e.mensaje === "Cliente no encontrado.", e); }

  try { await L.api.get("/caido"); check("502 lanza", false); }
  catch (e) { check("502 con HTML: mensaje genérico, no esRed", e.status === 502 && !e.esRed && /no está disponible \(502\)/.test(e.mensaje), e); }

  try { await L.api.get("/error500"); check("500 lanza", false); }
  catch (e) { check("500 sin detail: mensaje genérico", e.status === 500 && /Error del servidor \(500\)/.test(e.mensaje), e); }

  r = await L.api.get("/vacio");
  check("204/cuerpo vacío no rompe", r.status === 204 && r.data === null, r);

  srv.close();
  L.api.base = "http://127.0.0.1:1/api"; // puerto sin servidor
  try { await L.api.get("/libros/"); check("red caída lanza", false); }
  catch (e) { check("servidor caído: status 0, esRed true", e.status === 0 && e.esRed === true && /No se pudo conectar/.test(e.mensaje), e); }

  const U = L.util;
  check("importe string tal cual", U.importe("25000.00") === "$25000.00");
  check("importe número", U.importe(5000.5) === "$5000.50");
  check("importe vacío", U.importe(null) === "$0.00");
  check("multiplicarImporte sin error de flotante", U.multiplicarImporte("0.1", 3) === 0.3 && U.multiplicarImporte("19.99", 3) === 59.97, [U.multiplicarImporte("0.1",3), U.multiplicarImporte("19.99",3)]);
  check("enteroPositivo", U.enteroPositivo("3") === 3 && U.enteroPositivo("0") === null && U.enteroPositivo("-1") === null && U.enteroPositivo("1.5") === null && U.enteroPositivo("") === null && U.enteroPositivo("abc") === null);
  check("enteroNoNegativo", U.enteroNoNegativo("0") === 0 && U.enteroNoNegativo("-1") === null && U.enteroNoNegativo("2.5") === null);
  check("precioValido", U.precioValido("5000") === 5000 && U.precioValido("12,5") === 12.5 && U.precioValido("0") === null && U.precioValido("1.234") === null && U.precioValido("") === null && U.precioValido("-3") === null);
  check("fechaLocal inválida devuelve el texto", U.fechaLocal("no-fecha") === "no-fecha" && U.fechaLocal("") === "");
  check("mensajeDeError", U.mensajeDeError({mensaje:"x"}) === "x" && /inesperado/.test(U.mensajeDeError(new Error("z"))));

  L.registrarCliente({id:2, nombre:"Tomás", email:"t@e.com", extra:"no"});
  L.registrarCliente({id:"mal"});
  check("registrarCliente guarda solo lo válido y emite evento", L.estado.clientes.size === 1 && L.estado.clientes.get(2).extra === undefined && global.__ev === 1, [L.estado.clientes.size, global.__ev]);

  console.log(`\n${ok} OK, ${fail} fallas`);
  process.exit(fail ? 1 : 0);
})();
