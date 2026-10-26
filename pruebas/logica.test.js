// node --test pruebas/logica.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logica.js');

function base() { return L.estadoInicial(); }
function gasto(e, x) {
  const m = Object.assign({ id: L.uid(), tipo: 'gasto', mon: 'PEN', tc: e.tc, cat: 'c-comida', nota: '', creado: Date.now() }, x);
  e.movs.push(m);
  L.sincronizarAjeno(e, m);
  return m;
}

test('periodo de la BCP usa la tabla del banco', () => {
  const t = L.cuentaDe(base(), 't-bcp');
  assert.deepEqual(L.periodo(t, '2026-10-25'), { desde: '2026-10-23', hasta: '2026-11-20', pago: '2026-12-21' });
  assert.deepEqual(L.periodo(t, '2026-10-22'), { desde: '2026-09-23', hasta: '2026-10-22', pago: '2026-11-18' });
  assert.deepEqual(L.periodo(t, '2026-08-22'), { desde: '2026-08-22', hasta: '2026-09-22', pago: '2026-10-19' });
});

test('después de la tabla, la BCP sigue con el día de siempre', () => {
  const t = L.cuentaDe(base(), 't-bcp');
  assert.deepEqual(L.periodo(t, '2027-01-10'), { desde: '2026-12-23', hasta: '2027-01-22', pago: '2027-02-18' });
});

test('Scotiabank cierra el 18 y se paga el 15 del mes siguiente', () => {
  const t = L.cuentaDe(base(), 't-scotia');
  assert.deepEqual(L.periodo(t, '2026-10-25'), { desde: '2026-10-19', hasta: '2026-11-18', pago: '2026-12-15' });
  assert.deepEqual(L.periodo(t, '2026-10-18'), { desde: '2026-09-19', hasta: '2026-10-18', pago: '2026-11-15' });
});

test('estado de la tarjeta separa lo suyo, lo de mamá y la moneda', () => {
  const e = base();
  gasto(e, { cuenta: 't-scotia', monto: 10000, fecha: '2026-10-10' });
  gasto(e, { cuenta: 't-scotia', monto: 20000, fecha: '2026-10-12', ajeno: { persona: 'Mamá', monto: 20000 } });
  gasto(e, { cuenta: 't-scotia', monto: 1199, mon: 'USD', fecha: '2026-10-11' });
  gasto(e, { cuenta: 't-scotia', monto: 5000, fecha: '2026-10-20' });
  const r = L.estadoTarjeta(e, L.cuentaDe(e, 't-scotia'), '2026-10-25');
  assert.equal(r.facturado.PEN.total, 30000);
  assert.equal(r.facturado.PEN.mio, 10000);
  assert.equal(r.facturado.PEN.otros['Mamá'], 20000);
  assert.equal(r.facturado.USD.total, 1199);
  assert.equal(r.falta.PEN, 30000);
  assert.equal(r.ciclo.PEN.total, 5000);
  assert.equal(r.deuda.PEN, 35000);
  assert.equal(r.anterior.pago, '2026-11-15');
  assert.equal(r.diasParaPagar, 21);
});

test('el pago baja primero lo facturado y lo que sobra baja el ciclo', () => {
  const e = base();
  gasto(e, { cuenta: 't-scotia', monto: 10000, fecha: '2026-10-10' });
  gasto(e, { cuenta: 't-scotia', monto: 5000, fecha: '2026-10-20' });
  e.movs.push({ id: 'p', tipo: 'pago', monto: 12000, mon: 'PEN', cuenta: 'k-bcp', tarjeta: 't-scotia', sale: 12000, fecha: '2026-10-21' });
  const r = L.estadoTarjeta(e, L.cuentaDe(e, 't-scotia'), '2026-10-25');
  assert.equal(r.falta.PEN, 0);
  assert.equal(r.deuda.PEN, 3000);
  const s = L.saldos(e);
  assert.equal(s.cuentas.find(c => c.id === 'k-bcp').saldo, -12000);
  assert.equal(s.debo.PEN, 3000);
});

test('lo que debía al empezar cuenta como facturado', () => {
  const e = base();
  L.cuentaDe(e, 't-bcp').inicial = { PEN: 80000, USD: 2500 };
  const r = L.estadoTarjeta(e, L.cuentaDe(e, 't-bcp'), '2026-10-25');
  assert.equal(r.falta.PEN, 80000);
  assert.equal(r.falta.USD, 2500);
  assert.equal(L.proximosPagos(e, '2026-10-25')[0].pago, '2026-11-18');
});

