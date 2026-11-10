/*
 * Fechas de la API (ISO 8601, en UTC) mostradas en la hora local de quien
 * mira. Los formateadores se crean una vez: crearlos es caro.
 */
// `dateStyle: 'medium'` en es-CL da "10-11-2026": se pide el mes en palabras.
const FECHA = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
// 24 horas, como se lee la hora en Chile ("a las 09:00", no "9:00 a. m.").
const FECHA_Y_HORA = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'long',
  timeStyle: 'short',
  hourCycle: 'h23',
});

/** `10 nov 2026`: para columnas y listas, donde el espacio es poco. */
export function formatearFecha(iso: string): string {
  return FECHA.format(new Date(iso));
}

/** `10 de noviembre de 2026 a las 09:00`: para un detalle, donde sobra espacio. */
export function formatearFechaYHora(iso: string): string {
  return FECHA_Y_HORA.format(new Date(iso));
}
