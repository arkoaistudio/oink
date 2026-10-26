/* Pantallas de Oink. Todo el estado vive en un solo objeto que se guarda
   en el almacenamiento del celular; los cálculos están en logica.js. */
(function () {
  'use strict';

  const L = window.Logica;
  const CLAVE = 'oink.v1';
  const DEMO = /[?&]demo\b/.test(location.search);   // datos de muestra, no guarda
  const VISTAS = ['inicio', 'movs', 'tarjetas', 'stats', 'alcancia', 'personas', 'subs', 'ajustes'];
  const DIAS_SIN_RESPALDO = 14;

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Íconos de trazo redondeado, del mismo grosor que el chanchito.
  const svg = function (d) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  const ICO = {
    comida: svg('<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 4c-1 1.2 1 2.2 0 3.6M14 4c-1 1.2 1 2.2 0 3.6"/>'),
    transporte: svg('<rect x="4" y="5" width="16" height="12" rx="3"/><path d="M4 11h16M8 17v2M16 17v2"/><circle cx="8" cy="14" r=".6"/><circle cx="16" cy="14" r=".6"/>'),
    ropa: svg('<path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z"/>'),
    salidas: svg('<path d="M5 5h14l-7 8z"/><path d="M12 13v6M8 19h8"/><path d="M15 3l2 2"/>'),
    regalos: svg('<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M12 9v11"/><path d="M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0"/>'),
    suscripciones: svg('<circle cx="12" cy="12" r="8"/><path d="M10.5 9v6l4.5-3z"/>'),
    otros: svg('<path d="M12 4l2.2 5 5.3.5-4 3.6 1.2 5.2L12 15.6 7.3 18.3l1.2-5.2-4-3.6 5.3-.5z"/>'),
    sueldo: svg('<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>'),
    mas: svg('<path d="M12 5v14M5 12h14"/>'),
    casa: svg('<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>'),
    lista: svg('<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.5" cy="7" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="17" r=".8"/>'),
    tarjeta: svg('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 15h3"/>'),
    stats: svg('<path d="M5 20V12M10 20V5M15 20v-6M20 20V9"/>'),
    ajustes: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),
    izq: svg('<path d="M15 5l-7 7 7 7"/>'),
    der: svg('<path d="M9 5l7 7-7 7"/>'),
    cerrar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    personas: svg('<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="8" r="2.4"/><path d="M16 13.2c2.6-.3 4.3 1.6 4.6 4.3"/>'),
    alcancia: svg('<ellipse cx="11.5" cy="13" rx="7.5" ry="6"/><path d="M9 7.6V6.5M18.5 11.5l2-1M8 18.5V20M15 18.5V20"/><circle cx="14.5" cy="11.5" r=".7"/>'),
    campana: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    lupa: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
    fuego: svg('<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 4-9 2.5 1.6 4 4 4 6.2 1-.6 1.7-1.6 2-2.8 1.6 1.6 3 3.6 3 5.6 0 3.4-2.5 6-6.5 6z"/>')
  };

  // El chanchito: trazo de lápiz con un temblor leve (filtro), como dibujado a mano.
  function chanchito(tam) {
    return '<svg class="chanchito" width="' + tam + '" height="' + tam + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs><filter id="lapiz"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/>' +
      '<feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs>' +
      '<g filter="url(#lapiz)" stroke="var(--magenta)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="var(--rosa)">' +
      '<path d="M78 24c4-1 7-4 5-7-2-2-5 0-3 3 2 2 6 1 8-1" fill="none"/>' +
      '<rect x="34" y="80" width="7" height="12" rx="1"/><rect x="58" y="80" width="7" height="12" rx="1"/>' +
      '<circle cx="50" cy="52" r="34"/>' +
      '<circle cx="36" cy="34" r="6"/><circle cx="64" cy="34" r="6"/>' +
      '<circle cx="50" cy="50" r="20"/>' +
      '<ellipse cx="50" cy="56" rx="11" ry="7"/></g>' +
      '<g fill="#1E1A1A"><circle cx="43.5" cy="43" r="1.6"/><circle cx="56.5" cy="43" r="1.6"/>' +
      '<ellipse cx="46.5" cy="56" rx="1.6" ry="2.6"/><ellipse cx="53.5" cy="56" rx="1.6" ry="2.6"/></g></svg>';
  }

  let estado = cargar();
  let mes = L.mesDe(L.hoyISO());
  let filtro = '';   // en Gastos: id de una cuenta o tarjeta, 'otros' para lo de otras personas, o vacío
  let hoja = null;
  let busca = '';    // lo que se escribe en el buscador de Gastos

  // ---------- guardado ----------

  function cargar() {
    if (DEMO) return L.demo(L.hoyISO());
    let crudo = null;
    try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    if (!crudo) return L.estadoInicial();
    try {
      const r = L.validar(JSON.parse(crudo));
      if (r.ok) return r.estado;
    } catch (e) { /* cae abajo */ }
    // No se pudo leer: se aparta una copia en vez de pisarla.
    try { localStorage.setItem(CLAVE + '.ilegible', crudo); } catch (e) { /* nada */ }
    return L.estadoInicial();
  }

  let pedidoPersistir = false;
  function guardar() {
    if (DEMO) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) {
      aviso('No se pudo guardar en el celular: ' + e.message, true);
      return;
    }
    if (!pedidoPersistir && navigator.storage && navigator.storage.persist) {
      pedidoPersistir = true;
      navigator.storage.persist().catch(function () {});
    }
  }

  // ---------- piezas ----------

  function num(c, mon, clase) {
    const p = L.partes(c, mon);
    return '<span class="num ' + (clase || '') + (p.neg ? ' negativo' : '') + '">' +
      (p.neg ? '<i class="sig">−</i>' : '') + '<i class="sim">' + p.sim + '</i>' + p.ent +
      '<i class="dec">.' + p.dec + '</i></span>';
  }
  // "S/ 120.00 · US$ 11.99", sin la moneda que esté en cero.
  function dosMon(g) {
    const t = [];
    if (g.PEN || !g.USD) t.push(L.fmt(g.PEN, 'PEN'));
    if (g.USD) t.push(L.fmt(g.USD, 'USD'));
    return t.join(' · ');
  }
  // Lo mismo, pero cada moneda en su línea (los dólares más chicos), para montos grandes.
  function monLineas(g) {
    let h = '';
    if (g.PEN || !g.USD) h += '<span class="linea">' + L.fmt(g.PEN, 'PEN') + '</span>';
    if (g.USD) h += '<span class="linea' + (g.PEN ? ' usd' : '') + '">' + L.fmt(g.USD, 'USD') + '</span>';
    return h;
  }
  function burbuja(c) {
    return '<span class="burbuja c-' + esc(c ? c.color : 'arena') + '">' +
      (c && ICO[c.ico] ? ICO[c.ico] : '<b>' + esc(c ? c.nombre.charAt(0) : '?') + '</b>') + '</span>';
  }
  function cuando(dias) {
    if (dias < 0) return 'hace ' + (-dias) + (dias === -1 ? ' día' : ' días');
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    return 'en ' + dias + ' días';
  }
  function filaMov(m) {
    const abre = '<button class="fila" data-accion="editar-mov" data-id="' + esc(m.id) + '">';
    if (m.tipo === 'pago') {
      return abre + '<span class="burbuja c-arena">' + ICO.tarjeta + '</span><span class="izq"><b>Pago ' + esc(L.nombreCuenta(L.cuentaDe(estado, m.tarjeta))) +
        '</b><span class="meta">desde ' + esc(L.nombreCuenta(L.cuentaDe(estado, m.cuenta))) + '</span></span><span class="der neutro">' + L.fmt(m.monto, m.mon) + '</span></button>';
    }
    if (m.tipo === 'mover') {
      return abre + '<span class="burbuja c-arena">' + ICO.der + '</span><span class="izq"><b>' + esc(L.cuentaDe(estado, m.cuenta).nombre) + ' → ' +
        esc(L.cuentaDe(estado, m.destino).nombre) + '</b><span class="meta">' + esc(m.nota || 'Entre tus cuentas') + '</span></span><span class="der neutro">' + L.fmt(m.monto, m.mon) + '</span></button>';
    }
    if (m.tipo === 'ingreso') {
      return abre + '<span class="burbuja c-salvia">' + ICO.sueldo + '</span><span class="izq"><b>' + esc(m.nota || L.nombreCat(estado, m)) +
        '</b><span class="meta">' + esc(L.nombreCuenta(L.cuentaDe(estado, m.cuenta))) + '</span></span><span class="der ingreso">+ ' + L.fmt(m.monto, m.mon) + '</span></button>';
    }
    const c = L.catDe(estado, m.cat);
    if (m.tipo === 'devolucion') {
      return abre + burbuja(c) + '<span class="izq"><b>Devolución' + (m.nota || m.lugar ? ' · ' + esc(m.nota || m.lugar) : '') + '</b><span class="meta">' +
        esc(L.nombreCat(estado, m) + ' · volvió a ' + L.comoSePago(estado, m)) + '</span></span><span class="der ingreso">+ ' + L.fmt(m.monto, m.mon) +
        (m.ajeno ? '<span class="etiqueta">' + esc(m.ajeno.persona) + '</span>' : '') + '</span></button>';
    }
    const titulo = m.nota || m.lugar || L.nombreCat(estado, m);
    const meta = [L.comoSePago(estado, m)];
    if (m.lugar && m.lugar !== titulo) meta.push(m.lugar);
    let der = L.fmt(m.monto, m.mon);
    if (m.mon === 'USD') der += '<span class="meta">≈ ' + L.fmt(L.aSoles(m), 'PEN') + '</span>';
    if (m.ajeno) der += '<span class="etiqueta">' + esc(m.ajeno.persona) + (m.ajeno.monto === m.monto ? '' : ' ' + L.fmt(m.ajeno.monto, m.mon)) + '</span>';
    return abre + burbuja(c) + '<span class="izq"><b>' + esc(titulo) + '</b><span class="meta">' + esc(meta.join(' · ')) + '</span></span>' +
      '<span class="der">' + der + '</span></button>';
  }

  /* Anillo del mes: un arco por categoría, en su color, sobre lo que da de tope
     (o sobre lo gastado si se pasó o no hay topes). */
  function anillo(items, base) {
    const r = 74, C = 2 * Math.PI * r, hueco = 10;
    let h = '<svg class="anillo" viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="' + r + '" class="pista"/>';
    let ya = 0;
    for (const it of items) {
      if (!base || it.valor <= 0) continue;
      const largo = it.valor / base * C;
      const visible = Math.max(0.01, largo - hueco);
      h += '<circle cx="90" cy="90" r="' + r + '" class="arco" style="stroke:var(--' + it.color + ')" stroke-dasharray="' +
        visible.toFixed(1) + ' ' + C.toFixed(1) + '" stroke-dashoffset="' + (-(ya + hueco / 2)).toFixed(1) + '"/>';
      ya += largo;
    }
    return h + '</svg>';
  }

  function vistaActual() {
    const h = location.hash.replace('#', '');
    return VISTAS.indexOf(h) >= 0 ? h : 'inicio';
  }
  function diasDesdeRespaldo() {
    if (!estado.ultimoRespaldo) return null;
    return Math.floor((Date.now() - new Date(estado.ultimoRespaldo).getTime()) / 86400000);
  }

  // ---------- pantallas ----------

  const TITULOS = { tarjetas: 'Tarjetas', alcancia: 'Alcancía', personas: 'Personas', subs: 'Suscripciones', ajustes: 'Ajustes' };

  function pintarCabecera(v) {
    let h;
    if (v === 'inicio') {
      const hoy = L.hoyISO();
      h = '<div class="hola">' + chanchito(46) + '<div><span class="mano">' + esc(L.etiquetaDia(hoy)) + (DEMO ? ' · demo' : '') +
        '</span><h1>Hola, ' + esc(estado.nombre) + '</h1></div></div>' +
        '<a class="redondo" href="#ajustes" aria-label="Ajustes">' + ICO.ajustes + '</a>';
    } else if (v === 'movs' || v === 'stats') {
      const n = L.nombreMes(mes);
      h = '<div class="titulo"><span class="mano">' + n.anio + (DEMO ? ' · demo' : '') + '</span><h1>' + n.nombre + '</h1></div>' +
        '<button class="redondo" data-accion="mes" data-d="-1" aria-label="Mes anterior">' + ICO.izq + '</button>' +
        '<button class="redondo" data-accion="mes" data-d="1" aria-label="Mes siguiente">' + ICO.der + '</button>';
    } else {
      const raiz = v === 'tarjetas';
      h = (raiz ? '' : '<a class="redondo" href="#inicio" aria-label="Volver">' + ICO.izq + '</a>') +
        '<div class="titulo"><span class="mano">Oink' + (DEMO ? ' · demo' : '') + '</span><h1>' + TITULOS[v] + '</h1></div>' +
        (raiz ? '<a class="redondo" href="#ajustes" aria-label="Ajustes">' + ICO.ajustes + '</a>' : '');
    }
    $('#cabecera').innerHTML = h;
  }

  function pintarBarra(v) {
    const a = function (id, ico, texto) {
      return '<a href="#' + id + '"' + (v === id ? ' class="on"' : '') + '>' + ICO[ico] + '<span>' + texto + '</span></a>';
    };
    $('#barra').innerHTML = a('inicio', 'casa', 'Inicio') + a('movs', 'lista', 'Gastos') +
      '<button class="nuevo" data-accion="nuevo-mov" aria-label="Anotar">' + ICO.mas + '</button>' +
      a('tarjetas', 'tarjeta', 'Tarjetas') + a('stats', 'stats', 'Stats');
  }

  function vInicio() {
    const hoy = L.hoyISO(), mesHoy = L.mesDe(hoy);
    const s = L.saldos(estado), per = L.totalPersonas(estado), al = L.alcancia(estado, hoy);
    let h = '';

    const dias = diasDesdeRespaldo();
    if (estado.movs.length >= 10 && (dias === null || dias >= DIAS_SIN_RESPALDO)) {
      h += '<div class="alerta c-lila"><div class="alerta-txt"><b>' + (dias === null ? 'Todavía no tienes un respaldo' :
        'Tu último respaldo es de hace ' + dias + ' días') + '</b><span class="meta">Si se borra la app, es lo único que recupera tus datos.</span></div>' +
        '<div class="botones"><button class="btn mini oscuro" data-accion="respaldo">Guardar respaldo</button></div></div>';
    }
    for (const p of L.subsPendientes(estado, hoy)) {
      const sub = p.sub;
      const que = p.vence < 0 ? 'Ya se cobró ' : p.vence === 0 ? 'Hoy se cobra ' : p.vence === 1 ? 'Mañana se cobra ' : 'En ' + p.vence + ' días se cobra ';
      h += '<div class="alerta c-salvia"><span class="burbuja blanca">' + ICO.suscripciones + '</span><div class="alerta-txt"><b>' + que + esc(sub.nombre) +
        '</b><span class="meta">' + L.fmt(sub.monto, sub.mon) + ' · ' + esc(L.nombreCuenta(L.cuentaDe(estado, sub.cuenta))) + ' · el ' + L.fechaCorta(p.fecha) + '</span></div>' +
        '<div class="botones"><button class="btn mini oscuro" data-accion="sub-ok" data-id="' + esc(sub.id) + '">' + 'Confirmar</button>' +
        '<button class="btn mini" data-accion="sub-otro" data-id="' + esc(sub.id) + '">Otro monto</button>' +
        '<button class="btn mini texto" data-accion="sub-saltar" data-id="' + esc(sub.id) + '">No este mes</button></div></div>';
    }
    for (const p of L.proximosPagos(estado, hoy)) {
      if (p.dias > 7) continue;
      h += '<div class="alerta c-' + esc(p.tarjeta.color) + '"><span class="burbuja blanca">' + ICO.campana + '</span><div class="alerta-txt"><b>' +
        (p.dias < 0 ? 'Se pasó la fecha de pago de tu ' : 'Paga tu ') + esc(p.tarjeta.nombre) + ' ' + cuando(p.dias) + '</b><span class="meta">' + dosMon(p.falta) + ' · hasta el ' +
        L.etiquetaDia(p.pago) + '</span></div><div class="botones"><button class="btn mini oscuro" data-accion="pagar" data-id="' + esc(p.tarjeta.id) + '">Ya pagué</button></div></div>';
    }

    // Tu plata
    const libre = s.tengoTotal - s.deboTotal;
    h += '<section class="caja plata"><span class="eyebrow">Tu plata hoy</span>' + num(s.tengoTotal, 'PEN', 'grande') +
      (s.tengo.USD ? '<span class="meta">Incluye ' + L.fmt(s.tengo.USD, 'USD') + ' al cambio de ' + estado.tc.toFixed(2) + '</span>' : '') +
      (s.deboTotal ? '<p class="mano grande">' + (libre >= 0 ? 'si pagas tus tarjetas te quedan ' + L.fmt(libre, 'PEN') : 'tus tarjetas suman más que tu plata') + '</p>' : '') +
      '<div class="pastillas">' +
      '<a class="pastilla c-celeste" href="#tarjetas"><span>Tarjetas</span><b>' + monLineas(s.debo) + '</b></a>' +
      '<a class="pastilla c-amarillo" href="#personas"><span>Te deben</span><b>' + monLineas(per.meDeben) + '</b></a>' +
      '<a class="pastilla c-rosa" href="#alcancia"><span>Alcancía</span><b>' + L.fmt(al.enSoles, 'PEN') + '</b></a></div></section>';

    // Este mes
    const r = L.resumenMes(estado, mesHoy), t = L.topesMes(estado, mesHoy);
    const base = t.hay ? Math.max(t.tope, r.gastado) : r.gastado;
    h += '<section class="caja mes"><div class="encabezado"><span class="eyebrow">' + L.nombreMes(mesHoy).nombre + ', lo tuyo</span>' +
      '<a class="enlace" href="#stats">Ver stats</a></div><div class="anillo-caja">' +
      anillo(r.porCategoria.map(function (x) { return { color: x.cat.color, valor: x.total }; }), base) +
      '<div class="centro"><span class="meta">Gastaste</span>' + num(r.gastado, 'PEN', 'medio') +
      (t.hay ? '<span class="meta">de ' + L.fmt(t.tope, 'PEN') + '</span>' : '') + '</div></div>';
    if (t.hay) {
      h += '<p class="mano grande centrado' + (t.resto < 0 ? ' rojo' : '') + '">' + (t.resto >= 0 ? 'te quedan ' + L.fmt(t.resto, 'PEN') + ' de tus topes' :
        'te pasaste ' + L.fmt(-t.resto, 'PEN') + ' de tus topes') + '</p>';
      h += '<div class="mini-topes">';
      for (const f of t.filas) {
        if (!f.tope) continue;
        h += '<button class="mini-tope" data-accion="tope" data-id="' + esc(f.cat.id) + '">' + burbuja(f.cat) + '<span class="izq"><b>' + esc(f.cat.nombre) +
          '</b><span class="barrita"><i class="c-' + f.cat.color + (f.pasado ? ' pasado' : '') + '" style="width:' + Math.min(100, f.pct) + '%"></i></span></span>' +
          '<span class="der' + (f.pasado ? ' rojo' : '') + '">' + f.pct + '%</span></button>';
      }
      h += '</div>';
    } else {
      h += '<p class="centrado"><button class="btn mini" data-accion="ir" data-v="stats">Ponte topes por categoría</button></p>';
    }
    h += '</section>';

    // Por tarjeta
    const ts = L.tarjetas(estado);
    if (ts.length) {
      h += '<div class="encabezado"><span class="eyebrow">Este ciclo, por tarjeta</span><a class="enlace" href="#tarjetas">Detalle</a></div><div class="carrusel">';
      for (const tj of ts) {
        const e = L.estadoTarjeta(estado, tj, hoy);
        h += '<a class="plastico c-' + esc(tj.color) + '" href="#tarjetas"><span class="banco">' + esc(tj.nombre) + '<i>crédito</i></span>' +
          '<span class="monto">' + monLineas({ PEN: e.ciclo.PEN.total, USD: e.ciclo.USD.total }) + '</span>' +
          '<span class="reparto">' + repartoCorto(e.ciclo) + '</span><span class="cierra">cierra ' + cuando(e.diasParaCierre) + '</span></a>';
      }
      h += '</div>';
    }

    // Atajos
    const sueldo = L.ultimoSueldo(estado);
    h += '<div class="atajos">' +
      '<button class="atajo c-salvia" data-accion="sueldo">' + ICO.sueldo + '<b>Llegó el sueldo</b><span>' + (sueldo ? L.fmt(sueldo.monto, sueldo.mon) : 'Anotarlo') + '</span></button>' +
      '<a class="atajo c-rosa" href="#alcancia">' + ICO.alcancia + '<b>Alcancía</b><span>' + (al.racha ? al.racha + (al.racha === 1 ? ' mes' : ' meses seguidos') : 'Apartar algo') + '</span></a>' +
      '<a class="atajo c-amarillo" href="#personas">' + ICO.personas + '<b>Personas</b><span>' + esc(estado.personas.slice(0, 2).join(', ') || 'Agregar') + '</span></a>' +
      '<a class="atajo c-lila" href="#subs">' + ICO.suscripciones + '<b>Suscripciones</b><span>' + L.fmt(L.totalSubs(estado), 'PEN') + ' al mes</span></a></div>';

    // Últimos
    const ultimos = estado.movs.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.creado || 0) - (a.creado || 0); }).slice(0, 5);
    if (ultimos.length) {
      h += '<div class="encabezado"><span class="eyebrow">Lo último</span><a class="enlace" href="#movs">Ver todo</a></div><div class="lista">' + ultimos.map(filaMov).join('') + '</div>';
    } else {
      h += '<section class="vacio">' + chanchito(90) + '<p class="mano grande">tu chanchito está esperando</p><span class="meta">Toca el + de abajo para anotar tu primer gasto.</span></section>';
    }
    return h;
  }

  // "Tuyo S/ 80 · Mamá S/ 40" para lo que lleva una tarjeta, por moneda.
  function repartoCorto(c) {
    const t = [];
    for (const mon of L.MONEDAS) {
      const b = c[mon];
      if (!b.total) continue;
      const otros = Object.keys(b.otros);
      if (!otros.length) continue;
      t.push('tuyo ' + L.fmt(b.mio, mon) + otros.map(function (p) { return ' · ' + p + ' ' + L.fmt(b.otros[p], mon); }).join(''));
    }
    return t.length ? esc(t.join(' / ')) : 'todo tuyo';
  }

  function vMovs() {
    return '<label class="buscador">' + ICO.lupa + '<input id="buscar" type="search" placeholder="Buscar: Starbucks, Mamá, ropa…" autocomplete="off" value="' + esc(busca) + '"></label>' +
      '<div id="resultados">' + resultadosMovs() + '</div>';
  }
  // Con algo escrito en el buscador, busca en todos los meses; si no, muestra el mes con sus filtros.
  function resultadosMovs() {
    if (busca.trim()) {
      const r = L.buscar(estado, busca);
      if (!r.n) return '<section class="vacio">' + chanchito(80) + '<p class="mano grande">no encontré nada</p><span class="meta">Prueba con otra palabra: un lugar, una nota o una persona.</span></section>';
      let h = '<div class="caja resumen-busqueda"><span class="eyebrow">' + r.n + (r.n === 1 ? ' movimiento' : ' movimientos') + ' en todos los meses</span>' +
        (r.total ? num(r.total, 'PEN', 'medio') + '<span class="meta">gastaste tú en total (solo lo tuyo)</span>' : '') + '</div>';
      for (const d of r.dias) h += '<div class="dia"><span class="eyebrow">' + L.etiquetaDia(d.fecha) + ' ' + d.fecha.slice(0, 4) + '</span></div><div class="lista">' + d.movs.map(filaMov).join('') + '</div>';
      return h;
    }
    const chip = function (id, texto) {
      return '<button class="chip' + (filtro === id ? ' on' : '') + '" data-accion="filtro" data-f="' + esc(id) + '">' + esc(texto) + '</button>';
    };
    let h = '<div class="tira">' + chip('', 'Todo') + L.tarjetas(estado).map(function (c) { return chip(c.id, c.nombre + ' crédito'); }).join('') +
      L.debitos(estado).map(function (c) { return chip(c.id, L.nombreCuenta(c)); }).join('') + chip('otros', 'De otras personas') + '</div>';
    const f = !filtro ? null : filtro === 'otros' ? function (m) { return !!m.ajeno; } :
      function (m) { return m.cuenta === filtro || m.tarjeta === filtro || m.destino === filtro; };
    const dias = L.diasConMovs(estado, mes, f);
    if (!dias.length) {
      return h + '<section class="vacio">' + chanchito(80) + '<p class="mano grande">nada por aquí</p><span class="meta">No hay movimientos ' +
        (filtro ? 'con este filtro ' : '') + 'en este mes.</span></section>';
    }
    for (const d of dias) {
      h += '<div class="dia"><span class="eyebrow">' + L.etiquetaDia(d.fecha) + '</span>' + (d.gasto ? '<span class="meta">gastaste ' + L.fmt(d.gasto, 'PEN') + '</span>' : '') + '</div>' +
        '<div class="lista">' + d.movs.map(filaMov).join('') + '</div>';
    }
    return h;
  }

  function vTarjetas() {
    const hoy = L.hoyISO();
    let h = '';
    for (const t of L.tarjetas(estado)) {
      const e = L.estadoTarjeta(estado, t, hoy);
      const hayFalta = e.falta.PEN || e.falta.USD;
      h += '<section class="caja tarjeta-caja"><div class="plastico grande c-' + esc(t.color) + '"><span class="banco">' + esc(t.nombre) + '<i>crédito</i></span>' +
        '<span class="etq-mano">debes en total</span><span class="monto">' + monLineas(e.deuda) + '</span>' +
        '<button class="redondo claro" data-accion="tarjeta" data-id="' + esc(t.id) + '" aria-label="Fechas de la tarjeta">' + ICO.ajustes + '</button></div>';
      h += bloqueCiclo('Este ciclo', e.actual.desde, e.actual.hasta, e.ciclo,
        'Cierra ' + cuando(e.diasParaCierre) + ' (' + L.etiquetaDia(e.actual.hasta) + ') · se paga el ' + L.etiquetaDia(e.actual.pago));
      h += bloqueCiclo('Estado de cuenta', e.anterior.desde, e.anterior.hasta, e.facturado, null);
      h += '<div class="falta' + (hayFalta ? '' : ' listo') + '"><div><span class="eyebrow">' + (hayFalta ? 'Falta pagar' : 'Estado de cuenta') + '</span>' +
        '<b>' + (hayFalta ? monLineas(e.falta) : '¡Pagado!') + '</b><span class="meta">' + (hayFalta ? 'Hasta el ' + L.etiquetaDia(e.anterior.pago) + ', ' + cuando(e.diasParaPagar) :
        'Nada pendiente hasta el próximo cierre') + '</span></div>' +
        '<button class="btn ' + (hayFalta ? 'oscuro' : '') + '" data-accion="pagar" data-id="' + esc(t.id) + '">Pagar</button></div>';
      h += '<button class="enlace bloque" data-accion="ver-cuenta" data-id="' + esc(t.id) + '">Ver sus movimientos</button></section>';
    }
    h += '<p class="centrado"><button class="btn mini" data-accion="tarjeta">' + ICO.mas + 'Agregar tarjeta de crédito</button></p>';

    const s = L.saldos(estado);
    h += '<div class="encabezado"><span class="eyebrow">Tus cuentas</span><button class="enlace" data-accion="cuenta">Agregar</button></div><div class="lista">';
    for (const f of s.cuentas) {
      const medios = estado.medios.filter(function (x) { return x.cuenta === f.id; }).map(function (x) { return x.nombre; });
      h += '<button class="fila" data-accion="cuenta" data-id="' + esc(f.id) + '"><span class="burbuja c-arena">' + (f.id === 'k-efectivo' ? ICO.sueldo : ICO.tarjeta) +
        '</span><span class="izq"><b>' + esc(L.nombreCuenta(L.cuentaDe(estado, f.id))) + '</b><span class="meta">' + (medios.length ? 'con ' + esc(medios.join(' y ')) : f.mon === 'USD' ? 'En dólares' : 'En soles') +
        '</span></span><span class="der' + (f.saldo < 0 ? ' rojo' : '') + '">' + L.fmt(f.saldo, f.mon) + '</span></button>';
    }
    h += '<div class="fila total"><span class="izq"><b>Total</b></span><span class="der">' + L.fmt(s.tengoTotal, 'PEN') + '</span></div></div>' +
      '<p class="nota-pie">Toca una cuenta para poner su saldo de hoy (el que ves en la app del banco).</p>';
    return h;
  }

  // Un periodo de la tarjeta: total por moneda y de quién es cada parte.
  function bloqueCiclo(titulo, desde, hasta, c, pie) {
    let h = '<div class="ciclo"><div class="encabezado"><span class="eyebrow">' + titulo + '</span><span class="meta">' + L.fechaCorta(desde) + ' – ' + L.fechaCorta(hasta) + '</span></div>';
    let algo = false;
    for (const mon of L.MONEDAS) {
      const b = c[mon];
      if (!b.total) continue;
      algo = true;
      h += '<div class="reparto-filas">' + (mon === 'USD' && c.PEN.total ? '<span class="eyebrow">En dólares</span>' : '') + '<div class="rf"><span>Tuyo</span><b>' + L.fmt(b.mio, mon) + '</b></div>';
      for (const p of Object.keys(b.otros)) h += '<div class="rf otro"><span>' + esc(p) + '</span><b>' + L.fmt(b.otros[p], mon) + '</b></div>';
      h += '<div class="rf total"><span>Total' + (mon === 'USD' ? ' en dólares' : '') + '</span><b>' + L.fmt(b.total, mon) + '</b></div></div>';
    }
    if (!algo) h += '<p class="meta">Sin consumos anotados.</p>';
    return h + (pie ? '<p class="meta">' + pie + '</p>' : '') + '</div>';
  }

  function vStats() {
    const r = L.resumenMes(estado, mes), antes = L.resumenMes(estado, L.moverMes(mes, -1)), t = L.topesMes(estado, mes);
    let h = '<section class="caja"><span class="eyebrow">Gastaste en ' + L.nombreMes(mes).nombre.toLowerCase() + '</span>' + num(r.gastado, 'PEN', 'grande');
    if (antes.gastado) {
      const d = Math.round((r.gastado - antes.gastado) / antes.gastado * 100);
      h += '<span class="cambio ' + (d > 0 ? 'sube' : 'baja') + '">' + (d > 0 ? '↑ ' : '↓ ') + Math.abs(d) + '% que ' + L.nombreMes(L.moverMes(mes, -1)).nombre.toLowerCase() + '</span>';
    }
    h += '<p class="meta">Solo lo tuyo, en soles. Lo que pagaste por otras personas va aparte.</p></section>';

    h += '<div class="encabezado"><span class="eyebrow">En qué se fue · topes</span></div><div class="lista">';
    for (const f of t.filas) {
      const parte = r.porCategoria.filter(function (x) { return x.cat.id === f.cat.id; })[0];
      if (!f.gastado && !f.tope) {
        h += '<button class="fila apagada" data-accion="tope" data-id="' + esc(f.cat.id) + '">' + burbuja(f.cat) + '<span class="izq"><b>' + esc(f.cat.nombre) +
          '</b><span class="meta">Sin gastos · tocar para poner tope</span></span></button>';
        continue;
      }
      h += '<button class="fila bloque" data-accion="tope" data-id="' + esc(f.cat.id) + '">' + burbuja(f.cat) + '<span class="izq"><span class="arriba"><b>' + esc(f.cat.nombre) + '</b><span' + (f.pasado ? ' class="rojo"' : '') + '>' +
        L.fmt(f.gastado, 'PEN') + (f.tope ? ' <i class="meta">de ' + L.fmt(f.tope, 'PEN') + '</i>' : '') + '</span></span>' +
        '<span class="barrita"><i class="c-' + f.cat.color + (f.pasado ? ' pasado' : '') + '" style="width:' + (f.tope ? Math.min(100, f.pct) : parte ? parte.pct : 0) + '%"></i></span>' +
        '<span class="meta">' + (f.tope ? (f.pasado ? 'Te pasaste ' + L.fmt(-f.resto, 'PEN') : 'Te quedan ' + L.fmt(f.resto, 'PEN')) : (parte ? parte.pct + '% de tu mes · sin tope' : '')) + '</span></span></button>';
    }
    h += '</div>';

    h += '<div class="encabezado"><span class="eyebrow">Día a día</span><span class="meta">más grande = más gasto</span></div>' + calendario(r);

    if (r.porLugar.length) {
      h += '<div class="encabezado"><span class="eyebrow">Dónde más gastas</span></div><div class="lista">';
      for (const l of r.porLugar.slice(0, 5)) {
        h += '<div class="fila"><span class="izq"><b>' + esc(l.nombre) + '</b><span class="meta">' + l.veces + (l.veces === 1 ? ' vez' : ' veces') + '</span></span><span class="der">' + L.fmt(l.total, 'PEN') + '</span></div>';
      }
      h += '</div>';
    }
    if (r.porMedio.length) {
      h += '<div class="encabezado"><span class="eyebrow">Con qué pagas</span></div><div class="caja barras">';
      for (const m of r.porMedio) {
        h += '<div class="barra-fila"><span>' + esc(m.nombre) + '</span><span class="barrita"><i class="c-celeste" style="width:' + m.pct + '%"></i></span><b>' + m.pct + '%</b></div>';
      }
      h += '</div>';
    }
    const otros = Object.keys(r.deOtros);
    if (otros.length) {
      h += '<div class="encabezado"><span class="eyebrow">Pagaste por otras personas</span></div><div class="lista">';
      for (const p of otros) h += '<a class="fila" href="#personas"><span class="izq"><b>' + esc(p) + '</b><span class="meta">Este mes, con tus tarjetas o cuentas</span></span><span class="der">' + dosMon(r.deOtros[p]) + '</span></a>';
      h += '</div>';
    }
    return h;
  }

  // Calendario del mes: un punto por día, más grande cuanto más gastó.
  function calendario(r) {
    const total = L.diasDelMes(mes), hoy = L.hoyISO();
    const p = mes.split('-').map(Number);
    const vacios = (new Date(p[0], p[1] - 1, 1).getDay() + 6) % 7;   // la semana empieza el lunes
    let max = 0;
    for (const k in r.porDia) max = Math.max(max, r.porDia[k]);
    let h = '<div class="caja calendario"><div class="sem">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="dias">';
    for (let i = 0; i < vacios; i++) h += '<span></span>';
    for (let d = 1; d <= total; d++) {
      const f = mes + '-' + String(d).padStart(2, '0'), v = r.porDia[f] || 0;
      const tam = v ? Math.round(8 + Math.sqrt(v / max) * 28) : 0;
      h += '<span class="d' + (f === hoy ? ' hoy' : '') + '" title="' + (v ? L.fmt(v, 'PEN') : '') + '">' + (v ? '<i style="width:' + tam + 'px;height:' + tam + 'px"></i>' : '') + '<em>' + d + '</em></span>';
    }
    return h + '</div></div>';
  }

  function vAlcancia() {
    const hoy = L.hoyISO(), a = L.alcancia(estado, hoy);
    let h = '<section class="caja alcancia-caja">' + chanchito(120) + '<span class="eyebrow">Tienes apartado</span>' + num(a.enSoles, 'PEN', 'grande') +
      (a.total.USD ? '<span class="meta">' + L.fmt(a.total.PEN, 'PEN') + ' + ' + L.fmt(a.total.USD, 'USD') + '</span>' : '') +
      (a.racha ? '<span class="racha">' + ICO.fuego + a.racha + (a.racha === 1 ? ' mes' : ' meses seguidos') + ' ahorrando</span>' : '<p class="mano grande">aparta algo este mes y empieza tu racha</p>') +
      '<div class="botones centrados"><button class="btn oscuro" data-accion="aporte" data-signo="1">' + ICO.mas + 'Apartar</button>' +
      '<button class="btn" data-accion="aporte" data-signo="-1">Sacar</button></div></section>';
    // los últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) meses.push(L.moverMes(L.mesDe(hoy), -i));
    const max = Math.max.apply(null, meses.map(function (m) { return Math.abs(a.porMes[m] || 0); }).concat([1]));
    h += '<div class="encabezado"><span class="eyebrow">Mes a mes</span></div><div class="caja columnas">';
    for (const m of meses) {
      const v = a.porMes[m] || 0;
      h += '<div class="col"><span class="valor">' + (v ? Math.round(v / 100) : '') + '</span><i class="' + (v < 0 ? 'neg' : '') + '" style="height:' + Math.round(Math.abs(v) / max * 100) + '%"></i><span>' + L.nombreMes(m).nombre.slice(0, 3) + '</span></div>';
    }
    h += '</div><p class="nota-pie">La alcancía es plata que apartas en tu cabeza: no sale de ninguna cuenta, solo te ayuda a no gastarla.</p>';
    const lista = estado.alcancia.slice().sort(function (x, y) { return x.fecha < y.fecha ? 1 : -1; });
    if (lista.length) {
      h += '<div class="encabezado"><span class="eyebrow">Movimientos</span></div><div class="lista">';
      for (const x of lista) {
        h += '<button class="fila" data-accion="editar-aporte" data-id="' + esc(x.id) + '"><span class="izq"><b>' + (x.monto > 0 ? 'Apartaste' : 'Sacaste') + '</b><span class="meta">' +
          L.etiquetaDia(x.fecha) + (x.nota ? ' · ' + esc(x.nota) : '') + '</span></span><span class="der' + (x.monto > 0 ? ' ingreso' : '') + '">' + (x.monto > 0 ? '+ ' : '') + L.fmt(x.monto, x.mon) + '</span></button>';
      }
      h += '</div>';
    }
    return h;
  }

  function vPersonas() {
    const t = L.totalPersonas(estado);
    let h = '<section class="reticula"><div class="caja chica c-amarillo"><span class="eyebrow">Te deben</span><b class="num-chico">' + dosMon(t.meDeben) + '</b></div>' +
      '<div class="caja chica c-lila"><span class="eyebrow">Debes</span><b class="num-chico">' + dosMon(t.debo) + '</b></div></section><div class="lista">';
    for (const f of L.personas(estado)) {
      h += '<button class="fila" data-accion="persona" data-id="' + esc(f.clave) + '"><span class="burbuja c-durazno"><b>' + esc(f.nombre.charAt(0).toUpperCase()) + '</b></span><span class="izq"><b>' + esc(f.nombre) +
        '</b><span class="meta">' + (f.apuntes.length ? esc(f.apuntes[0].nota || L.ROTULO_APUNTE[L.tipoApunte(f.apuntes[0])]) : 'Sin movimientos') + '</span></span>' + saldoPersona(f) + '</button>';
    }
    return h + '</div><p class="centrado"><button class="btn mini" data-accion="nueva-persona">' + ICO.mas + 'Agregar persona</button></p>' +
      '<p class="nota-pie">Cuando anotas un gasto que es de otra persona (como lo que tu mamá compra con tu tarjeta), queda aquí solo.</p>';
  }
  function saldoPersona(f) {
    if (!f.pendiente) return '<span class="der neutro">Al día</span>';
    const t = [];
    for (const mon of L.MONEDAS) {
      const v = f.saldo[mon];
      if (v) t.push('<span class="' + (v > 0 ? 'ingreso' : 'rojo') + '">' + (v > 0 ? 'te debe ' : 'le debes ') + L.fmt(Math.abs(v), mon) + '</span>');
    }
    return '<span class="der">' + t.join('<br>') + '</span>';
  }

  function vSubs() {
    let h = '<section class="caja c-lila"><span class="eyebrow">Al mes en suscripciones</span>' + num(L.totalSubs(estado), 'PEN', 'grande') +
      '<p class="meta">Los dólares van al cambio de ' + estado.tc.toFixed(2) + '. El día del cobro te aparece en Inicio para confirmarlo.</p></section><div class="lista">';
    const subs = estado.subs.slice().sort(function (a, b) { return a.dia - b.dia; });
    for (const s of subs) {
      h += '<button class="fila' + (s.pausada ? ' apagada' : '') + '" data-accion="sub" data-id="' + esc(s.id) + '"><span class="burbuja c-salvia"><b>' + s.dia + '</b></span><span class="izq"><b>' + esc(s.nombre) +
        '</b><span class="meta">' + (s.pausada ? 'En pausa' : 'El ' + s.dia + ' de cada mes') + ' · ' + esc(L.nombreCuenta(L.cuentaDe(estado, s.cuenta))) + '</span></span><span class="der">' + L.fmt(s.monto, s.mon) + '</span></button>';
    }
    if (!subs.length) h += '<div class="fila"><span class="izq"><span class="meta">Todavía no hay suscripciones. Agrega Netflix, Apple, Spotify…</span></span></div>';
    return h + '</div><p class="centrado"><button class="btn mini" data-accion="sub">' + ICO.mas + 'Agregar suscripción</button></p>';
  }

  function vAjustes() {
    const fila = function (accion, titulo, meta, extra) {
      return '<button class="fila" data-accion="' + accion + '"' + (extra || '') + '><span class="izq"><b>' + titulo + '</b>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</span><span class="der">' + ICO.der + '</span></button>';
    };
    const dias = diasDesdeRespaldo();
    let h = '<div class="encabezado"><span class="eyebrow">Tú</span></div><div class="lista">' +
      fila('nombre', 'Tu nombre', esc(estado.nombre)) +
      fila('cambio', 'Tipo de cambio', 'S/ ' + estado.tc.toFixed(3).replace(/0$/, '') + ' por dólar') +
      fila('bienvenida', 'Configurar de nuevo', 'Repasa tus cuentas, tarjetas, suscripciones y topes') +
      fila('medios', 'Yape y Plin', estado.medios.map(function (m) { return esc(m.nombre) + ' sale de ' + esc(L.nombreCuenta(L.cuentaDe(estado, m.cuenta))); }).join(' · ')) + '</div>';
    h += '<div class="encabezado"><span class="eyebrow">Categorías</span><button class="enlace" data-accion="cat">Agregar</button></div><div class="cats-ajustes">';
    for (const c of estado.categorias) h += '<button class="cat-chip c-' + esc(c.color) + '" data-accion="cat" data-id="' + esc(c.id) + '">' + (ICO[c.ico] || '') + esc(c.nombre) + '</button>';
    h += '</div>';
    h += '<div class="encabezado"><span class="eyebrow">Recordatorio diario</span></div><div class="caja c-amarillo recordatorio">' +
      '<p><b>Para que te avise todas las noches:</b></p><ol><li>Abre la app <b>Recordatorios</b> del iPhone.</li><li>Crea uno que diga <i>Anotar en Oink</i>.</li>' +
      '<li>Toca la <b>i</b>, activa <b>Fecha</b> y <b>Hora</b> (por ejemplo 9:00 p. m.).</li><li>En <b>Repetir</b> elige <b>Cada día</b>.</li></ol>' +
      '<p class="meta">Cuando suene, abre Oink desde su ícono del chanchito.</p></div>';
    h += '<div class="encabezado"><span class="eyebrow">Tus datos</span></div><div class="lista">' +
      fila('respaldo', 'Guardar respaldo', dias === null ? 'Todavía no has guardado ninguno' : 'El último fue hace ' + dias + (dias === 1 ? ' día' : ' días')) +
      fila('restaurar', 'Restaurar un respaldo', 'Reemplaza todo lo que hay ahora') +
      fila('excel', 'Bajar para Excel', 'Todos los movimientos en una hoja') +
      fila('borrar-todo', '<span class="rojo">Borrar todo</span>', '') + '</div>' +
      '<p class="nota-pie">Tus datos viven solo en este celular. Guarda un respaldo en Archivos o iCloud de vez en cuando.</p>';
    return h;
  }

  // ---------- hojas (paneles que suben desde abajo) ----------

  function seg(nombre, opciones, valor, repinta) {
    return '<div class="seg">' + opciones.map(function (o) {
      return '<label><input type="radio" name="' + nombre + '" value="' + esc(o[0]) + '"' + (String(valor) === String(o[0]) ? ' checked' : '') +
        (repinta ? ' data-repinta' : '') + '><span>' + o[1] + '</span></label>';
    }).join('') + '</div>';
  }
  function chips(nombre, opciones, valor, repinta, clase) {
    return '<div class="chips ' + (clase || '') + '">' + opciones.map(function (o) {
      return '<label class="' + (o[2] || '') + '"><input type="radio" name="' + nombre + '" value="' + esc(o[0]) + '"' + (String(valor) === String(o[0]) ? ' checked' : '') +
        (repinta ? ' data-repinta' : '') + '><span>' + o[1] + '</span></label>';
    }).join('') + '</div>';
  }
  function campo(etq, cuerpo, nota) {
    return '<div class="campo"><span class="etq">' + etq + '</span>' + cuerpo + (nota ? '<span class="nota">' + nota + '</span>' : '') + '</div>';
  }
  function entrada(nombre, valor, extra) {
    return '<input name="' + nombre + '" value="' + esc(valor) + '" ' + (extra || '') + '>';
  }
  function montoGrande(d, nombre, conMoneda) {
    return '<div class="monto-grande"><input name="' + (nombre || 'monto') + '" inputmode="decimal" placeholder="0.00" autocomplete="off" value="' + esc(d[nombre || 'monto']) + '">' +
      (conMoneda ? seg('mon', [['PEN', 'S/'], ['USD', 'US$']], d.mon, true) : '') + '</div>';
  }
  function cabezaHoja(titulo) {
    return '<div class="cabeza-hoja"><h2>' + titulo + '</h2><button type="button" class="redondo" data-accion="cerrar" aria-label="Cerrar">' + ICO.cerrar + '</button></div>';
  }
  function pieHoja(borrar) {
    return errorHoja() + '<div class="pie-hoja"><button class="btn oscuro ancho">Guardar</button>' +
      (borrar ? '<button type="button" class="btn texto rojo" data-accion="' + borrar + '">Eliminar</button>' : '') + '</div>';
  }
  function errorHoja() { return hoja.error ? '<p class="error">' + esc(hoja.error) + '</p>' : ''; }
  function opcionesDebito(conMon) {
    return L.debitos(estado).map(function (c) { return [c.id, esc(L.nombreCuenta(c)) + (conMon && c.mon === 'USD' ? ' (US$)' : '')]; });
  }
  // Con qué se paga: Yape y Plin primero, después las tarjetas y las cuentas.
  function opcionesPago() {
    const r = estado.medios.map(function (m) { return ['m:' + m.id, esc(m.nombre), 'medio']; });
    for (const c of L.tarjetas(estado)) r.push(['c:' + c.id, esc(c.nombre) + ' crédito', 'credito c-' + c.color]);
    for (const c of L.debitos(estado)) r.push(['c:' + c.id, esc(L.nombreCuenta(c)), '']);
    return r;
  }
  function cuentaDeOpcion(v) {
    if (!v) return null;
    if (v.indexOf('m:') === 0) { const m = L.medioDe(estado, v.slice(2)); return m ? L.cuentaDe(estado, m.cuenta) : null; }
    return L.cuentaDe(estado, v.slice(2));
  }

  const HOJAS = {
    mov: function () {
      const d = hoja.d;
      let h = '<form data-envio="mov">' + cabezaHoja(hoja.id ? 'Editar' : hoja.sub ? 'Suscripción' : 'Anotar');
      if (!hoja.id) h += seg('tipo', [['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['pago', 'Pago'], ['devolucion', 'Devolución'], ['mover', 'Mover']], d.tipo, true);
      else h += '<input type="hidden" name="tipo" value="' + esc(d.tipo) + '">';

      if (d.tipo === 'gasto' || d.tipo === 'devolucion') {
        const dev = d.tipo === 'devolucion';
        if (dev) h += '<p class="nota">Algo que devolviste y te reembolsaron. Resta de la tarjeta o vuelve a la cuenta, y baja lo que gastaste en esa categoría.</p>';
        h += montoGrande(d, 'monto', true);
        h += campo(dev ? '¿De qué era?' : '¿En qué?', chips('cat', estado.categorias.map(function (c) {
          return [c.id, (ICO[c.ico] || '') + esc(c.nombre), 'cat-chip c-' + c.color];
        }), d.cat, false, 'cats'));
        h += campo(dev ? '¿A dónde volvió la plata?' : '¿Con qué pagaste?', chips('con', opcionesPago(), d.con, true));
        const cta = cuentaDeOpcion(d.con);
        if (cta && !L.esCredito(cta) && cta.mon !== d.mon) {
          h += campo('¿Cuánto te cobró el banco? (' + L.SIMBOLO[cta.mon] + ')', entrada('cobrado', d.cobrado, 'inputmode="decimal" placeholder="' + estimado(d.monto, d.mon, cta.mon) + '"'),
            'Si lo dejas vacío, se calcula con el tipo de cambio.');
        }
        const quien = [['', 'Mío']].concat(estado.personas.map(function (p) { return [p, esc(p)]; })).concat(dev ? [] : [['__nueva', '+ Otra persona']]);
        h += campo(dev ? '¿De quién era?' : '¿De quién es?', chips('de', quien, d.de, true));
        if (d.de === '__nueva') h += campo('Nombre', entrada('nueva', d.nueva, 'placeholder="Por ejemplo, Papá" autocomplete="off"'));
        if (d.de) {
          h += seg('cuanto', [['todo', 'Todo es suyo'], ['mitad', 'Mitad y mitad'], ['otro', 'Otra parte']], d.cuanto, true);
          if (d.cuanto === 'otro') h += campo('¿Cuánto le toca?', entrada('parte', d.parte, 'inputmode="decimal" placeholder="0.00"'));
          h += '<p class="nota">' + (dev ? 'Baja lo que te debe.' : 'Suma a la tarjeta o cuenta, pero no a tus gastos ni a tus topes.') + '</p>';
        }
        h += '<div class="dos">' + campo('Lugar <i>opcional</i>', entrada('lugar', d.lugar, 'list="lugares" placeholder="¿Dónde?" autocomplete="off"')) +
          campo('Fecha', entrada('fecha', d.fecha, 'type="date"')) + '</div>';
        h += campo('Nota <i>opcional</i>', entrada('nota', d.nota, 'placeholder="¿Qué fue?" autocomplete="off"'));
        h += '<datalist id="lugares">' + L.lugaresUsados(estado).slice(0, 40).map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist>';
      } else if (d.tipo === 'ingreso') {
        h += montoGrande(d, 'monto', true);
        h += campo('¿Qué es?', chips('cat', estado.catIngreso.map(function (c) { return [c.id, esc(c.nombre)]; }), d.cat));
        h += campo('¿A qué cuenta llegó?', chips('cuenta', opcionesDebito(true), d.cuenta, true));
        const cta = L.cuentaDe(estado, d.cuenta);
        if (cta && cta.mon !== d.mon) h += campo('¿Cuánto llegó? (' + L.SIMBOLO[cta.mon] + ')', entrada('cobrado', d.cobrado, 'inputmode="decimal" placeholder="' + estimado(d.monto, d.mon, cta.mon) + '"'));
        h += '<div class="dos">' + campo('Fecha', entrada('fecha', d.fecha, 'type="date"')) + campo('Nota <i>opcional</i>', entrada('nota', d.nota, 'autocomplete="off"')) + '</div>';
      } else if (d.tipo === 'pago') {
        h += campo('¿Qué tarjeta pagaste?', chips('tarjeta', L.tarjetas(estado).map(function (c) { return [c.id, esc(c.nombre) + ' crédito', 'credito c-' + c.color]; }), d.tarjeta, true));
        h += montoGrande(d, 'monto', true);
        const t = L.cuentaDe(estado, d.tarjeta);
        if (t) {
          const e = L.estadoTarjeta(estado, t, L.hoyISO());
          if (e.falta[d.mon] || e.deuda[d.mon] > 0) {
            h += '<div class="sugerencias">' + (e.falta[d.mon] ? '<button type="button" class="chip" data-accion="usar-monto" data-v="' + L.aTexto(e.falta[d.mon]) + '">Falta pagar ' + L.fmt(e.falta[d.mon], d.mon) + '</button>' : '') +
              (e.deuda[d.mon] > 0 && e.deuda[d.mon] !== e.falta[d.mon] ? '<button type="button" class="chip" data-accion="usar-monto" data-v="' + L.aTexto(e.deuda[d.mon]) + '">Todo ' + L.fmt(e.deuda[d.mon], d.mon) + '</button>' : '') + '</div>';
          }
        }
        h += campo('¿Desde qué cuenta?', chips('cuenta', opcionesDebito(true), d.cuenta, true));
        const cta = L.cuentaDe(estado, d.cuenta);
        if (cta && cta.mon !== d.mon) h += campo('¿Cuánto salió de tu cuenta? (' + L.SIMBOLO[cta.mon] + ')', entrada('sale', d.sale, 'inputmode="decimal" placeholder="' + estimado(d.monto, d.mon, cta.mon) + '"'));
        h += '<div class="dos">' + campo('Fecha', entrada('fecha', d.fecha, 'type="date"')) + campo('Nota <i>opcional</i>', entrada('nota', d.nota, 'autocomplete="off"')) + '</div>';
      } else {
        h += montoGrande(d, 'monto', false);
        h += campo('Sale de', chips('cuenta', opcionesDebito(true), d.cuenta, true));
        h += campo('Llega a', chips('destino', opcionesDebito(true), d.destino, true));
        const a = L.cuentaDe(estado, d.cuenta), b = L.cuentaDe(estado, d.destino);
        if (a && b && a.mon !== b.mon) h += campo('¿Cuánto llegó? (' + L.SIMBOLO[b.mon] + ')', entrada('llega', d.llega, 'inputmode="decimal" placeholder="' + estimado(d.monto, a.mon, b.mon) + '"'));
        h += '<div class="dos">' + campo('Fecha', entrada('fecha', d.fecha, 'type="date"')) + campo('Nota <i>opcional</i>', entrada('nota', d.nota, 'placeholder="Retiro, cambio…" autocomplete="off"')) + '</div>';
      }
      return h + pieHoja(hoja.id ? 'borrar-mov' : null) +
        (hoja.id && d.tipo === 'gasto' ? '<p class="centrado"><button type="button" class="btn mini" data-accion="devolver">Devolví esto</button></p>' : '') + '</form>';
    },

    bienvenida: function () {
      const d = hoja.d, paso = hoja.paso;
      const puntos = '<div class="puntos">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<i' + (i === paso ? ' class="on"' : i < paso ? ' class="ya"' : '') + '></i>'; }).join('') + '</div>';
      const pie = function (siguiente) {
        return errorHoja() + '<div class="pie-hoja"><button class="btn oscuro ancho">' + siguiente + '</button>' +
          '<div class="botones centrados">' + (paso > 0 ? '<button type="button" class="btn texto" data-accion="bv-atras">' + ICO.izq + 'Atrás</button>' : '') +
          (paso < 5 ? '<button type="button" class="btn texto" data-accion="bv-saltar">' + (paso === 0 ? 'Saltar todo' : 'Saltar este paso') + '</button>' : '') + '</div></div>';
      };
      let h = '<form data-envio="bienvenida">' + puntos;
      if (paso === 0) {
        h += '<div class="bv-hola">' + chanchito(130) + '<h2>¡Hola!</h2><p class="mano grande">soy tu chanchito de bolsillo</p>' +
          '<p>Te voy a pedir unos datos para que tus números arranquen bien: tus cuentas, tus tarjetas, tus suscripciones y tus topes. Son 2 minutos.</p></div>' +
          campo('¿Cómo te llamo?', entrada('nombre', d.nombre, 'autocomplete="off" maxlength="40"')) + pie('Empezar');
      } else if (paso === 1) {
        h += '<h2>Tus cuentas</h2><p class="nota">¿Cuánto tienes hoy en cada una? Míralo en la app del banco. Yape sale del BCP y Plin del Scotiabank.</p>';
        for (const c of L.debitos(estado)) h += campo(esc(L.nombreCuenta(c)), entrada('saldo_' + c.id, d['saldo_' + c.id], 'inputmode="decimal" placeholder="' + L.SIMBOLO[c.mon] + ' 0.00"'));
        h += pie('Siguiente');
      } else if (paso === 2) {
        h += '<h2>Tus tarjetas</h2><p class="nota">Abre la app de cada banco y mira tu tarjeta de crédito. Si no sabes algo, déjalo vacío.</p>';
        const hoy = L.hoyISO();
        for (const t of L.tarjetas(estado)) {
          const e = L.estadoTarjeta(estado, t, hoy);
          h += '<div class="caja bv-tarjeta"><div class="encabezado"><b class="banco-chico"><i class="punto c-' + esc(t.color) + '"></i>' + esc(t.nombre) + ' crédito</b>' +
            '<span class="meta">cerró el ' + L.fechaCorta(e.anterior.hasta) + '</span></div>' +
            campo('Por pagar de tu último estado de cuenta (hasta el ' + L.fechaCorta(e.anterior.pago) + ')', '<div class="dos">' +
              entrada('ini_' + t.id + '_PEN', d['ini_' + t.id + '_PEN'], 'inputmode="decimal" placeholder="S/ 0.00"') +
              entrada('ini_' + t.id + '_USD', d['ini_' + t.id + '_USD'], 'inputmode="decimal" placeholder="US$ 0.00"') + '</div>') +
            campo('Lo que ya gastaste desde el ' + L.fechaCorta(e.actual.desde), '<div class="dos">' +
              entrada('pre_' + t.id + '_PEN', d['pre_' + t.id + '_PEN'], 'inputmode="decimal" placeholder="S/ 0.00"') +
              entrada('pre_' + t.id + '_USD', d['pre_' + t.id + '_USD'], 'inputmode="decimal" placeholder="US$ 0.00"') + '</div>',
              'Lo que la app del banco llama consumos no facturados o del periodo actual.') + '</div>';
        }
        h += pie('Siguiente');
      } else if (paso === 3) {
        h += '<h2>Tus suscripciones</h2><p class="nota">Llena las que tienes y deja vacías las que no. El día del cobro te aviso para que lo confirmes.</p>';
        const opciones = L.tarjetas(estado).concat(L.debitos(estado));
        d.subs.forEach(function (x, i) {
          h += '<div class="caja bv-sub">' + entrada('sub_nombre_' + i, x.nombre, 'placeholder="Nombre" autocomplete="off" maxlength="30" class="sub-nombre"') +
            '<div class="tres">' + entrada('sub_monto_' + i, x.monto, 'inputmode="decimal" placeholder="Monto"') +
            '<select name="sub_mon_' + i + '"><option value="PEN"' + (x.mon === 'PEN' ? ' selected' : '') + '>S/</option><option value="USD"' + (x.mon === 'USD' ? ' selected' : '') + '>US$</option></select>' +
            entrada('sub_dia_' + i, x.dia, 'inputmode="numeric" maxlength="2" placeholder="Día"') + '</div>' +
            '<select name="sub_cuenta_' + i + '">' + opciones.map(function (c) { return '<option value="' + esc(c.id) + '"' + (x.cuenta === c.id ? ' selected' : '') + '>Se cobra en ' + esc(L.nombreCuenta(c)) + '</option>'; }).join('') + '</select></div>';
        });
        h += '<button type="button" class="btn mini" data-accion="bv-sub">' + ICO.mas + 'Otra suscripción</button>' + pie('Siguiente');
      } else if (paso === 4) {
        h += '<h2>Tus topes</h2><p class="nota">¿Cuánto quieres gastar como máximo al mes en cada cosa? Empieza por las que se te escapan. Puedes cambiarlos cuando quieras en Stats.</p><div class="topes-bv">';
        const orden = estado.categorias.slice().sort(function (a, b) { return (b.id === 'c-ropa' || b.id === 'c-salidas') - (a.id === 'c-ropa' || a.id === 'c-salidas'); });
        for (const c of orden) h += '<label class="tope-bv">' + burbuja(c) + '<b>' + esc(c.nombre) + '</b>' + entrada('tope_' + c.id, d['tope_' + c.id], 'inputmode="decimal" placeholder="S/ 0"') + '</label>';
        h += '</div>' + pie('Siguiente');
      } else {
        h += '<div class="bv-hola">' + chanchito(130) + '<h2>¡Listo, ' + esc(estado.nombre) + '!</h2><p class="mano grande">oink oink</p>' +
          '<p>Cada vez que gastes, toca el <b>+</b> rosado. Si es de tu mamá, elige “¿De quién es?” → Mamá: suma a la tarjeta pero no a lo tuyo.</p></div>' +
          '<div class="caja c-amarillo recordatorio"><p><b>Para que te avise cada noche:</b> en la app Recordatorios crea “Anotar en Oink”, ponle hora (9:00 p. m.) y en Repetir elige Cada día.</p></div>' + pie('Ir a Oink');
      }
      return h + '</form>';
    },

    tope: function () {
      const c = L.catDe(estado, hoja.id);
      return '<form data-envio="tope">' + cabezaHoja('Tope para ' + esc(c.nombre)) +
        '<p class="nota">¿Cuánto quieres gastar como máximo al mes en ' + esc(c.nombre.toLowerCase()) + '? En soles.</p>' + montoGrande(hoja.d, 'monto', false) +
        pieHoja(estado.topes[c.id] ? 'quitar-tope' : null) + '</form>';
    },

    cat: function () {
      const d = hoja.d;
      return '<form data-envio="cat">' + cabezaHoja(hoja.id ? 'Categoría' : 'Nueva categoría') +
        campo('Nombre', entrada('nombre', d.nombre, 'autocomplete="off" maxlength="30"')) +
        campo('Color', chips('color', L.COLORES.map(function (c) { return [c, '', 'color-chip c-' + c]; }), d.color, false, 'colores')) +
        campo('Dibujito', chips('ico', [['', 'Ninguno']].concat(['comida', 'transporte', 'ropa', 'salidas', 'regalos', 'suscripciones', 'otros', 'sueldo', 'casa', 'personas', 'alcancia']
          .map(function (i) { return [i, ICO[i]]; })), d.ico, false, 'iconos')) +
        pieHoja(hoja.id ? 'borrar-cat' : null) + '</form>';
    },

    cuenta: function () {
      const d = hoja.d;
      const usada = hoja.id && L.usosCuenta(estado, hoja.id);
      return '<form data-envio="cuenta">' + cabezaHoja(hoja.id ? 'Cuenta' : 'Nueva cuenta') +
        campo('Nombre', entrada('nombre', d.nombre, 'autocomplete="off" maxlength="30" placeholder="Interbank, ahorros…"')) +
        (usada ? '<input type="hidden" name="mon" value="' + esc(d.mon) + '">' : campo('Moneda', seg('mon', [['PEN', 'Soles'], ['USD', 'Dólares']], d.mon))) +
        campo('¿Cuánto tienes hoy en esta cuenta?', entrada('saldo', d.saldo, 'inputmode="decimal" placeholder="0.00"'), 'Míralo en la app del banco. Lo que anotes después se suma o resta solo.') +
        pieHoja(hoja.id && !usada && hoja.id !== 'k-efectivo' ? 'borrar-cuenta' : null) + '</form>';
    },

    tarjeta: function () {
      const d = hoja.d;
      const t = hoja.id ? L.cuentaDe(estado, hoja.id) : null;
      let h = '<form data-envio="tarjeta">' + cabezaHoja(t ? esc(t.nombre) + ' crédito' : 'Nueva tarjeta') +
        campo('Nombre', entrada('nombre', d.nombre, 'autocomplete="off" maxlength="30" placeholder="BBVA, Interbank…"')) +
        campo('Color', chips('color', L.COLORES.map(function (c) { return [c, '', 'color-chip c-' + c]; }), d.color, false, 'colores')) +
        '<div class="dos">' + campo('Día de cierre', entrada('cierreDia', d.cierreDia, 'inputmode="numeric" maxlength="2"')) +
        campo('Día de pago', entrada('pagoDia', d.pagoDia, 'inputmode="numeric" maxlength="2"')) + '</div>' +
        '<p class="nota">El pago es del mes siguiente al cierre. Si un mes el banco cambia las fechas, anótalas abajo y esas mandan.</p>';
      h += '<div class="campo"><span class="etq">Fechas que da el banco</span><div class="fechas">';
      d.fechas.forEach(function (f, i) {
        h += '<div class="fecha-fila"><label>Cierre<input type="date" name="cierre_' + i + '" value="' + esc(f.cierre) + '"></label>' +
          '<label>Pago<input type="date" name="pago_' + i + '" value="' + esc(f.pago) + '"></label>' +
          '<button type="button" class="redondo chico" data-accion="quitar-fecha" data-i="' + i + '" aria-label="Quitar">' + ICO.cerrar + '</button></div>';
      });
      h += '</div><button type="button" class="btn mini" data-accion="agregar-fecha">' + ICO.mas + 'Agregar fecha</button></div>';
      h += campo('Lo que ya debías al empezar a usar Oink', '<div class="dos">' + entrada('inicialPEN', d.inicialPEN, 'inputmode="decimal" placeholder="S/ 0.00"') +
        entrada('inicialUSD', d.inicialUSD, 'inputmode="decimal" placeholder="US$ 0.00"') + '</div>', 'Cuenta como parte del estado de cuenta que estás por pagar.');
      if (t && t.previo) {
        h += campo('Lo que llevabas en el ciclo al empezar (' + L.fechaCorta(t.previo.fecha) + ')', '<div class="dos">' + entrada('previoPEN', d.previoPEN, 'inputmode="decimal" placeholder="S/ 0.00"') +
          entrada('previoUSD', d.previoUSD, 'inputmode="decimal" placeholder="US$ 0.00"') + '</div>');
      }
      return h + pieHoja(t && !L.usosCuenta(estado, t.id) ? 'borrar-cuenta' : null) + '</form>';
    },

    sub: function () {
      const d = hoja.d;
      return '<form data-envio="sub">' + cabezaHoja(hoja.id ? esc(d.nombre) : 'Nueva suscripción') +
        campo('Nombre', entrada('nombre', d.nombre, 'autocomplete="off" maxlength="30" placeholder="Netflix, Apple, Spotify…"')) +
        montoGrande(d, 'monto', true) +
        campo('Día del cobro', entrada('dia', d.dia, 'inputmode="numeric" maxlength="2" placeholder="1 a 31"')) +
        campo('Se cobra en', chips('con', opcionesPago().filter(function (o) { return o[0].indexOf('c:') === 0; }), d.con)) +
        (hoja.id ? campo('Estado', seg('pausada', [['no', 'Activa'], ['si', 'En pausa']], d.pausada)) : '') +
        pieHoja(hoja.id ? 'borrar-sub' : null) + '</form>';
    },

    aporte: function () {
      const d = hoja.d;
      return '<form data-envio="aporte">' + cabezaHoja(hoja.id ? 'Editar' : d.signo === '1' ? 'Apartar' : 'Sacar de la alcancía') +
        seg('signo', [['1', 'Apartar'], ['-1', 'Sacar']], d.signo) + montoGrande(d, 'monto', true) +
        '<div class="dos">' + campo('Fecha', entrada('fecha', d.fecha, 'type="date"')) + campo('Nota <i>opcional</i>', entrada('nota', d.nota, 'autocomplete="off"')) + '</div>' +
        pieHoja(hoja.id ? 'borrar-aporte' : null) + '</form>';
    },

    persona: function () {
      const f = persona(hoja.id);
      if (!f) return cabezaHoja('Persona');
      let h = cabezaHoja(esc(f.nombre)) + '<div class="saldo-persona">' + (f.pendiente ? saldoPersona(f) : '<span class="der neutro">Están al día</span>') + '</div>' +
        '<div class="botones centrados">' + (f.saldo.PEN > 0 || f.saldo.USD > 0 ? '<button class="btn oscuro" data-accion="saldar" data-id="' + esc(f.clave) + '">Me pagó</button>' : '') +
        '<button class="btn" data-accion="nuevo-apunte" data-persona="' + esc(f.nombre) + '">Anotar algo</button></div>';
      if (f.apuntes.length) {
        h += '<div class="lista">';
        for (const a of f.apuntes) {
          const tipo = L.tipoApunte(a);
          h += '<button class="fila" data-accion="editar-apunte" data-id="' + esc(a.id) + '"><span class="izq"><b>' + L.ROTULO_APUNTE[tipo] + '</b><span class="meta">' +
            L.etiquetaDia(a.fecha) + (a.nota ? ' · ' + esc(a.nota) : '') + (a.mov ? ' · de un gasto' : '') + '</span></span><span class="der ' + (a.monto > 0 ? 'ingreso' : 'rojo') + '">' +
            L.fmt(Math.abs(a.monto), a.mon) + '</span></button>';
        }
        h += '</div>';
      } else {
        h += '<p class="nota centrado">Todavía no hay nada con ' + esc(f.nombre) + '. Al anotar un gasto, elige “¿De quién es?” → ' + esc(f.nombre) + '.</p>';
      }
      return h + '<div class="pie-hoja"><button class="btn texto" data-accion="editar-persona">Cambiar nombre</button><button class="btn texto rojo" data-accion="borrar-persona">Eliminar</button></div>';
    },

    'persona-nombre': function () {
      return '<form data-envio="persona-nombre">' + cabezaHoja(hoja.clave ? 'Cambiar nombre' : 'Nueva persona') +
        campo('Nombre', entrada('nombre', hoja.d.nombre, 'autocomplete="off" maxlength="30"')) + pieHoja(null) + '</form>';
    },

    apunte: function () {
      const d = hoja.d;
      const pago = d.tipo === 'mepago' || d.tipo === 'lepague';
      let h = '<form data-envio="apunte">' + cabezaHoja(esc(d.persona));
      if (hoja.mov) h += '<p class="nota">Viene de un gasto. Para cambiarlo, edita el gasto.</p><div class="pie-hoja"><button type="button" class="btn oscuro ancho" data-accion="editar-mov" data-id="' + esc(hoja.mov) + '">Ver el gasto</button></div></form>';
      else {
        h += chips('tipo', [['medebe', 'Me debe'], ['ledebo', 'Le debo'], ['mepago', 'Me pagó'], ['lepague', 'Le pagué']], d.tipo, true) + montoGrande(d, 'monto', true);
        if (pago) h += campo(d.tipo === 'mepago' ? '¿Entró a alguna cuenta?' : '¿Salió de alguna cuenta?', chips('cuenta', [['', 'No, en mano']].concat(L.debitos(estado).filter(function (c) { return c.mon === d.mon; }).map(function (c) { return [c.id, esc(L.nombreCuenta(c))]; })), d.cuenta));
        h += '<div class="dos">' + campo('Fecha', entrada('fecha', d.fecha, 'type="date"')) + campo('Nota <i>opcional</i>', entrada('nota', d.nota, 'autocomplete="off"')) + '</div>' +
          pieHoja(hoja.id ? 'borrar-apunte' : null) + '</form>';
      }
      return h;
    },

    cambio: function () {
      return '<form data-envio="cambio">' + cabezaHoja('Tipo de cambio') + '<p class="nota">Cuántos soles vale un dólar. Solo se usa para lo nuevo; lo que ya anotaste se queda con su cambio.</p>' +
        '<div class="monto-grande"><input name="tc" inputmode="decimal" value="' + esc(hoja.d.tc) + '"></div>' + pieHoja(null) + '</form>';
    },
    nombre: function () {
      return '<form data-envio="nombre">' + cabezaHoja('Tu nombre') + campo('Nombre', entrada('nombre', hoja.d.nombre, 'autocomplete="off" maxlength="40"')) + pieHoja(null) + '</form>';
    },
    medios: function () {
      let h = '<form data-envio="medios">' + cabezaHoja('Yape y Plin');
      for (const m of estado.medios) h += campo(esc(m.nombre) + ' sale de', chips('m_' + m.id, opcionesDebito(true), hoja.d['m_' + m.id]));
      return h + pieHoja(null) + '</form>';
    }
  };

  function estimado(texto, de, a) {
    const c = L.parseMonto(texto);
    return c ? '≈ ' + L.aTexto(L.convertir(c, de, a, hoja.tc || estado.tc)) : '0.00';
  }
  function persona(clave) { return L.personas(estado).filter(function (f) { return f.clave === clave; })[0]; }

  function abrir(h, enfocar) {
    hoja = h;
    pintarHoja();
    $('#hoja .panel').scrollTop = 0;
    if (enfocar) { const i = $('#hoja input[name="' + enfocar + '"]'); if (i) i.focus(); }
  }
  function cerrar() {
    if (hoja && hoja.tipo === 'bienvenida' && !estado.bienvenida) { estado.bienvenida = true; guardar(); pintar(); }
    hoja = null;
    pintarHoja();
  }
  function leerBorrador() {
    const f = $('#hoja form');
    if (!f || !hoja.d) return;
    new FormData(f).forEach(function (v, k) { hoja.d[k] = v; });
    if (hoja.tipo === 'bienvenida' && hoja.paso === 3) {
      hoja.d.subs = hoja.d.subs.map(function (x, i) {
        return { nombre: hoja.d['sub_nombre_' + i] || '', monto: hoja.d['sub_monto_' + i] || '', mon: hoja.d['sub_mon_' + i] || 'PEN',
          dia: hoja.d['sub_dia_' + i] || '', cuenta: hoja.d['sub_cuenta_' + i] || x.cuenta };
      });
    }
    if (hoja.tipo === 'tarjeta') {
      hoja.d.fechas = hoja.d.fechas.map(function (x, i) { return { cierre: hoja.d['cierre_' + i] || '', pago: hoja.d['pago_' + i] || '' }; });
    }
  }
  function fallo(texto) { leerBorrador(); hoja.error = texto; pintarHoja(); }

  function pintarHoja() {
    const el = $('#hoja');
    document.body.classList.toggle('con-hoja', !!hoja);
    el.hidden = !hoja;
    el.innerHTML = hoja ? '<div class="panel ' + hoja.tipo + '">' + HOJAS[hoja.tipo]() + '</div>' : '';
  }

  // ---------- pintar ----------

  function pintar() {
    const v = vistaActual();
    pintarCabecera(v);
    pintarBarra(v);
    $('#vista').innerHTML = { inicio: vInicio, movs: vMovs, tarjetas: vTarjetas, stats: vStats, alcancia: vAlcancia,
      personas: vPersonas, subs: vSubs, ajustes: vAjustes }[v]();
  }

  let relojAviso = 0;
  function aviso(texto, esFallo) {
    const el = $('#aviso');
    el.textContent = texto;
    el.className = esFallo ? 'fallo' : '';
    el.hidden = false;
    clearTimeout(relojAviso);
    relojAviso = setTimeout(function () { el.hidden = true; }, esFallo ? 9000 : 2200);
  }

  // ---------- archivos ----------

  async function entregar(nombre, texto, tipo) {
    const archivo = new File([texto], nombre, { type: tipo });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo] }); return true; }
      catch (e) { if (e && e.name === 'AbortError') return false; /* si falla, se descarga */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(archivo);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    return true;
  }

  function restaurar(archivo) {
    const lector = new FileReader();
    lector.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    lector.onload = function () {
      let r;
      try { r = L.validar(JSON.parse(lector.result)); }
      catch (e) { r = { ok: false, error: 'Ese archivo no es un respaldo de Oink.' }; }
      if (!r.ok) return aviso(r.error, true);
      if (!confirm('El respaldo trae ' + r.estado.movs.length + ' movimientos.\n\nReemplaza todo lo que hay ahora en la app (' + estado.movs.length + ' movimientos). ¿Continuar?')) return;
      estado = r.estado;
      guardar(); pintar(); aviso('Respaldo restaurado');
    };
    lector.readAsText(archivo);
  }

  // ---------- acciones ----------

  function ultimoGasto() {
    let u = null;
    for (const m of estado.movs) if (m.tipo === 'gasto' && (!u || (m.creado || 0) > (u.creado || 0))) u = m;
    return u;
  }
  function borradorMov(tipo) {
    const hoy = L.hoyISO();
    const u = ultimoGasto();
    const deb = L.debitos(estado);
    return { tipo: tipo, monto: '', mon: 'PEN', cat: tipo === 'ingreso' ? estado.catIngreso[0].id : '',
      con: u ? (u.medio ? 'm:' + u.medio : 'c:' + u.cuenta) : 'm:' + (estado.medios[0] ? estado.medios[0].id : ''),
      cobrado: '', de: '', nueva: '', cuanto: 'todo', parte: '', lugar: '', nota: '',
      fecha: L.mesDe(hoy) === mes ? hoy : mes + '-01',
      cuenta: deb[0].id, destino: deb[1] ? deb[1].id : deb[0].id, tarjeta: (L.tarjetas(estado)[0] || {}).id || '', sale: '', llega: '' };
  }
  // Lo que ya hay, para que repetir la bienvenida no borre nada.
  function borradorBienvenida() {
    const d = { nombre: estado.nombre, subs: [] };
    const sal = L.saldos(estado).cuentas;
    for (const c of L.debitos(estado)) {
      const x = sal.filter(function (f) { return f.id === c.id; })[0];
      d['saldo_' + c.id] = x.saldo ? L.aTexto(x.saldo) : '';
    }
    for (const t of L.tarjetas(estado)) {
      for (const mon of L.MONEDAS) {
        d['ini_' + t.id + '_' + mon] = t.inicial[mon] ? L.aTexto(t.inicial[mon]) : '';
        d['pre_' + t.id + '_' + mon] = t.previo && t.previo[mon] ? L.aTexto(t.previo[mon]) : '';
      }
    }
    const tarjeta = (L.tarjetas(estado)[0] || estado.cuentas[0]).id;
    for (const s of estado.subs) d.subs.push({ nombre: s.nombre, monto: L.aTexto(s.monto), mon: s.mon, dia: String(s.dia), cuenta: s.cuenta });
    for (const n of ['Netflix', 'Apple', 'Spotify']) {
      if (!d.subs.some(function (x) { return x.nombre.toLowerCase() === n.toLowerCase(); })) d.subs.push({ nombre: n, monto: '', mon: 'PEN', dia: '', cuenta: tarjeta });
    }
    for (const c of estado.categorias) d['tope_' + c.id] = estado.topes[c.id] ? L.aTexto(estado.topes[c.id]) : '';
    return d;
  }
  function nuevaFecha(t) {
    // propone el mes que sigue a la última fecha anotada
    const ult = t.fechas.length ? t.fechas[t.fechas.length - 1].cierre : L.hoyISO();
    const mesSig = L.moverMes(L.mesDe(ult), 1);
    return { cierre: L.diaDeMes(mesSig, Number(t.cierreDia) || 20), pago: L.diaDeMes(L.moverMes(mesSig, 1), Number(t.pagoDia) || 15) };
  }

  const acciones = {
    mes: function (d) { mes = L.moverMes(mes, Number(d.d)); pintar(); window.scrollTo(0, 0); },
    filtro: function (d) { filtro = d.f; pintar(); },
    ir: function (d) { location.hash = d.v; },
    cerrar: cerrar,
    'ver-cuenta': function (d) { filtro = d.id; mes = L.mesDe(L.hoyISO()); location.hash = 'movs'; },

    'nuevo-mov': function () { abrir({ tipo: 'mov', id: null, tc: estado.tc, d: borradorMov('gasto') }, 'monto'); },
    sueldo: function () {
      const d = borradorMov('ingreso'), u = L.ultimoSueldo(estado);
      d.cat = 'i-sueldo';
      d.fecha = L.hoyISO();
      if (u) { d.monto = L.aTexto(u.monto); d.mon = u.mon; d.cuenta = u.cuenta; }
      abrir({ tipo: 'mov', id: null, tc: estado.tc, d: d }, 'monto');
    },
    pagar: function (dd) {
      const t = L.cuentaDe(estado, dd.id), e = L.estadoTarjeta(estado, t, L.hoyISO());
      const d = borradorMov('pago');
      d.tarjeta = t.id;
      d.fecha = L.hoyISO();
      d.mon = e.falta.PEN || !e.falta.USD ? 'PEN' : 'USD';
      if (e.falta[d.mon]) d.monto = L.aTexto(e.falta[d.mon]);
      abrir({ tipo: 'mov', id: null, tc: estado.tc, d: d }, 'monto');
    },
    'usar-monto': function (d) { leerBorrador(); hoja.d.monto = d.v; pintarHoja(); },
    'editar-mov': function (dd) {
      const m = estado.movs.filter(function (x) { return x.id === dd.id; })[0];
      if (!m) return;
      const d = borradorMov(m.tipo);
      Object.assign(d, { monto: L.aTexto(m.monto), mon: m.mon, fecha: m.fecha, nota: m.nota || '', cuenta: m.cuenta });
      if (m.tipo === 'gasto' || m.tipo === 'ingreso' || m.tipo === 'devolucion') {
        d.cat = m.cat;
        d.con = m.medio ? 'm:' + m.medio : 'c:' + m.cuenta;
        d.cobrado = m.monCuenta && !m.estimado ? L.aTexto(m.cobrado) : '';
        d.lugar = m.lugar || '';
        if (m.ajeno) {
          d.de = m.ajeno.persona;
          if (estado.personas.every(function (p) { return L.claveDe(p) !== L.claveDe(m.ajeno.persona); })) estado.personas.push(m.ajeno.persona);
          d.cuanto = m.ajeno.monto === m.monto ? 'todo' : m.ajeno.monto * 2 === m.monto ? 'mitad' : 'otro';
          d.parte = L.aTexto(m.ajeno.monto);
        }
      } else if (m.tipo === 'pago') {
        d.tarjeta = m.tarjeta;
        d.sale = m.sale !== m.monto && !m.estimado ? L.aTexto(m.sale) : '';
      } else {
        d.destino = m.destino;
        d.llega = m.llega !== m.monto ? L.aTexto(m.llega) : '';
      }
      abrir({ tipo: 'mov', id: m.id, tc: m.tc || estado.tc, sub: m.sub || null, d: d });
    },
    devolver: function () {
      // una devolución con lo mismo del gasto: categoría, tarjeta, lugar y de quién era
      leerBorrador();
      const d = Object.assign({}, hoja.d, { tipo: 'devolucion', fecha: L.hoyISO(), nota: hoja.d.nota });
      abrir({ tipo: 'mov', id: null, tc: estado.tc, d: d }, 'monto');
    },
    bienvenida: function () { abrir({ tipo: 'bienvenida', paso: 0, d: borradorBienvenida() }); },
    'bv-atras': function () { leerBorrador(); hoja.error = ''; hoja.paso--; pintarHoja(); $('#hoja .panel').scrollTop = 0; },
    'bv-saltar': function () {
      if (hoja.paso === 0) return cerrar();
      leerBorrador(); hoja.error = ''; hoja.paso++; pintarHoja(); $('#hoja .panel').scrollTop = 0;
    },
    'bv-sub': function () {
      leerBorrador();
      hoja.d.subs.push({ nombre: '', monto: '', mon: 'PEN', dia: '', cuenta: (L.tarjetas(estado)[0] || estado.cuentas[0]).id });
      pintarHoja();
    },
    'borrar-mov': function () {
      const m = estado.movs.filter(function (x) { return x.id === hoja.id; })[0];
      if (!confirm(m && m.ajeno ? '¿Eliminar este gasto? También se quita lo que ' + m.ajeno.persona + ' te debía por él.' : '¿Eliminar este movimiento?')) return;
      estado.movs = estado.movs.filter(function (x) { return x.id !== hoja.id; });
      estado.apuntes = estado.apuntes.filter(function (x) { return x.mov !== hoja.id; });
      guardar(); cerrar(); pintar(); aviso('Eliminado');
    },

    'sub-ok': function (d) {
      const p = L.subsPendientes(estado, L.hoyISO()).filter(function (x) { return x.sub.id === d.id; })[0];
      if (!p) return;
      const s = p.sub, hoy = L.hoyISO();
      const cat = L.catDe(estado, 'c-suscripciones') ? 'c-suscripciones' : estado.categorias[estado.categorias.length - 1].id;
      const m = { id: L.uid(), tipo: 'gasto', monto: s.monto, mon: s.mon, tc: estado.tc, cuenta: s.cuenta, cat: cat, nota: s.nombre,
        fecha: p.fecha <= hoy ? p.fecha : hoy, creado: Date.now(), sub: s.id };
      const cta = L.cuentaDe(estado, s.cuenta);
      if (!L.esCredito(cta) && cta.mon !== s.mon) { m.monCuenta = cta.mon; m.cobrado = L.convertir(s.monto, s.mon, cta.mon, estado.tc); m.estimado = true; }
      estado.movs.push(m);
      guardar(); pintar(); aviso(s.nombre + ' anotado');
    },
    'sub-otro': function (dd) {
      const s = estado.subs.filter(function (x) { return x.id === dd.id; })[0];
      const p = L.subsPendientes(estado, L.hoyISO()).filter(function (x) { return x.sub.id === dd.id; })[0];
      const d = borradorMov('gasto');
      Object.assign(d, { mon: s.mon, con: 'c:' + s.cuenta, nota: s.nombre, fecha: p && p.fecha <= L.hoyISO() ? p.fecha : L.hoyISO(),
        cat: L.catDe(estado, 'c-suscripciones') ? 'c-suscripciones' : d.cat });
      abrir({ tipo: 'mov', id: null, tc: estado.tc, sub: s.id, d: d }, 'monto');
    },
    'sub-saltar': function (d) {
      estado.saltadas.push(d.id + '@' + L.mesDe(L.hoyISO()));
      guardar(); pintar();
    },
    sub: function (dd) {
      const s = dd.id ? estado.subs.filter(function (x) { return x.id === dd.id; })[0] : null;
      const t = L.tarjetas(estado)[0] || estado.cuentas[0];
      abrir({ tipo: 'sub', id: s ? s.id : null, d: s ? { nombre: s.nombre, monto: L.aTexto(s.monto), mon: s.mon, dia: String(s.dia), con: 'c:' + s.cuenta, pausada: s.pausada ? 'si' : 'no' } :
        { nombre: '', monto: '', mon: 'PEN', dia: '', con: 'c:' + t.id, pausada: 'no' } }, s ? null : 'nombre');
    },
    'borrar-sub': function () {
      if (!confirm('¿Eliminar esta suscripción? Lo que ya anotaste de ella se queda.')) return;
      estado.subs = estado.subs.filter(function (x) { return x.id !== hoja.id; });
      guardar(); cerrar(); pintar();
    },

    tope: function (d) {
      const t = estado.topes[d.id];
      abrir({ tipo: 'tope', id: d.id, d: { monto: t ? L.aTexto(t) : '' } }, 'monto');
    },
    'quitar-tope': function () { delete estado.topes[hoja.id]; guardar(); cerrar(); pintar(); },

    cat: function (d) {
      const c = d.id ? L.catDe(estado, d.id) : null;
      const usados = estado.categorias.map(function (x) { return x.color; });
      abrir({ tipo: 'cat', id: c ? c.id : null, d: c ? { nombre: c.nombre, color: c.color, ico: c.ico || '' } :
        { nombre: '', color: L.COLORES.filter(function (x) { return usados.indexOf(x) < 0; })[0] || 'arena', ico: '' } }, c ? null : 'nombre');
    },
    'borrar-cat': function () {
      const n = estado.movs.filter(function (m) { return m.tipo === 'gasto' && m.cat === hoja.id; }).length;
      if (n) return fallo('Tiene ' + n + (n === 1 ? ' gasto anotado' : ' gastos anotados') + '. Cámbiale el nombre en vez de eliminarla.');
      if (estado.categorias.length <= 1) return fallo('Tiene que quedar al menos una categoría.');
      estado.categorias = estado.categorias.filter(function (c) { return c.id !== hoja.id; });
      delete estado.topes[hoja.id];
      guardar(); cerrar(); pintar();
    },

    cuenta: function (d) {
      const c = d.id ? L.cuentaDe(estado, d.id) : null;
      const s = c ? L.saldos(estado).cuentas.filter(function (x) { return x.id === c.id; })[0].saldo : 0;
      abrir({ tipo: 'cuenta', id: c ? c.id : null, d: { nombre: c ? c.nombre : '', mon: c ? c.mon : 'PEN', saldo: c ? L.aTexto(s) : '' } }, c ? 'saldo' : 'nombre');
    },
    tarjeta: function (d) {
      const t = d.id ? L.cuentaDe(estado, d.id) : null;
      abrir({ tipo: 'tarjeta', id: t ? t.id : null, d: t ? {
        nombre: t.nombre, color: t.color, cierreDia: String(t.cierreDia), pagoDia: String(t.pagoDia),
        fechas: t.fechas.slice().sort(function (a, b) { return a.cierre < b.cierre ? -1 : 1; }).filter(function (f) { return f.pago >= L.sumarDias(L.hoyISO(), -45); }),
        viejas: t.fechas.filter(function (f) { return f.pago < L.sumarDias(L.hoyISO(), -45); }),
        inicialPEN: t.inicial.PEN ? L.aTexto(t.inicial.PEN) : '', inicialUSD: t.inicial.USD ? L.aTexto(t.inicial.USD) : '',
        previoPEN: t.previo && t.previo.PEN ? L.aTexto(t.previo.PEN) : '', previoUSD: t.previo && t.previo.USD ? L.aTexto(t.previo.USD) : '' } :
        { nombre: '', color: 'lila', cierreDia: '20', pagoDia: '15', fechas: [], viejas: [], inicialPEN: '', inicialUSD: '' } }, t ? null : 'nombre');
    },
    'agregar-fecha': function () {
      leerBorrador();
      hoja.d.fechas.push(nuevaFecha({ fechas: hoja.d.fechas.filter(function (f) { return f.cierre; }), cierreDia: hoja.d.cierreDia, pagoDia: hoja.d.pagoDia }));
      pintarHoja();
    },
    'quitar-fecha': function (d) { leerBorrador(); hoja.d.fechas.splice(Number(d.i), 1); pintarHoja(); },
    'borrar-cuenta': function () {
      if (!confirm('¿Eliminar esta cuenta?')) return;
      estado.cuentas = estado.cuentas.filter(function (c) { return c.id !== hoja.id; });
      if (filtro === hoja.id) filtro = '';
      guardar(); cerrar(); pintar();
    },

    aporte: function (d) {
      abrir({ tipo: 'aporte', id: null, d: { signo: d.signo, monto: '', mon: 'PEN', fecha: L.hoyISO(), nota: '' } }, 'monto');
    },
    'editar-aporte': function (d) {
      const a = estado.alcancia.filter(function (x) { return x.id === d.id; })[0];
      abrir({ tipo: 'aporte', id: a.id, d: { signo: a.monto > 0 ? '1' : '-1', monto: L.aTexto(a.monto), mon: a.mon, fecha: a.fecha, nota: a.nota || '' } });
    },
    'borrar-aporte': function () {
      if (!confirm('¿Borrar este movimiento de la alcancía?')) return;
      estado.alcancia = estado.alcancia.filter(function (x) { return x.id !== hoja.id; });
      guardar(); cerrar(); pintar();
    },

    persona: function (d) { abrir({ tipo: 'persona', id: d.id }); },
    'nueva-persona': function () { abrir({ tipo: 'persona-nombre', clave: null, d: { nombre: '' } }, 'nombre'); },
    'editar-persona': function () { abrir({ tipo: 'persona-nombre', clave: hoja.id, d: { nombre: persona(hoja.id).nombre } }, 'nombre'); },
    'borrar-persona': function () {
      const f = persona(hoja.id);
      const gastos = estado.movs.filter(function (m) { return m.ajeno && L.claveDe(m.ajeno.persona) === f.clave; });
      if (!confirm('Se borra a ' + f.nombre + ' con sus ' + f.apuntes.length + ' apuntes.' +
        (gastos.length ? '\n\n' + gastos.length + (gastos.length === 1 ? ' gasto que era suyo pasa' : ' gastos que eran suyos pasan') + ' a contar como tuyos.' : '') +
        '\n\nNo se puede deshacer. ¿Borrar?')) return;
      for (const m of gastos) delete m.ajeno;
      estado.apuntes = estado.apuntes.filter(function (a) { return L.claveDe(a.persona) !== f.clave; });
      estado.personas = estado.personas.filter(function (p) { return L.claveDe(p) !== f.clave; });
      guardar(); cerrar(); pintar(); aviso('Persona eliminada');
    },
    'nuevo-apunte': function (d) {
      abrir({ tipo: 'apunte', id: null, d: { persona: d.persona, tipo: 'medebe', monto: '', mon: 'PEN', cuenta: '', fecha: L.hoyISO(), nota: '' } }, 'monto');
    },
    saldar: function (d) {
      const f = persona(d.id);
      const mon = f.saldo.PEN > 0 ? 'PEN' : 'USD';
      abrir({ tipo: 'apunte', id: null, d: { persona: f.nombre, tipo: 'mepago', monto: L.aTexto(f.saldo[mon]), mon: mon,
        cuenta: (estado.medios[0] && L.cuentaDe(estado, estado.medios[0].cuenta).mon === mon) ? estado.medios[0].cuenta : '', fecha: L.hoyISO(), nota: '' } }, 'monto');
    },
    'editar-apunte': function (d) {
      const a = estado.apuntes.filter(function (x) { return x.id === d.id; })[0];
      abrir({ tipo: 'apunte', id: a.id, mov: a.mov || null, d: { persona: a.persona, tipo: L.tipoApunte(a), monto: L.aTexto(a.monto), mon: a.mon, cuenta: a.cuenta || '', fecha: a.fecha, nota: a.nota || '' } });
    },
    'borrar-apunte': function () {
      if (!confirm('¿Eliminar este apunte?')) return;
      const a = estado.apuntes.filter(function (x) { return x.id === hoja.id; })[0];
      estado.apuntes = estado.apuntes.filter(function (x) { return x.id !== hoja.id; });
      guardar(); pintar(); abrir({ tipo: 'persona', id: L.claveDe(a.persona) });
    },

    nombre: function () { abrir({ tipo: 'nombre', d: { nombre: estado.nombre } }, 'nombre'); },
    cambio: function () { abrir({ tipo: 'cambio', d: { tc: String(estado.tc) } }, 'tc'); },
    medios: function () {
      const d = {};
      for (const m of estado.medios) d['m_' + m.id] = m.cuenta;
      abrir({ tipo: 'medios', d: d });
    },

    respaldo: async function () {
      const ok = await entregar('oink-respaldo-' + L.hoyISO() + '.json', JSON.stringify(estado, null, 1), 'application/json');
      if (!ok) return;
      estado.ultimoRespaldo = new Date().toISOString();
      guardar(); pintar();
    },
    excel: function () { entregar('oink-' + L.hoyISO() + '.csv', L.aCSV(estado), 'text/csv'); },
    restaurar: function () { const i = $('#archivo'); i.value = ''; i.click(); },
    'borrar-todo': function () {
      if (!confirm('Se borra todo lo que anotaste en este celular. No se puede deshacer.\n\n¿Borrar todo?')) return;
      estado = L.estadoInicial();
      guardar(); pintar(); aviso('Datos borrados');
    }
  };

  // ---------- envíos de formularios ----------

  const envios = {
    mov: function (fd) {
      const tipo = fd.get('tipo'), fecha = fd.get('fecha'), nota = String(fd.get('nota') || '').trim();
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      if (!fecha) return fallo('Falta la fecha.');
      const viejo = hoja.id ? estado.movs.filter(function (x) { return x.id === hoja.id; })[0] : null;
      const m = { tipo: tipo, monto: monto, mon: fd.get('mon') || 'PEN', tc: hoja.tc, nota: nota, fecha: fecha };

      if (tipo === 'gasto' || tipo === 'ingreso' || tipo === 'devolucion') {
        if (!fd.get('cat')) return fallo('Elige una categoría.');
        m.cat = fd.get('cat');
        let cta;
        if (tipo !== 'ingreso') {
          const con = String(fd.get('con') || '');
          cta = cuentaDeOpcion(con);
          if (!cta) return fallo(tipo === 'gasto' ? 'Elige con qué pagaste.' : 'Elige a dónde volvió la plata.');
          if (con.indexOf('m:') === 0) m.medio = con.slice(2);
          const lugar = String(fd.get('lugar') || '').trim();
          if (lugar) m.lugar = lugar.slice(0, 60);
          let de = String(fd.get('de') || '');
          if (de === '__nueva') {
            de = String(fd.get('nueva') || '').trim().slice(0, 30);
            if (!de) return fallo('Escribe el nombre de la persona.');
          }
          if (de) {
            const cuanto = fd.get('cuanto');
            const parte = cuanto === 'todo' ? monto : cuanto === 'mitad' ? Math.round(monto / 2) : L.parseMonto(fd.get('parte'));
            if (!parte) return fallo('Pon cuánto le toca a ' + de + '.');
            if (parte > monto) return fallo('Lo de ' + de + ' no puede ser más que el gasto.');
            const ya = estado.personas.filter(function (p) { return L.claveDe(p) === L.claveDe(de); })[0];
            if (ya) de = ya; else estado.personas.push(de);
            m.ajeno = { persona: de, monto: parte };
          }
          if (hoja.sub && tipo === 'gasto') m.sub = hoja.sub;
        } else {
          cta = L.cuentaDe(estado, fd.get('cuenta'));
          if (!cta) return fallo('Elige a qué cuenta llegó.');
        }
        m.cuenta = cta.id;
        if (!L.esCredito(cta) && cta.mon !== m.mon) {
          // otra moneda que la de la cuenta: vale lo que cobró el banco, o un estimado mientras no se sepa
          const cobrado = L.parseMonto(fd.get('cobrado'));
          m.monCuenta = cta.mon;
          if (cobrado) m.cobrado = cobrado;
          else { m.cobrado = L.convertir(monto, m.mon, cta.mon, m.tc); m.estimado = true; }
        }
      } else if (tipo === 'pago') {
        const t = L.cuentaDe(estado, fd.get('tarjeta')), cta = L.cuentaDe(estado, fd.get('cuenta'));
        if (!t) return fallo('Elige qué tarjeta pagaste.');
        if (!cta) return fallo('Elige desde qué cuenta pagaste.');
        m.tarjeta = t.id; m.cuenta = cta.id; m.cat = '';
        const sale = cta.mon === m.mon ? monto : L.parseMonto(fd.get('sale'));
        if (sale) m.sale = sale;
        else { m.sale = L.convertir(monto, m.mon, cta.mon, m.tc); m.estimado = true; }
      } else {
        const a = L.cuentaDe(estado, fd.get('cuenta')), b = L.cuentaDe(estado, fd.get('destino'));
        if (!a || !b || a.id === b.id) return fallo('Elige dos cuentas distintas.');
        m.cuenta = a.id; m.destino = b.id; m.mon = a.mon; m.cat = '';
        m.llega = a.mon === b.mon ? monto : (L.parseMonto(fd.get('llega')) || L.convertir(monto, a.mon, b.mon, m.tc));
      }

      if (viejo) {
        m.id = viejo.id; m.creado = viejo.creado;
        if (viejo.sub && !m.sub && tipo === 'gasto') m.sub = viejo.sub;
        estado.movs[estado.movs.indexOf(viejo)] = m;
      } else {
        m.id = L.uid(); m.creado = Date.now();
        estado.movs.push(m);
      }
      L.sincronizarAjeno(estado, m);
      mes = L.mesDe(fecha);
      guardar(); cerrar(); pintar(); aviso(tipo === 'gasto' ? 'Anotado ✿' : tipo === 'devolucion' ? 'Devolución anotada' : 'Guardado');
    },
    bienvenida: function (fd) {
      const paso = hoja.paso;
      leerBorrador();
      if (paso === 0) {
        const n = String(fd.get('nombre') || '').trim();
        if (n) estado.nombre = n.slice(0, 40);
      } else if (paso === 1) {
        const sal = L.saldos(estado).cuentas;
        for (const c of L.debitos(estado)) {
          const texto = String(fd.get('saldo_' + c.id) || '').trim();
          if (!texto) continue;
          const quiere = /^0+([.,]0*)?$/.test(texto) ? 0 : L.parseMonto(texto);
          if (quiere === null) return fallo('No entiendo el saldo de ' + L.nombreCuenta(c) + '. Escríbelo como 1250.50');
          c.inicial += quiere - sal.filter(function (x) { return x.id === c.id; })[0].saldo;
        }
      } else if (paso === 2) {
        for (const t of L.tarjetas(estado)) {
          const v = function (k) { return L.parseMonto(fd.get(k + '_' + t.id + '_PEN')) || 0; };
          const u = function (k) { return L.parseMonto(fd.get(k + '_' + t.id + '_USD')) || 0; };
          t.inicial = { PEN: v('ini'), USD: u('ini') };
          if (v('pre') || u('pre')) t.previo = { PEN: v('pre'), USD: u('pre'), fecha: L.hoyISO() };
          else delete t.previo;
        }
      } else if (paso === 3) {
        const nuevas = [];
        for (const x of hoja.d.subs) {
          if (!String(x.monto).trim() && !String(x.dia).trim()) continue;   // las de ejemplo que no tiene quedan vacías
          const monto = L.parseMonto(x.monto), dia = Number(x.dia);
          if (!x.nombre.trim()) return fallo('A una suscripción le falta el nombre.');
          if (!monto) return fallo('Pon cuánto se cobra ' + x.nombre.trim() + ', o deja vacío también su día.');
          if (!(dia >= 1 && dia <= 31) || Math.round(dia) !== dia) return fallo('El día del cobro de ' + x.nombre.trim() + ' va del 1 al 31.');
          nuevas.push({ nombre: x.nombre.trim().slice(0, 30), monto: monto, mon: x.mon, dia: dia, cuenta: x.cuenta });
        }
        for (const n of nuevas) {
          const ya = estado.subs.filter(function (s) { return s.nombre.toLowerCase() === n.nombre.toLowerCase(); })[0];
          if (ya) Object.assign(ya, n);
          else estado.subs.push(Object.assign({ id: L.uid(), desde: L.mesDe(L.hoyISO()), pausada: false }, n));
        }
      } else if (paso === 4) {
        for (const c of estado.categorias) {
          const t = L.parseMonto(fd.get('tope_' + c.id));
          if (t) estado.topes[c.id] = t; else delete estado.topes[c.id];
        }
      } else {
        estado.bienvenida = true;
        guardar(); hoja = null; pintarHoja(); pintar(); aviso('¡Oink! Todo listo');
        return;
      }
      guardar(); pintar();
      hoja.error = ''; hoja.paso++; pintarHoja(); $('#hoja .panel').scrollTop = 0;
    },
    tope: function (fd) {
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero, o quita el tope.');
      estado.topes[hoja.id] = monto;
      guardar(); cerrar(); pintar();
    },
    cat: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre.');
      if (estado.categorias.some(function (c) { return c.id !== hoja.id && c.nombre.toLowerCase() === nombre.toLowerCase(); })) return fallo('Ya hay una categoría con ese nombre.');
      const datos = { nombre: nombre.slice(0, 30), color: fd.get('color') || 'arena', ico: fd.get('ico') || '' };
      if (hoja.id) Object.assign(L.catDe(estado, hoja.id), datos);
      else estado.categorias.splice(Math.max(0, estado.categorias.length - 1), 0, Object.assign({ id: 'c-' + L.uid() }, datos));   // antes de "Otros"
      guardar(); cerrar(); pintar();
    },
    cuenta: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre a la cuenta.');
      const texto = String(fd.get('saldo') || '').trim();
      const quiere = /^0+([.,]0*)?$/.test(texto) || !texto ? 0 : L.parseMonto(texto);
      if (quiere === null) return fallo('Ese saldo no se entiende. Escríbelo como 1250.50');
      if (hoja.id) {
        const c = L.cuentaDe(estado, hoja.id);
        const ahora = L.saldos(estado).cuentas.filter(function (x) { return x.id === c.id; })[0].saldo;
        c.nombre = nombre;
        c.inicial += quiere - ahora;   // el saldo de hoy queda como dice el banco
        if (!L.usosCuenta(estado, c.id)) c.mon = fd.get('mon');
      } else {
        estado.cuentas.push({ id: 'k-' + L.uid(), nombre: nombre, tipo: 'debito', mon: fd.get('mon') || 'PEN', inicial: quiere });
      }
      guardar(); cerrar(); pintar();
    },
    tarjeta: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre a la tarjeta.');
      const cierre = Number(fd.get('cierreDia')), pago = Number(fd.get('pagoDia'));
      if (!(cierre >= 1 && cierre <= 31) || !(pago >= 1 && pago <= 31)) return fallo('Los días de cierre y pago van del 1 al 31.');
      leerBorrador();
      const fechas = [];
      for (const f of hoja.d.fechas) {
        if (!f.cierre && !f.pago) continue;
        if (!f.cierre || !f.pago || f.pago <= f.cierre) return fallo('Cada fecha de pago tiene que ser después de su cierre.');
        fechas.push(f);
      }
      const datos = { nombre: nombre.slice(0, 30), color: fd.get('color') || 'lila', cierreDia: cierre, pagoDia: pago,
        fechas: hoja.d.viejas.concat(fechas).sort(function (a, b) { return a.cierre < b.cierre ? -1 : 1; }),
        inicial: { PEN: L.parseMonto(fd.get('inicialPEN')) || 0, USD: L.parseMonto(fd.get('inicialUSD')) || 0 } };
      if (hoja.id) {
        const t = L.cuentaDe(estado, hoja.id);
        if (t.previo) {
          const pen = L.parseMonto(fd.get('previoPEN')) || 0, usd = L.parseMonto(fd.get('previoUSD')) || 0;
          if (pen || usd) t.previo = { PEN: pen, USD: usd, fecha: t.previo.fecha }; else delete t.previo;
        }
        Object.assign(t, datos);
      } else estado.cuentas.push(Object.assign({ id: 't-' + L.uid(), tipo: 'credito' }, datos));
      guardar(); cerrar(); pintar();
    },
    sub: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre.');
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon cuánto se cobra.');
      const dia = Number(fd.get('dia'));
      if (!(dia >= 1 && dia <= 31) || Math.round(dia) !== dia) return fallo('El día del cobro va del 1 al 31.');
      const cta = cuentaDeOpcion(String(fd.get('con') || ''));
      if (!cta) return fallo('Elige en qué tarjeta o cuenta se cobra.');
      const datos = { nombre: nombre.slice(0, 30), monto: monto, mon: fd.get('mon') || 'PEN', dia: dia, cuenta: cta.id, pausada: fd.get('pausada') === 'si' };
      if (hoja.id) Object.assign(estado.subs.filter(function (s) { return s.id === hoja.id; })[0], datos);
      else estado.subs.push(Object.assign({ id: L.uid(), desde: L.mesDe(L.hoyISO()) }, datos));
      guardar(); cerrar(); pintar();
    },
    aporte: function (fd) {
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      if (!fd.get('fecha')) return fallo('Falta la fecha.');
      const a = { monto: (fd.get('signo') === '-1' ? -1 : 1) * monto, mon: fd.get('mon') || 'PEN', fecha: fd.get('fecha'), nota: String(fd.get('nota') || '').trim() };
      if (hoja.id) Object.assign(estado.alcancia.filter(function (x) { return x.id === hoja.id; })[0], a);
      else estado.alcancia.push(Object.assign({ id: L.uid() }, a));
      guardar(); cerrar(); pintar(); aviso(a.monto > 0 ? '¡Oink! Apartado' : 'Anotado');
    },
    'persona-nombre': function (fd) {
      const nuevo = String(fd.get('nombre') || '').trim().slice(0, 30);
      if (!nuevo) return fallo('Ponle un nombre.');
      const otra = estado.personas.some(function (p) { return L.claveDe(p) === L.claveDe(nuevo) && L.claveDe(p) !== hoja.clave; });
      if (otra) return fallo('Ya tienes a alguien con ese nombre.');
      if (hoja.clave) {
        const clave = hoja.clave;
        estado.personas = estado.personas.map(function (p) { return L.claveDe(p) === clave ? nuevo : p; });
        if (!estado.personas.some(function (p) { return L.claveDe(p) === L.claveDe(nuevo); })) estado.personas.push(nuevo);
        for (const a of estado.apuntes) if (L.claveDe(a.persona) === clave) a.persona = nuevo;
        for (const m of estado.movs) if (m.ajeno && L.claveDe(m.ajeno.persona) === clave) m.ajeno.persona = nuevo;
        guardar(); pintar(); abrir({ tipo: 'persona', id: L.claveDe(nuevo) });
      } else {
        estado.personas.push(nuevo);
        guardar(); cerrar(); pintar();
      }
    },
    apunte: function (fd) {
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      if (!fd.get('fecha')) return fallo('Falta la fecha.');
      const tipo = fd.get('tipo');
      const signo = tipo === 'medebe' || tipo === 'lepague' ? 1 : -1;
      const a = { persona: hoja.d.persona, monto: signo * monto, mon: fd.get('mon') || 'PEN', nota: String(fd.get('nota') || '').trim(), fecha: fd.get('fecha'),
        pago: tipo === 'mepago' || tipo === 'lepague' };
      const cta = a.pago ? L.cuentaDe(estado, fd.get('cuenta')) : null;
      if (cta && cta.mon === a.mon) a.cuenta = cta.id;
      if (hoja.id) {
        const viejo = estado.apuntes.filter(function (x) { return x.id === hoja.id; })[0];
        a.id = viejo.id; a.creado = viejo.creado;
        estado.apuntes[estado.apuntes.indexOf(viejo)] = a;
      } else {
        a.id = L.uid(); a.creado = Date.now();
        estado.apuntes.push(a);
      }
      guardar(); pintar(); abrir({ tipo: 'persona', id: L.claveDe(a.persona) });
    },
    cambio: function (fd) {
      const tc = L.parseCambio(fd.get('tc'));
      if (!tc) return fallo('Escribe el cambio como 3.40');
      estado.tc = tc;
      guardar(); cerrar(); pintar();
    },
    nombre: function (fd) {
      const n = String(fd.get('nombre') || '').trim();
      if (!n) return fallo('Escribe tu nombre.');
      estado.nombre = n.slice(0, 40);
      guardar(); cerrar(); pintar();
    },
    medios: function (fd) {
      for (const m of estado.medios) {
        const c = L.cuentaDe(estado, fd.get('m_' + m.id));
        if (c) m.cuenta = c.id;
      }
      guardar(); cerrar(); pintar();
    }
  };

  // ---------- eventos ----------

  document.addEventListener('click', function (e) {
    if (e.target.id === 'hoja') return cerrar();   // tocar fuera del panel lo cierra
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    e.preventDefault();
    const f = acciones[b.dataset.accion];
    if (f) f(b.dataset);
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    const f = e.target;
    if (envios[f.dataset.envio]) envios[f.dataset.envio](new FormData(f));
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('#hoja [data-repinta]')) {
      leerBorrador();
      // cambiar a quién le toca o la moneda no debe perder lo ya escrito
      pintarHoja();
    }
    if (e.target.id === 'archivo' && e.target.files[0]) restaurar(e.target.files[0]);
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'buscar') return;
    busca = e.target.value;
    $('#resultados').innerHTML = resultadosMovs();   // solo los resultados, para no perder el teclado
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hoja) cerrar(); });
  window.addEventListener('hashchange', function () { cerrar(); pintar(); window.scrollTo(0, 0); });

  pintar();
  if (!estado.bienvenida && !DEMO) acciones.bienvenida();
  if ('serviceWorker' in navigator && !DEMO && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