test('gasto de mamá no entra a los topes ni a lo gastado, y queda como deuda', () => {
  const e = base();
  e.topes['c-comida'] = 10000;
  gasto(e, { cuenta: 't-bcp', monto: 8000, fecha: '2026-10-05', ajeno: { persona: 'Mamá', monto: 8000 } });
  gasto(e, { cuenta: 'k-bcp', medio: 'yape', monto: 3000, fecha: '2026-10-06', ajeno: { persona: 'Juanky', monto: 1500 } });
  const r = L.resumenMes(e, '2026-10');
  assert.equal(r.gastado, 1500);
  assert.equal(r.deOtros['Mamá'].PEN, 8000);
  assert.equal(L.topesMes(e, '2026-10').filas[0].gastado, 1500);
  const mama = L.personas(e).find(p => p.clave === 'mamá');
  assert.equal(mama.saldo.PEN, 8000);
  assert.equal(r.porMedio[0].nombre, 'Yape');
});

test('suscripciones pendientes: ya tocaba, pronto, confirmada y saltada', () => {
  const e = base();
  e.subs = [
    { id: 'a', nombre: 'Netflix', monto: 4490, mon: 'PEN', dia: 20, cuenta: 't-bcp', desde: '' },
    { id: 'b', nombre: 'Apple', monto: 1290, mon: 'PEN', dia: 27, cuenta: 't-bcp', desde: '' },
    { id: 'c', nombre: 'Spotify', monto: 1199, mon: 'USD', dia: 5, cuenta: 't-bcp', desde: '' },
    { id: 'd', nombre: 'iCloud', monto: 399, mon: 'PEN', dia: 1, cuenta: 't-bcp', desde: '' },
    { id: 'f', nombre: 'Nueva', monto: 399, mon: 'PEN', dia: 1, cuenta: 't-bcp', desde: '2026-11' }
  ];
  gasto(e, { cuenta: 't-bcp', monto: 1199, mon: 'USD', fecha: '2026-10-05', sub: 'c' });
  e.saltadas.push('d@2026-10');
  const p = L.subsPendientes(e, '2026-10-25');
  assert.deepEqual(p.map(x => x.sub.id), ['a', 'b']);
  assert.equal(p[0].vence, -5);
  assert.equal(p[1].vence, 2);
});

test('alcancía: total y racha de meses', () => {
  const e = base();
  e.alcancia = [
    { id: '1', monto: 10000, mon: 'PEN', fecha: '2026-08-28' },
    { id: '2', monto: 10000, mon: 'PEN', fecha: '2026-09-28' },
    { id: '3', monto: -5000, mon: 'PEN', fecha: '2026-10-02' }
  ];
  const a = L.alcancia(e, '2026-10-25');
  assert.equal(a.total.PEN, 15000);
  assert.equal(a.racha, 2);
});

test('validar conserva todo lo bien formado y descarta lo roto', () => {
  const e = L.demo('2026-10-25');
  const r = L.validar(JSON.parse(JSON.stringify(e)));
  assert.ok(r.ok);
  assert.equal(r.estado.movs.length, e.movs.length);
  assert.equal(r.estado.apuntes.length, e.apuntes.length);
  assert.deepEqual(r.estado.cuentas, e.cuentas);
  const roto = L.validar({ movs: [{ tipo: 'gasto', monto: -3, mon: 'PEN', fecha: 'x' }, null] });
  assert.ok(roto.ok);
  assert.equal(roto.estado.movs.length, 0);
  assert.equal(L.validar({}).ok, false);
});

test('parseMonto lee lo que se tipea en el iPhone', () => {
  assert.equal(L.parseMonto('12,50'), 1250);
  assert.equal(L.parseMonto('1,250'), 125000);
  assert.equal(L.parseMonto('S/ 44.90'), 4490);
  assert.equal(L.parseMonto('0'), null);
});

