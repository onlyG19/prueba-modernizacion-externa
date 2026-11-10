/*
 * Íconos SVG propios (sin librería): son pocos y así no se suma una
 * dependencia. Son decorativos (`aria-hidden`): el texto que los acompaña es
 * el que da el nombre accesible.
 */

const PROPS_COMUNES = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

export function IconoVerificado() {
  return (
    <svg {...PROPS_COMUNES}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconoSalir() {
  return (
    <svg {...PROPS_COMUNES}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconoBuscar() {
  return (
    <svg {...PROPS_COMUNES}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
