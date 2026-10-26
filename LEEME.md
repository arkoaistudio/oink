# Oink

App de finanzas para Andrea, en el celular: gastos, tarjetas de crédito con su ciclo,
lo que gasta por otras personas, topes, suscripciones y alcancía, en soles y dólares.
Es una página que se instala como app (PWA), hermana de `jc\finanzas`. No tiene
servidor ni cuentas: **los datos viven solo en su celular**.

## Archivos

- `index.html`, `estilo.css`: la página y el estilo (crema, manchas pastel, chanchito).
- `logica.js`: montos, fechas, tarjetas, resúmenes y respaldo. Sin nada de pantalla.
- `app.js`: las pantallas y los formularios.
- `sw.js`: deja la app funcionando sin internet.
- `manifest.webmanifest`, `iconos/`: lo que la hace instalable.
- `pruebas/`: pruebas de la lógica y el servidor local.

## Verla en la PC

    node pruebas/servidor.js

Y abrir http://127.0.0.1:8378/?demo (`?demo` carga datos de muestra y no guarda nada).

## Pruebas

    node --test pruebas/logica.test.js

## Cómo funciona

- **Cuentas de débito** (BCP, Scotiabank, Efectivo): saldo = inicial + ingresos − gastos ± pagos.
  Al editar una cuenta se escribe el saldo de hoy y la app ajusta el inicial.
- **Yape y Plin** son botones rápidos: el gasto sale de la cuenta que tengan asignada
  (Yape → BCP, Plin → Scotiabank; se cambia en Ajustes) y guarda `medio` para las stats.
- **Tarjetas de crédito**: la deuda va por moneda (S/ y US$). Cada tarjeta tiene día de
  cierre y de pago (el pago es del mes siguiente) y, además, `fechas` exactas que mandan
  sobre las de siempre. La BCP trae las de 2026 de la tabla del banco (`FECHAS_BCP_2026`);
  las de 2027 se agregan en la tarjeta → Fechas que da el banco. Scotiabank: cierre 18, pago 15.
  `estadoTarjeta` separa el estado de cuenta (cerrado) del ciclo actual; los pagos bajan
  primero lo más viejo.
- **Gastos de otra persona** (`ajeno`): la tarjeta o la cuenta paga todo, pero solo
  `monto − ajeno.monto` cuenta para los topes y las stats. Crea solo un apunte "me debe"
  en Personas (`sincronizarAjeno`). Borrar el gasto borra el apunte; los pagos no.
- **Suscripciones**: el día del cobro (y 3 días antes) aparecen en Inicio para confirmar,
  cambiar el monto o saltar ese mes (`saltadas`). Confirmar crea el gasto con `sub`.
- **Devoluciones** (`tipo: 'devolucion'`): resta de la tarjeta (o vuelve a la cuenta), de lo
  gastado y de su categoría. Si era de otra persona, baja lo que esa persona debe. Se anota
  desde el + (Devolución) o desde un gasto ya anotado con "Devolví esto".
- **Buscador** (Gastos): busca en todos los meses por nota, lugar, categoría, persona o con qué
  se pagó, sin mirar tildes ni mayúsculas (`buscar`).
- **Bienvenida**: sale la primera vez (`bienvenida: false`) y pide saldos de las cuentas, lo
  facturado y lo que ya lleva cada tarjeta, suscripciones y topes. Lo que ya llevaba en el ciclo
  se guarda en `previo` de la tarjeta (cuenta como consumo suyo de ese día, sin entrar a las stats).
  Se repite desde Ajustes → Configurar de nuevo, sin borrar nada.
- **Alcancía**: plata apartada que no sale de ninguna cuenta. Racha = meses seguidos con aporte.
- **Recordatorio diario**: no hay notificaciones (no hay servidor). En Ajustes se explica
  cómo crear un recordatorio diario en la app Recordatorios del iPhone.

## Instalarla en el iPhone

Tiene que estar publicada con https (GitHub Pages sirve y es gratis).

1. Abrir la dirección en **Safari**.
2. Compartir → **Agregar a pantalla de inicio**.
3. Abrirla siempre desde ese ícono. Safari y la app instalada guardan datos por separado.

## Al publicar cambios

- Subir el número de `CACHE` en `sw.js`. En el celular el cambio aparece la segunda vez que se abre.
- Si cambia algo del formato de los datos, subir `VERSION` en `logica.js` y migrar en `validar`.
- El ícono sale de `iconos/icono.html` capturado a 1024 px y reducido a 180, 192 y 512.