test('una devolución baja la tarjeta, lo gastado y la categoría', () => {
  const e = base();
  gasto(e, { cuenta: 't-scotia', monto: 20000, fecha: '2026-10-20', cat: 'c-ropa' });
  gasto(e, { cuenta: 't-scotia', monto: 5000, fecha: '2026-10-22', cat: 'c-ropa', tipo: 'devolucion' });
  const t = L.estadoTarjeta(e, L.cuentaDe(e, 't-scotia'), '2026-10-25');
  assert.equal(t.ciclo.PEN.total, 15000);
  assert.equal(t.deuda.PEN, 15000);
  const r = L.resumenMes(e, '2026-10');
  assert.equal(r.gastado, 15000);
  assert.equal(r.porCategoria[0].total, 15000);
  assert.equal(r.n, 1);
});

test('devolver algo de mamá baja lo que ella debe', () => {
  const e = base();
  gasto(e, { cuenta: 't-bcp', monto: 10000, fecha: '2026-10-24', ajeno: { persona: 'Mamá', monto: 10000 } });
  gasto(e, { cuenta: 't-bcp', monto: 4000, fecha: '2026-10-25', tipo: 'devolucion', ajeno: { persona: 'Mamá', monto: 4000 } });
  assert.equal(L.personas(e).find(p => p.clave === 'mamá').saldo.PEN, 6000);
  assert.equal(L.resumenMes(e, '2026-10').gastado, 0);
  assert.equal(L.saldos(e).debo.PEN, 6000);
});

test('una devolución a débito vuelve a la cuenta', () => {
  const e = base();
  gasto(e, { cuenta: 'k-bcp', medio: 'yape', monto: 3000, fecha: '2026-10-20' });
  gasto(e, { cuenta: 'k-bcp', monto: 3000, fecha: '2026-10-21', tipo: 'devolucion' });
  assert.equal(L.saldos(e).cuentas.find(c => c.id === 'k-bcp').saldo, 0);
});

test('lo que llevaba en el ciclo al empezar cuenta en el ciclo, no en lo facturado', () => {
  const e = base();
  const t = L.cuentaDe(e, 't-bcp');
  t.inicial = { PEN: 50000, USD: 0 };
  t.previo = { PEN: 12000, USD: 1000, fecha: '2026-10-25' };
  const r = L.estadoTarjeta(e, t, '2026-10-25');
  assert.equal(r.falta.PEN, 50000);
  assert.equal(r.ciclo.PEN.total, 12000);
  assert.equal(r.ciclo.USD.mio, 1000);
  assert.equal(L.saldos(e).debo.PEN, 62000);
  assert.equal(L.resumenMes(e, '2026-10').gastado, 0);
  // pasado el cierre del 20 nov, ese consumo pasa a ser lo facturado
  assert.equal(L.estadoTarjeta(e, t, '2026-11-25').falta.PEN, 62000);
});

test('buscar encuentra sin tildes ni mayúsculas, en todos los meses', () => {
  const e = base();
  gasto(e, { cuenta: 'k-bcp', monto: 1500, fecha: '2026-09-02', lugar: 'Starbucks Larcomar' });
  gasto(e, { cuenta: 'k-bcp', monto: 2000, fecha: '2026-10-02', nota: 'café STARBUCKS' });
  gasto(e, { cuenta: 'k-bcp', monto: 900, fecha: '2026-10-03', nota: 'Taxi', ajeno: { persona: 'Mamá', monto: 900 } });
  const r = L.buscar(e, 'starbucks');
  assert.equal(r.n, 2);
  assert.equal(r.total, 3500);
  assert.equal(r.dias[0].fecha, '2026-10-02');
  assert.equal(L.buscar(e, 'cafe').n, 1);
  assert.equal(L.buscar(e, 'mama').n, 1);
  assert.equal(L.buscar(e, '  ').n, 0);
});

test('validar conserva devoluciones, previo y la bienvenida', () => {
  const e = base();
  e.bienvenida = true;
  L.cuentaDe(e, 't-bcp').previo = { PEN: 100, USD: 0, fecha: '2026-10-25' };
  gasto(e, { cuenta: 't-bcp', monto: 100, fecha: '2026-10-25', tipo: 'devolucion', lugar: 'Zara' });
  const r = L.validar(JSON.parse(JSON.stringify(e))).estado;
  assert.equal(r.movs[0].tipo, 'devolucion');
  assert.equal(r.movs[0].lugar, 'Zara');
  assert.deepEqual(L.cuentaDe(r, 't-bcp').previo, { PEN: 100, USD: 0, fecha: '2026-10-25' });
  assert.equal(r.bienvenida, true);
  assert.equal(L.validar({ movs: [] }).estado.bienvenida, false);
});
