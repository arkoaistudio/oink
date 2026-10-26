/* Lógica de Oink, sin nada de pantalla: montos, fechas, tarjetas, resúmenes y respaldo.
   Corre igual en el navegador (window.Logica) y en Node (para las pruebas).
   Los montos se guardan siempre en céntimos enteros, nunca con decimales. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;
  const SIMBOLO = { PEN: 'S/', USD: 'US$' };
  const MONEDAS = ['PEN', 'USD'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const COLORES = ['amarillo', 'celeste', 'rosa', 'durazno', 'lila', 'salvia', 'arena'];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function dos(n) { return String(n).padStart(2, '0'); }

  // ---------- fechas (siempre en hora local, como texto AAAA-MM-DD) ----------

  function hoyISO(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }
  function aFecha(iso) { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function mesDe(fecha) { return fecha.slice(0, 7); }
  function moverMes(mes, delta) {
    const p = mes.split('-').map(Number);
    const total = p[0] * 12 + (p[1] - 1) + delta;
    return Math.floor(total / 12) + '-' + dos(total % 12 + 1);
  }
  function diasDelMes(mes) { const p = mes.split('-').map(Number); return new Date(p[0], p[1], 0).getDate(); }
  // El día `dia` de un mes, o el último si el mes es más corto (un cobro del 31 cae el 30 en noviembre).
  function diaDeMes(mes, dia) { return mes + '-' + dos(Math.min(dia, diasDelMes(mes))); }
  function sumarDias(fecha, n) { const d = aFecha(fecha); d.setDate(d.getDate() + n); return hoyISO(d); }
  function diasEntre(a, b) { return Math.round((aFecha(b) - aFecha(a)) / 86400000); }
  function nombreMes(mes) {
    const p = mes.split('-').map(Number);
    const n = MESES[p[1] - 1];
    return { nombre: n.charAt(0).toUpperCase() + n.slice(1), anio: p[0], numero: dos(p[1]) };
  }
  function etiquetaDia(fecha) {
    const p = fecha.split('-').map(Number);
    return DIAS[aFecha(fecha).getDay()] + ' ' + p[2] + ' ' + MESES[p[1] - 1].slice(0, 3);
  }
  function fechaCorta(fecha) {
    const p = fecha.split('-').map(Number);
    return p[2] + ' ' + MESES[p[1] - 1].slice(0, 3);
  }

  // ---------- montos ----------

  /* Lee lo que se tipea y devuelve céntimos, o null si no es un monto válido.
     Acepta punto o coma decimal (el teclado del iPhone cambia según la región)
     y separadores de miles: "1,250.50", "1250,5", "1.250,50", "1,250". */
  function parseMonto(texto) {
    if (typeof texto === 'number') {
      return Number.isFinite(texto) && texto > 0 ? Math.round(texto * 100) : null;
    }
    const t = String(texto == null ? '' : texto).replace(/[^\d.,]/g, '');
    if (!/\d/.test(t)) return null;
    const uc = t.lastIndexOf(','), up = t.lastIndexOf('.');
    let dec = -1;
    if (uc >= 0 && up >= 0) dec = Math.max(uc, up);
    else if (up >= 0) dec = t.indexOf('.') === up ? up : -1;
    else if (uc >= 0) {
      // una sola coma seguida de tres cifras es separador de miles: "1,250"
      const unica = t.indexOf(',') === uc;
      dec = unica && t.length - uc - 1 !== 3 ? uc : -1;
    }
    const entero = (dec >= 0 ? t.slice(0, dec) : t).replace(/[.,]/g, '');
    const frac = dec >= 0 ? t.slice(dec + 1).replace(/[.,]/g, '') : '';
    const n = Number((entero || '0') + '.' + (frac || '0'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  function parseCambio(texto) {
    const n = parseFloat(String(texto == null ? '' : texto).replace(',', '.'));
    return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n * 1000) / 1000 : null;
  }

  function partes(centimos, mon) {
    const neg = centimos < 0;
    const c = Math.abs(Math.round(centimos));
    return {
      neg: neg,
      sim: SIMBOLO[mon] || '',
      ent: String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      dec: dos(c % 100)
    };
  }
  function fmt(centimos, mon) {
    const p = partes(centimos, mon);
    return (p.neg ? '− ' : '') + p.sim + ' ' + p.ent + '.' + p.dec;
  }
  function aTexto(centimos) { return (Math.abs(centimos) / 100).toFixed(2); }

  function convertir(monto, de, a, tc) {
    if (de === a) return monto;
    return de === 'USD' ? Math.round(monto * tc) : Math.round(monto / tc);
  }
  function porMoneda() { return { PEN: 0, USD: 0 }; }

  /* Lo que vale en soles un gasto o ingreso. Si fue en dólares pero salió de una
     cuenta en soles, vale lo que cobró el banco, no el cambio teórico. */
  function aSoles(m) {
    if (m.mon !== 'USD') return m.monto;
    if (m.monCuenta === 'PEN' && m.cobrado) return m.cobrado;
    return Math.round(m.monto * (m.tc || 1));
  }

  /* Un gasto que no es (todo) de ella guarda en `ajeno` a quién le toca y cuánto.
     La tarjeta o la cuenta paga el monto entero; lo suyo es lo que sobra, y eso es
     lo único que cuenta para los topes y las estadísticas. */
  // Un gasto suma y una devolución resta, en la tarjeta, en la cuenta y en las stats.
  function signo(m) { return m.tipo === 'devolucion' ? -1 : 1; }
  function propio(m) { return m.monto - (m.ajeno ? m.ajeno.monto : 0); }
  function solesPropio(m) {
    const t = aSoles(m);
    return m.ajeno ? Math.round(t * propio(m) / m.monto) : t;
  }

  // Lo que el movimiento mueve en su cuenta, en la moneda de la cuenta.
  function enCuenta(m) { return m.monCuenta && m.monCuenta !== m.mon ? m.cobrado : m.monto; }

  // ---------- estado ----------

  /* Fechas de cierre y de pago de la tarjeta BCP en 2026, de la tabla del banco.
     Cambian cada mes; las que falten se calculan con el día de cierre y de pago de siempre. */
  const FECHAS_BCP_2026 = [
    ['2026-01-22', '2026-02-18'], ['2026-02-20', '2026-03-18'], ['2026-03-20', '2026-04-20'],
    ['2026-04-22', '2026-05-18'], ['2026-05-22', '2026-06-18'], ['2026-06-22', '2026-07-20'],
    ['2026-07-22', '2026-08-18'], ['2026-08-21', '2026-09-21'], ['2026-09-22', '2026-10-19'],
    ['2026-10-22', '2026-11-18'], ['2026-11-20', '2026-12-21'], ['2026-12-22', '2027-01-18']
  ].map(function (f) { return { cierre: f[0], pago: f[1] }; });

  function estadoInicial() {
    const cat = function (id, nombre, color, ico) { return { id: id, nombre: nombre, color: color, ico: ico }; };
    return {
      v: VERSION,
      nombre: 'Andrea',
      tc: 3.40,
      categorias: [
        cat('c-comida', 'Comida', 'amarillo', 'comida'),
        cat('c-transporte', 'Transporte', 'celeste', 'transporte'),
        cat('c-ropa', 'Ropa', 'rosa', 'ropa'),
        cat('c-salidas', 'Salidas', 'durazno', 'salidas'),
        cat('c-regalos', 'Regalos', 'lila', 'regalos'),
        cat('c-suscripciones', 'Suscripciones', 'salvia', 'suscripciones'),
        cat('c-otros', 'Otros', 'arena', 'otros')
      ],
      catIngreso: [{ id: 'i-sueldo', nombre: 'Sueldo' }, { id: 'i-otros', nombre: 'Otros' }],
      cuentas: [
        { id: 'k-bcp', nombre: 'BCP', tipo: 'debito', mon: 'PEN', inicial: 0 },
        { id: 'k-scotia', nombre: 'Scotiabank', tipo: 'debito', mon: 'PEN', inicial: 0 },
        { id: 'k-efectivo', nombre: 'Efectivo', tipo: 'debito', mon: 'PEN', inicial: 0 },
        { id: 't-bcp', nombre: 'BCP', tipo: 'credito', color: 'celeste', cierreDia: 22, pagoDia: 18,
          fechas: FECHAS_BCP_2026.slice(), inicial: porMoneda() },
        { id: 't-scotia', nombre: 'Scotiabank', tipo: 'credito', color: 'rosa', cierreDia: 18, pagoDia: 15,
          fechas: [], inicial: porMoneda() }
      ],
      // Yape sale del BCP y Plin del Scotiabank: son botones rápidos, no cuentas aparte.
      medios: [
        { id: 'yape', nombre: 'Yape', cuenta: 'k-bcp' },
        { id: 'plin', nombre: 'Plin', cuenta: 'k-scotia' }
      ],
      movs: [],
      personas: ['Mamá', 'Juanky'],
      apuntes: [],
      subs: [],
      saltadas: [],
      topes: {},
      alcancia: [],
      ultimoRespaldo: null,
      bienvenida: false
    };
  }

  function cuentaDe(estado, id) {
    for (const c of estado.cuentas) if (c.id === id) return c;
    return null;
  }
  function esCredito(c) { return !!c && c.tipo === 'credito'; }
  function debitos(estado) { return estado.cuentas.filter(function (c) { return c.tipo !== 'credito'; }); }
  function tarjetas(estado) { return estado.cuentas.filter(esCredito); }
  function nombreCuenta(c) { return c ? c.nombre + (c.tipo === 'credito' ? ' crédito' : c.id === 'k-efectivo' ? '' : ' débito') : ''; }
  function medioDe(estado, id) { return estado.medios.filter(function (x) { return x.id === id; })[0] || null; }
  function catDe(estado, id) { return estado.categorias.filter(function (c) { return c.id === id; })[0] || null; }
  function nombreCat(estado, m) {
    const lista = m.tipo === 'ingreso' ? estado.catIngreso : estado.categorias;
    for (const c of lista) if (c.id === m.cat) return c.nombre;
    return 'Sin categoría';
  }
  // Cómo se pagó, como se lee en una fila: "Yape", "BCP crédito"…
  function comoSePago(estado, m) {
    const md = m.medio && medioDe(estado, m.medio);
    return md ? md.nombre : nombreCuenta(cuentaDe(estado, m.cuenta));
  }
  function usosCuenta(estado, id) {
    let n = 0;
    for (const m of estado.movs) if (m.cuenta === id || m.destino === id || m.tarjeta === id) n++;
    for (const d of estado.apuntes) if (d.cuenta === id) n++;
    for (const s of estado.subs) if (s.cuenta === id) n++;
    return n;
  }

  // ---------- saldos ----------

  /* Saldo de cada cuenta de débito (lo que tenía al empezar, más lo que entró, menos
     lo que salió) y deuda de cada tarjeta por moneda (lo que debía al empezar, más
     los consumos, menos los pagos). Los totales van en soles, con los dólares al cambio de hoy. */
  function saldos(estado) {
    const s = {}, deuda = {};
    for (const c of estado.cuentas) {
      if (esCredito(c)) deuda[c.id] = { PEN: c.inicial.PEN + (c.previo ? c.previo.PEN : 0), USD: c.inicial.USD + (c.previo ? c.previo.USD : 0) };
      else s[c.id] = c.inicial || 0;
    }
    for (const m of estado.movs) {
      if (m.tipo === 'gasto' || m.tipo === 'devolucion') {
        const k = signo(m);
        if (m.cuenta in deuda) deuda[m.cuenta][m.mon] += k * m.monto;
        else if (m.cuenta in s) s[m.cuenta] -= k * enCuenta(m);
      } else if (m.tipo === 'ingreso') {
        if (m.cuenta in s) s[m.cuenta] += enCuenta(m);
      } else if (m.tipo === 'pago') {
        if (m.tarjeta in deuda) deuda[m.tarjeta][m.mon] -= m.monto;
        if (m.cuenta in s) s[m.cuenta] -= m.sale;
      } else if (m.tipo === 'mover') {
        if (m.cuenta in s) s[m.cuenta] -= m.monto;
        if (m.destino in s) s[m.destino] += m.llega;
      }
    }
    // un pago de una persona que entró a (o salió de) una cuenta también la mueve
    for (const d of estado.apuntes) if (d.cuenta && d.cuenta in s) s[d.cuenta] -= d.monto;
    const r = { cuentas: [], tarjetas: [], tengo: porMoneda(), debo: porMoneda(), tengoTotal: 0, deboTotal: 0 };
    for (const c of estado.cuentas) {
      if (esCredito(c)) {
        r.tarjetas.push({ id: c.id, nombre: c.nombre, deuda: deuda[c.id] });
        for (const mon of MONEDAS) r.debo[mon] += deuda[c.id][mon];
      } else {
        r.cuentas.push({ id: c.id, nombre: c.nombre, mon: c.mon, saldo: s[c.id] });
        r.tengo[c.mon] += s[c.id];
      }
    }
    r.tengoTotal = r.tengo.PEN + Math.round(r.tengo.USD * estado.tc);
    r.deboTotal = r.debo.PEN + Math.round(r.debo.USD * estado.tc);
    return r;
  }

  // ---------- tarjetas de crédito ----------

  /* Las fechas de cierre y pago de una tarjeta alrededor de un rango: las anotadas a mano
     (`fechas`) y, en los meses que no tienen ninguna, las de siempre (`cierreDia`, y
     `pagoDia` del mes siguiente). Ordenadas por cierre. */
  function fechasTarjeta(t, desde, hasta) {
    const explicitas = (t.fechas || []).slice().sort(function (a, b) { return a.cierre < b.cierre ? -1 : 1; });
    const tiene = {};
    for (const f of explicitas) tiene[mesDe(f.cierre)] = true;
    const r = explicitas.slice();
    for (let mes = moverMes(mesDe(desde), -1); mes <= moverMes(mesDe(hasta), 1); mes = moverMes(mes, 1)) {
      if (tiene[mes]) continue;
      r.push({ cierre: diaDeMes(mes, t.cierreDia), pago: diaDeMes(moverMes(mes, 1), t.pagoDia) });
    }
    return r.sort(function (a, b) { return a.cierre < b.cierre ? -1 : a.cierre > b.cierre ? 1 : 0; });
  }

  // El periodo de facturación en que cae una fecha: del día después del cierre anterior a su cierre.
  function periodo(t, fecha) {
    const lista = fechasTarjeta(t, sumarDias(fecha, -70), sumarDias(fecha, 70));
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].cierre >= fecha) {
        const antes = i > 0 ? lista[i - 1].cierre : sumarDias(lista[i].cierre, -31);
        return { desde: sumarDias(antes, 1), hasta: lista[i].cierre, pago: lista[i].pago };
      }
    }
    return null;
  }

  function cubeta() {
    return { PEN: { total: 0, mio: 0, otros: {} }, USD: { total: 0, mio: 0, otros: {} } };
  }
  // Suma un gasto a su cubeta; una devolución resta (de lo suyo o de quien era).
  function sumarA(c, m) {
    const b = c[m.mon], k = signo(m);
    b.total += k * m.monto;
    b.mio += k * propio(m);
    if (m.ajeno) b.otros[m.ajeno.persona] = (b.otros[m.ajeno.persona] || 0) + k * m.ajeno.monto;
  }

  /* Cómo va una tarjeta hoy, por moneda:
     - `facturado`: consumos del último estado de cuenta (ya cerrado), con lo suyo y lo de cada persona.
     - `falta`: lo que queda por pagar hasta `anterior.pago`. Los pagos se aplican primero a lo
       más viejo, así que si pagó de más, lo que sobra baja el ciclo actual.
     - `ciclo`: consumos desde el último cierre, que se cobran en `actual.pago`.
     - `deuda`: todo lo que debe en esa tarjeta. */
  function estadoTarjeta(estado, t, hoy) {
    const actual = periodo(t, hoy);
    const anterior = periodo(t, sumarDias(actual.desde, -1));
    const viejo = { PEN: t.inicial.PEN, USD: t.inicial.USD };   // todo lo cerrado, incluido lo que debía al empezar
    const pagado = porMoneda();
    const r = { actual: actual, anterior: anterior, facturado: cubeta(), ciclo: cubeta(), falta: porMoneda(), deuda: porMoneda(), pagadoFacturado: porMoneda() };
    const movs = estado.movs.slice();
    // lo que ya llevaba en el ciclo al empezar a usar Oink entra como un consumo suyo de ese día
    if (t.previo) {
      for (const mon of MONEDAS) if (t.previo[mon]) movs.push({ tipo: 'gasto', cuenta: t.id, monto: t.previo[mon], mon: mon, fecha: t.previo.fecha });
    }
    for (const m of movs) {
      if ((m.tipo === 'gasto' || m.tipo === 'devolucion') && m.cuenta === t.id) {
        if (m.fecha < actual.desde) {
          viejo[m.mon] += signo(m) * m.monto;
          if (m.fecha >= anterior.desde) sumarA(r.facturado, m);
        } else sumarA(r.ciclo, m);
      } else if (m.tipo === 'pago' && m.tarjeta === t.id) pagado[m.mon] += m.monto;
    }
    for (const mon of MONEDAS) {
      r.falta[mon] = Math.max(0, viejo[mon] - pagado[mon]);
      r.pagadoFacturado[mon] = Math.min(pagado[mon], viejo[mon]);
      r.deuda[mon] = viejo[mon] + r.ciclo[mon].total - pagado[mon];
    }
    r.diasParaPagar = diasEntre(hoy, anterior.pago);
    r.diasParaCierre = diasEntre(hoy, actual.hasta);
    return r;
  }

  // Lo que hay que pagar pronto en las tarjetas, lo más urgente primero.
  function proximosPagos(estado, hoy) {
    const r = [];
    for (const t of tarjetas(estado)) {
      const e = estadoTarjeta(estado, t, hoy);
      if (!e.falta.PEN && !e.falta.USD) continue;
      r.push({ tarjeta: t, falta: e.falta, pago: e.anterior.pago, dias: e.diasParaPagar });
    }
    return r.sort(function (a, b) { return a.dias - b.dias; });
  }

  // ---------- resúmenes ----------

  // El mes de ella: solo lo suyo de cada gasto, en soles.
  function resumenMes(estado, mes) {
    const r = {
      gastado: 0, ingresos: 0, n: 0, porCategoria: [], porMedio: [], porLugar: [], porDia: {},
      deOtros: {}, mayor: null
    };
    const cats = {}, medios = {}, lugares = {};
    for (const m of estado.movs) {
      if (mesDe(m.fecha) !== mes) continue;
      if (m.tipo === 'ingreso') { r.ingresos += aSoles(m); continue; }
      if (m.tipo !== 'gasto' && m.tipo !== 'devolucion') continue;
      const dev = m.tipo === 'devolucion';
      if (!dev) r.n++;
      if (m.ajeno) {
        const o = r.deOtros[m.ajeno.persona] = r.deOtros[m.ajeno.persona] || porMoneda();
        o[m.mon] += signo(m) * m.ajeno.monto;
      }
      const s = signo(m) * solesPropio(m);
      if (!s) continue;
      r.gastado += s;
      cats[m.cat] = (cats[m.cat] || 0) + s;
      if (dev) continue;   // una devolución baja lo gastado y su categoría; no es una visita ni un día de gasto
      const como = comoSePago(estado, m);
      medios[como] = (medios[como] || 0) + s;
      if (m.lugar) {
        const k = m.lugar.trim().toLowerCase();
        const l = lugares[k] = lugares[k] || { nombre: m.lugar.trim(), total: 0, veces: 0 };
        l.total += s; l.veces++;
      }
      r.porDia[m.fecha] = (r.porDia[m.fecha] || 0) + s;
      if (!r.mayor || s > solesPropio(r.mayor)) r.mayor = m;
    }
    for (const k of Object.keys(cats)) if (cats[k] <= 0) delete cats[k];
    const pct = function (v) { return r.gastado ? Math.round(v / r.gastado * 100) : 0; };
    r.porCategoria = Object.keys(cats).map(function (id) {
      const c = catDe(estado, id) || { id: id, nombre: 'Sin categoría', color: 'arena', ico: 'otros' };
      return { cat: c, total: cats[id], pct: pct(cats[id]) };
    }).sort(function (a, b) { return b.total - a.total; });
    r.porMedio = Object.keys(medios).map(function (k) { return { nombre: k, total: medios[k], pct: pct(medios[k]) }; })
      .sort(function (a, b) { return b.total - a.total; });
    r.porLugar = Object.keys(lugares).map(function (k) { return lugares[k]; })
      .sort(function (a, b) { return b.total - a.total; });
    return r;
  }

  // Topes por categoría, en soles; los gastos en dólares entran convertidos.
  function topesMes(estado, mes) {
    const g = {};
    for (const m of estado.movs) {
      if ((m.tipo === 'gasto' || m.tipo === 'devolucion') && mesDe(m.fecha) === mes) g[m.cat] = (g[m.cat] || 0) + signo(m) * solesPropio(m);
    }
    const r = { filas: [], tope: 0, gastadoConTope: 0, hay: false };
    for (const c of estado.categorias) {
      const tope = estado.topes[c.id] || 0, gastado = g[c.id] || 0;
      r.filas.push({ cat: c, tope: tope, gastado: gastado, resto: tope - gastado,
        pct: tope ? Math.round(gastado / tope * 100) : 0, pasado: tope > 0 && gastado > tope });
      if (tope) { r.tope += tope; r.gastadoConTope += gastado; r.hay = true; }
    }
    r.resto = r.tope - r.gastadoConTope;
    return r;
  }

  // Movimientos de un mes agrupados por día, lo más reciente arriba.
  function diasConMovs(estado, mes, filtro) {
    const dias = {};
    for (const m of estado.movs) {
      if (mesDe(m.fecha) !== mes) continue;
      if (filtro && !filtro(m)) continue;
      (dias[m.fecha] = dias[m.fecha] || []).push(m);
    }
    return Object.keys(dias).sort().reverse().map(function (f) {
      const movs = dias[f].sort(function (a, b) { return (b.creado || 0) - (a.creado || 0); });
      let gasto = 0;
      for (const m of movs) if (m.tipo === 'gasto' || m.tipo === 'devolucion') gasto += signo(m) * solesPropio(m);
      return { fecha: f, movs: movs, gasto: gasto };
    });
  }

  /* Busca en todos los meses por nota, lugar, categoría, persona o con qué se pagó, sin
     mirar mayúsculas ni tildes. Devuelve los movimientos por día y lo suyo gastado en soles. */
  function sinTildes(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function buscar(estado, texto) {
    const q = sinTildes(texto).trim();
    if (!q) return { dias: [], total: 0, n: 0 };
    const dias = {};
    let total = 0, n = 0;
    for (const m of estado.movs) {
      const conCat = m.tipo === 'gasto' || m.tipo === 'ingreso' || m.tipo === 'devolucion';
      const donde = [m.nota, m.lugar, m.ajeno && m.ajeno.persona, conCat ? nombreCat(estado, m) : '', comoSePago(estado, m),
        m.tipo === 'devolucion' ? 'devolucion' : '', m.tipo === 'pago' ? 'pago tarjeta' : ''].map(sinTildes).join(' | ');
      if (donde.indexOf(q) < 0) continue;
      (dias[m.fecha] = dias[m.fecha] || []).push(m);
      if (m.tipo === 'gasto' || m.tipo === 'devolucion') total += signo(m) * solesPropio(m);
      n++;
    }
    return {
      dias: Object.keys(dias).sort().reverse().map(function (f) {
        return { fecha: f, movs: dias[f].sort(function (a, b) { return (b.creado || 0) - (a.creado || 0); }) };
      }),
      total: total, n: n
    };
  }

  // Lugares ya usados, del más frecuente al menos, para sugerirlos al escribir.
  function lugaresUsados(estado) {
    const n = {};
    for (const m of estado.movs) if (m.lugar) { const k = m.lugar.trim(); n[k] = (n[k] || 0) + 1; }
    return Object.keys(n).sort(function (a, b) { return n[b] - n[a]; });
  }

  // El último sueldo anotado, para proponer el mismo monto.
  function ultimoSueldo(estado) {
    let u = null;
    for (const m of estado.movs) if (m.tipo === 'ingreso' && m.cat === 'i-sueldo' && (!u || m.fecha > u.fecha)) u = m;
    return u;
  }

  // ---------- suscripciones ----------

  /* Las suscripciones de este mes que todavía no se confirmaron: las que ya tocaban
     (`vence` = 0 o negativo) y las que tocan en los próximos 3 días. Una suscripción
     no pide meses de antes de haberse creado (`desde`). */
  function subsPendientes(estado, hoy) {
    const mes = mesDe(hoy), r = [];
    for (const s of estado.subs) {
      if (s.pausada || (s.desde && s.desde > mes)) continue;
      const fecha = diaDeMes(mes, s.dia);
      const hecha = estado.movs.some(function (m) { return m.sub === s.id && mesDe(m.fecha) === mes; });
      if (hecha || estado.saltadas.indexOf(s.id + '@' + mes) >= 0) continue;
      const vence = diasEntre(hoy, fecha);
      if (vence <= 3) r.push({ sub: s, fecha: fecha, vence: vence });
    }
    return r.sort(function (a, b) { return a.vence - b.vence; });
  }
  function totalSubs(estado) {
    let t = 0;
    for (const s of estado.subs) if (!s.pausada) t += s.mon === 'USD' ? Math.round(s.monto * estado.tc) : s.monto;
    return t;
  }

  // ---------- alcancía ----------

  /* La alcancía es plata apartada: no sale de ninguna cuenta, solo se anota.
     La racha son los meses seguidos (hasta este o el anterior) en que apartó algo. */
  function alcancia(estado, hoy) {
    const total = porMoneda(), porMes = {};
    for (const a of estado.alcancia) {
      total[a.mon] += a.monto;
      const k = mesDe(a.fecha);
      porMes[k] = (porMes[k] || 0) + (a.mon === 'USD' ? Math.round(a.monto * estado.tc) : a.monto);
    }
    let mes = mesDe(hoy), racha = 0;
    if (!(porMes[mes] > 0)) mes = moverMes(mes, -1);
    while (porMes[mes] > 0) { racha++; mes = moverMes(mes, -1); }
    return { total: total, enSoles: total.PEN + Math.round(total.USD * estado.tc), racha: racha,
      esteMes: porMes[mesDe(hoy)] || 0, porMes: porMes };
  }

  // ---------- personas ----------

  /* Cada apunte es una cantidad con signo: positivo = esa persona le debe más,
     negativo = ella le debe más a esa persona. Un pago es otro apunte (`pago: true`)
     con el signo contrario, así el saldo siempre es la suma y nada se borra. */
  function claveDe(nombre) { return String(nombre || '').trim().toLowerCase(); }
  function tipoApunte(d) {
    if (d.pago) return d.monto < 0 ? 'mepago' : 'lepague';
    return d.monto > 0 ? 'medebe' : 'ledebo';
  }
  const ROTULO_APUNTE = { medebe: 'Me debe', ledebo: 'Le debo', mepago: 'Me pagó', lepague: 'Le pagué' };

  // Una fila por persona (también las que no tienen apuntes) con su saldo y sus apuntes.
  function personas(estado) {
    const por = {};
    const fila = function (nombre) {
      const k = claveDe(nombre);
      return (por[k] = por[k] || { clave: k, nombre: nombre.trim(), saldo: porMoneda(), apuntes: [] });
    };
    for (const n of estado.personas) fila(n);
    for (const d of estado.apuntes) {
      const f = fila(d.persona);
      f.saldo[d.mon] += d.monto;
      f.apuntes.push(d);
    }
    return Object.keys(por).map(function (k) {
      const f = por[k];
      f.apuntes.sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.creado || 0) - (a.creado || 0); });
      f.pendiente = f.saldo.PEN !== 0 || f.saldo.USD !== 0;
      return f;
    });
  }

  // Lo que le deben y lo que debe, sumado por moneda.
  function totalPersonas(estado) {
    const r = { meDeben: porMoneda(), debo: porMoneda() };
    for (const f of personas(estado)) {
      for (const mon of MONEDAS) {
        if (f.saldo[mon] > 0) r.meDeben[mon] += f.saldo[mon];
        else r.debo[mon] -= f.saldo[mon];
      }
    }
    return r;
  }

  /* Deja el apunte de un gasto ajeno como dice su `ajeno`: borra el que había de ese
     gasto y lo crea de nuevo. Los pagos son apuntes aparte y no se tocan. */
  function sincronizarAjeno(estado, m) {
    estado.apuntes = estado.apuntes.filter(function (d) { return d.mov !== m.id; });
    if (!m.ajeno) return;
    const dev = m.tipo === 'devolucion';
    estado.apuntes.push({
      id: uid(), persona: m.ajeno.persona, monto: signo(m) * m.ajeno.monto, mon: m.mon,
      nota: (dev ? 'Devolución · ' : '') + (m.nota || m.lugar || nombreCat(estado, m)), fecha: m.fecha, pago: false, creado: m.creado || Date.now(), mov: m.id
    });
  }

  function textoSaldo(saldo) {
    const t = [];
    for (const mon of MONEDAS) if (saldo[mon]) t.push(fmt(Math.abs(saldo[mon]), mon));
    return t.length ? t.join(' · ') : 'Al día';
  }

  // ---------- respaldo ----------

  /* Revisa un respaldo antes de cargarlo y descarta lo que venga mal formado,
     para que un archivo dañado no rompa la app. */
  function validar(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.movs)) return { ok: false, error: 'Ese archivo no es un respaldo de Oink.' };
    if (typeof o.v === 'number' && o.v > VERSION) return { ok: false, error: 'El respaldo es de una versión más nueva de la app.' };
    const base = estadoInicial();
    const entero = function (n) { return typeof n === 'number' && Number.isFinite(n) && Math.round(n) === n; };
    const texto = function (s, max) { return typeof s === 'string' ? s.slice(0, max || 120) : ''; };
    const mon2 = function (x) { return { PEN: x && entero(x.PEN) ? x.PEN : 0, USD: x && entero(x.USD) ? x.USD : 0 }; };
    const e = {
      v: VERSION,
      nombre: texto(o.nombre, 40).trim() || base.nombre,
      tc: typeof o.tc === 'number' && o.tc > 0 && o.tc < 100 ? o.tc : base.tc,
      categorias: [], catIngreso: [], cuentas: [], medios: [], movs: [], personas: [], apuntes: [],
      subs: [], saltadas: [], topes: {}, alcancia: [],
      ultimoRespaldo: typeof o.ultimoRespaldo === 'string' ? o.ultimoRespaldo : null,
      // un respaldo con movimientos ya pasó por la bienvenida aunque no lo diga
      bienvenida: o.bienvenida === true || o.movs.length > 0
    };
    for (const c of Array.isArray(o.categorias) ? o.categorias : []) {
      if (!c || !texto(c.id) || !texto(c.nombre).trim()) continue;
      e.categorias.push({ id: c.id, nombre: texto(c.nombre.trim(), 30), color: COLORES.indexOf(c.color) >= 0 ? c.color : 'arena', ico: texto(c.ico, 20) || '' });
    }
    if (!e.categorias.length) e.categorias = base.categorias;
    for (const c of Array.isArray(o.catIngreso) ? o.catIngreso : []) {
      if (c && texto(c.id) && texto(c.nombre).trim()) e.catIngreso.push({ id: c.id, nombre: texto(c.nombre.trim(), 30) });
    }
    if (!e.catIngreso.length) e.catIngreso = base.catIngreso;
    for (const c of Array.isArray(o.cuentas) ? o.cuentas : []) {
      if (!c || !texto(c.id) || !texto(c.nombre).trim()) continue;
      if (c.tipo === 'credito') {
        const dia = function (n, d) { return entero(n) && n >= 1 && n <= 31 ? n : d; };
        const t = { id: c.id, nombre: texto(c.nombre.trim(), 30), tipo: 'credito', color: COLORES.indexOf(c.color) >= 0 ? c.color : 'celeste',
          cierreDia: dia(c.cierreDia, 20), pagoDia: dia(c.pagoDia, 15), inicial: mon2(c.inicial),
          fechas: (Array.isArray(c.fechas) ? c.fechas : []).filter(function (f) { return f && FECHA.test(f.cierre) && FECHA.test(f.pago) && f.pago > f.cierre; })
            .map(function (f) { return { cierre: f.cierre, pago: f.pago }; }) };
        const previo = c.previo && FECHA.test(c.previo.fecha) ? mon2(c.previo) : null;
        if (previo && (previo.PEN || previo.USD)) t.previo = { PEN: previo.PEN, USD: previo.USD, fecha: c.previo.fecha };
        e.cuentas.push(t);
      } else if (SIMBOLO[c.mon]) {
        e.cuentas.push({ id: c.id, nombre: texto(c.nombre.trim(), 30), tipo: 'debito', mon: c.mon, inicial: entero(c.inicial) ? c.inicial : 0 });
      }
    }
    if (!debitos(e).length) e.cuentas = base.cuentas;
    for (const x of Array.isArray(o.medios) ? o.medios : []) {
      const c = x && cuentaDe(e, x.cuenta);
      if (c && !esCredito(c) && texto(x.id) && texto(x.nombre).trim()) e.medios.push({ id: x.id, nombre: texto(x.nombre.trim(), 20), cuenta: c.id });
    }
    const vistos = {};
    for (const n of Array.isArray(o.personas) ? o.personas : []) {
      const t = texto(n, 30).trim();
      if (t && !vistos[claveDe(t)]) { vistos[claveDe(t)] = true; e.personas.push(t); }
    }
    for (const m of o.movs) {
      if (!m || ['gasto', 'ingreso', 'pago', 'mover', 'devolucion'].indexOf(m.tipo) < 0) continue;
      if (!entero(m.monto) || m.monto <= 0 || !SIMBOLO[m.mon] || !FECHA.test(m.fecha)) continue;
      const cta = cuentaDe(e, m.cuenta);
      if (!cta) continue;
      const l = { id: texto(m.id) || uid(), tipo: m.tipo, monto: m.monto, mon: m.mon,
        tc: typeof m.tc === 'number' && m.tc > 0 ? m.tc : e.tc, cuenta: cta.id, nota: texto(m.nota, 200), fecha: m.fecha,
        creado: typeof m.creado === 'number' ? m.creado : 0 };
      if (m.tipo === 'gasto' || m.tipo === 'ingreso' || m.tipo === 'devolucion') {
        if (m.tipo === 'ingreso' && esCredito(cta)) continue;
        l.cat = texto(m.cat);
        if (m.tipo !== 'ingreso') {
          if (texto(m.lugar).trim()) l.lugar = texto(m.lugar.trim(), 60);
          if (m.medio && medioDe(e, m.medio)) l.medio = m.medio;
          if (texto(m.sub)) l.sub = m.sub;
          if (m.ajeno && texto(m.ajeno.persona).trim() && entero(m.ajeno.monto) && m.ajeno.monto > 0 && m.ajeno.monto <= m.monto) {
            l.ajeno = { persona: texto(m.ajeno.persona.trim(), 30), monto: m.ajeno.monto };
          }
        }
        if (!esCredito(cta) && cta.mon !== m.mon) {
          const sabe = entero(m.cobrado) && m.cobrado > 0;
          l.monCuenta = cta.mon;
          l.cobrado = sabe ? m.cobrado : convertir(m.monto, m.mon, cta.mon, l.tc);
          if (!sabe || m.estimado) l.estimado = true;
        }
      } else if (m.tipo === 'pago') {
        const t = cuentaDe(e, m.tarjeta);
        if (!esCredito(t) || esCredito(cta)) continue;
        l.tarjeta = t.id;
        l.sale = entero(m.sale) && m.sale > 0 ? m.sale : convertir(m.monto, m.mon, cta.mon, l.tc);
        if (m.estimado && cta.mon !== m.mon) l.estimado = true;
      } else {
        const d = cuentaDe(e, m.destino);
        if (!d || esCredito(d) || esCredito(cta) || d.id === cta.id) continue;
        l.mon = cta.mon;
        l.destino = d.id;
        l.llega = entero(m.llega) && m.llega > 0 ? m.llega : convertir(m.monto, cta.mon, d.mon, l.tc);
      }
      e.movs.push(l);
    }
    for (const d of Array.isArray(o.apuntes) ? o.apuntes : []) {
      if (!d || !texto(d.persona).trim() || !entero(d.monto) || d.monto === 0 || !SIMBOLO[d.mon] || !FECHA.test(d.fecha)) continue;
      const a = { id: texto(d.id) || uid(), persona: texto(d.persona.trim(), 30), monto: d.monto, mon: d.mon,
        nota: texto(d.nota, 200), fecha: d.fecha, pago: d.pago === true, creado: typeof d.creado === 'number' ? d.creado : 0 };
      const cta = a.pago ? cuentaDe(e, d.cuenta) : null;
      if (cta && !esCredito(cta) && cta.mon === d.mon) a.cuenta = cta.id;
      if (!a.pago && texto(d.mov) && e.movs.some(function (m) { return m.id === d.mov && m.ajeno; })) a.mov = d.mov;
      e.apuntes.push(a);
    }
    for (const s of Array.isArray(o.subs) ? o.subs : []) {
      if (!s || !texto(s.nombre).trim() || !entero(s.monto) || s.monto <= 0 || !SIMBOLO[s.mon] || !entero(s.dia) || s.dia < 1 || s.dia > 31) continue;
      const cta = cuentaDe(e, s.cuenta) || tarjetas(e)[0] || e.cuentas[0];
      e.subs.push({ id: texto(s.id) || uid(), nombre: texto(s.nombre.trim(), 30), monto: s.monto, mon: s.mon, dia: s.dia,
        cuenta: cta.id, desde: /^\d{4}-\d{2}$/.test(s.desde) ? s.desde : '', pausada: s.pausada === true });
    }
    for (const k of Array.isArray(o.saltadas) ? o.saltadas : []) if (typeof k === 'string' && k.length < 60) e.saltadas.push(k);
    if (o.topes && typeof o.topes === 'object') {
      for (const id of Object.keys(o.topes)) if (entero(o.topes[id]) && o.topes[id] > 0) e.topes[id] = o.topes[id];
    }
    for (const a of Array.isArray(o.alcancia) ? o.alcancia : []) {
      if (!a || !entero(a.monto) || a.monto === 0 || !SIMBOLO[a.mon] || !FECHA.test(a.fecha)) continue;
      e.alcancia.push({ id: texto(a.id) || uid(), monto: a.monto, mon: a.mon, fecha: a.fecha, nota: texto(a.nota, 200) });
    }
    return { ok: true, estado: e };
  }

  // Hoja para Excel: el separador es ";" porque es el de Windows en es-PE.
  function aCSV(estado) {
    const celda = function (v) {
      const s = String(v == null ? '' : v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const plata = function (c) { return (c / 100).toFixed(2); };
    const filas = [];
    for (const m of estado.movs) {
      const cta = nombreCuenta(cuentaDe(estado, m.cuenta));
      if (m.tipo === 'pago') {
        filas.push([m.fecha, 'Pago de tarjeta', cta + ' → ' + nombreCuenta(cuentaDe(estado, m.tarjeta)), '', '', '', m.nota, m.mon, plata(m.monto), '', '']);
      } else if (m.tipo === 'devolucion') {
        filas.push([m.fecha, 'Devolución', comoSePago(estado, m), nombreCat(estado, m), m.lugar || '',
          m.ajeno ? m.ajeno.persona + ' (' + plata(m.ajeno.monto) + ')' : '', m.nota, m.mon, plata(-m.monto), plata(-aSoles(m)), plata(-solesPropio(m))]);
      } else if (m.tipo === 'mover') {
        filas.push([m.fecha, 'Movimiento entre cuentas', cta + ' → ' + nombreCuenta(cuentaDe(estado, m.destino)), '', '', '', m.nota, m.mon, plata(m.monto), '', '']);
      } else {
        filas.push([m.fecha, m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', comoSePago(estado, m), nombreCat(estado, m), m.lugar || '',
          m.ajeno ? m.ajeno.persona + ' (' + plata(m.ajeno.monto) + ')' : '', m.nota, m.mon, plata(m.monto), plata(aSoles(m)), m.tipo === 'gasto' ? plata(solesPropio(m)) : '']);
      }
    }
    filas.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    filas.unshift(['Fecha', 'Tipo', 'Con qué', 'Categoría', 'Lugar', 'De otra persona', 'Nota', 'Moneda', 'Monto', 'En soles', 'Lo mío en soles']);
    return '﻿' + filas.map(function (f) { return f.map(celda).join(';'); }).join('\r\n') + '\r\n';
  }

  // Datos de muestra para ver la app llena (index.html?demo). No se guardan.
  function demo(hoy) {
    const e = estadoInicial();
    const mes = mesDe(hoy), antes = moverMes(mes, -1);
    const dia = function (m, d) { return diaDeMes(m, d) <= hoy || m !== mes ? diaDeMes(m, d) : hoy; };
    let n = 0;
    e.cuentas[0].inicial = 320000; e.cuentas[1].inicial = 145000; e.cuentas[2].inicial = 18000;
    e.cuentas[3].inicial = { PEN: 0, USD: 0 };
    const gasto = function (plata, cat, cuenta, fecha, extra) {
      const m = Object.assign({ id: 'd' + (++n), tipo: 'gasto', monto: Math.round(plata * 100), mon: 'PEN', tc: e.tc,
        cuenta: cuenta, cat: cat, nota: '', fecha: fecha, creado: n }, extra || {});
      const c = cuentaDe(e, m.cuenta);
      if (!esCredito(c) && c.mon !== m.mon) { m.monCuenta = c.mon; m.cobrado = convertir(m.monto, m.mon, c.mon, e.tc); m.estimado = true; }
      e.movs.push(m);
      sincronizarAjeno(e, m);
    };
    e.movs.push({ id: 'd' + (++n), tipo: 'ingreso', monto: 520000, mon: 'PEN', tc: e.tc, cuenta: 'k-bcp', cat: 'i-sueldo', nota: '', fecha: dia(antes, 28), creado: n });
    gasto(189.9, 'c-ropa', 't-bcp', dia(antes, 26), { lugar: 'Zara Jockey', nota: 'Blazer' });
    gasto(86, 'c-salidas', 't-scotia', dia(antes, 27), { lugar: 'La Lucha' });
    gasto(240, 'c-otros', 't-bcp', dia(antes, 29), { lugar: 'Wong', nota: 'Compras de mamá', ajeno: { persona: 'Mamá', monto: 24000 } });
    gasto(12.5, 'c-transporte', 'k-bcp', dia(mes, 1), { medio: 'yape', nota: 'Taxi' });
    gasto(44.9, 'c-suscripciones', 't-bcp', dia(mes, 2), { nota: 'Netflix', sub: 's1' });
    gasto(32, 'c-comida', 'k-scotia', dia(mes, 3), { medio: 'plin', lugar: 'Tambo' });
    gasto(129, 'c-ropa', 't-scotia', dia(mes, 5), { lugar: 'H&M', nota: 'Jean' });
    gasto(158, 'c-salidas', 't-bcp', dia(mes, 6), { lugar: 'Osaka', nota: 'Cumple de Fabi', ajeno: { persona: 'Juanky', monto: 7900 } });
    gasto(18, 'c-comida', 'k-efectivo', dia(mes, 8), { lugar: 'Menú' });
    gasto(320, 'c-otros', 't-bcp', dia(mes, 9), { lugar: 'Saga', nota: 'Zapatillas para mamá', ajeno: { persona: 'Mamá', monto: 32000 } });
    gasto(65, 'c-regalos', 'k-bcp', dia(mes, 10), { medio: 'yape', nota: 'Regalo de Juanky' });
    gasto(11.99, 'c-suscripciones', 't-scotia', dia(mes, 11), { mon: 'USD', nota: 'Spotify', sub: 's3' });
    gasto(98, 'c-salidas', 't-scotia', dia(mes, 12), { lugar: 'La Lucha' });
    gasto(22, 'c-transporte', 'k-bcp', dia(mes, 13), { medio: 'yape', nota: 'Cabify' });
    gasto(259, 'c-ropa', 't-bcp', dia(mes, 15), { lugar: 'Zara Jockey', nota: 'Vestido' });
    gasto(45, 'c-comida', 'k-scotia', dia(mes, 16), { medio: 'plin', lugar: 'Starbucks' });
    gasto(75, 'c-salidas', 't-bcp', dia(mes, 18), { lugar: 'Barra Chalaca' });
    gasto(14, 'c-transporte', 'k-bcp', dia(mes, 20), { medio: 'yape' });
    gasto(56, 'c-comida', 't-scotia', dia(mes, 21), { lugar: 'Tanta' });
    e.movs.push({ id: 'd' + (++n), tipo: 'ingreso', monto: 520000, mon: 'PEN', tc: e.tc, cuenta: 'k-bcp', cat: 'i-sueldo', nota: '', fecha: dia(mes, 22), creado: n });
    e.movs.push({ id: 'd' + (++n), tipo: 'pago', monto: 51590, mon: 'PEN', tc: e.tc, cuenta: 'k-bcp', tarjeta: 't-bcp', sale: 51590, nota: '', fecha: dia(mes, 18), creado: n });
    e.subs = [
      { id: 's1', nombre: 'Netflix', monto: 4490, mon: 'PEN', dia: 2, cuenta: 't-bcp', desde: antes },
      { id: 's2', nombre: 'Apple', monto: 1290, mon: 'PEN', dia: Math.min(28, Number(hoy.slice(8)) + 1), cuenta: 't-bcp', desde: antes },
      { id: 's3', nombre: 'Spotify', monto: 1199, mon: 'USD', dia: 11, cuenta: 't-scotia', desde: antes },
      { id: 's4', nombre: 'iCloud', monto: 399, mon: 'PEN', dia: Math.max(1, Number(hoy.slice(8)) - 1), cuenta: 't-scotia', desde: antes }
    ];
    e.topes = { 'c-ropa': 40000, 'c-salidas': 30000, 'c-comida': 50000, 'c-transporte': 20000 };
    e.alcancia = [
      { id: 'a1', monto: 50000, mon: 'PEN', fecha: dia(moverMes(mes, -2), 28), nota: '' },
      { id: 'a2', monto: 40000, mon: 'PEN', fecha: dia(antes, 28), nota: '' },
      { id: 'a3', monto: 60000, mon: 'PEN', fecha: dia(mes, 22), nota: 'Del sueldo' }
    ];
    gasto(59.9, 'c-ropa', 't-bcp', dia(mes, 17), { tipo: 'devolucion', lugar: 'Zara Jockey', nota: 'Vestido que no quedó' });
    e.bienvenida = true;
    e.apuntes.push({ id: 'q1', persona: 'Mamá', monto: -24000, mon: 'PEN', nota: '', fecha: dia(mes, 4), pago: true, creado: 1, cuenta: 'k-bcp' });
    return e;
  }

  return {
    VERSION: VERSION, SIMBOLO: SIMBOLO, MONEDAS: MONEDAS, COLORES: COLORES, FECHAS_BCP_2026: FECHAS_BCP_2026,
    uid: uid, hoyISO: hoyISO, mesDe: mesDe, moverMes: moverMes, diasDelMes: diasDelMes, diaDeMes: diaDeMes,
    sumarDias: sumarDias, diasEntre: diasEntre, nombreMes: nombreMes, etiquetaDia: etiquetaDia, fechaCorta: fechaCorta,
    parseMonto: parseMonto, parseCambio: parseCambio, partes: partes, fmt: fmt, aTexto: aTexto, convertir: convertir,
    aSoles: aSoles, propio: propio, solesPropio: solesPropio, enCuenta: enCuenta,
    estadoInicial: estadoInicial, cuentaDe: cuentaDe, esCredito: esCredito, debitos: debitos, tarjetas: tarjetas,
    nombreCuenta: nombreCuenta, medioDe: medioDe, catDe: catDe, nombreCat: nombreCat, comoSePago: comoSePago, usosCuenta: usosCuenta,
    saldos: saldos, fechasTarjeta: fechasTarjeta, periodo: periodo, estadoTarjeta: estadoTarjeta, proximosPagos: proximosPagos,
    resumenMes: resumenMes, topesMes: topesMes, diasConMovs: diasConMovs, buscar: buscar, signo: signo, lugaresUsados: lugaresUsados, ultimoSueldo: ultimoSueldo,
    subsPendientes: subsPendientes, totalSubs: totalSubs, alcancia: alcancia,
    claveDe: claveDe, tipoApunte: tipoApunte, ROTULO_APUNTE: ROTULO_APUNTE, personas: personas, totalPersonas: totalPersonas,
    sincronizarAjeno: sincronizarAjeno, textoSaldo: textoSaldo,
    validar: validar, aCSV: aCSV, demo: demo
  };
});
