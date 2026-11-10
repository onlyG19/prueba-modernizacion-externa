/*
 * Ilustraciones de los pasos de "Así funciona": trazos con el degradado de la
 * marca sobre un relleno tenue, en la línea de las ilustraciones de uno.cl.
 * Son decorativas: el paso ya se describe con su título y su texto.
 */
import { useId, type ReactNode } from 'react';

function Lienzo({ children }: { children: (trazo: string) => ReactNode }) {
  const id = useId();
  return (
    <svg
      width="112"
      height="112"
      viewBox="0 0 64 64"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* En coordenadas del lienzo: todas las figuras comparten un mismo degradado. */}
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
        >
          <stop offset="0" stopColor="#f833b8" />
          <stop offset="1" stopColor="#8e3fd0" />
        </linearGradient>
      </defs>
      {children(`url(#${id})`)}
    </svg>
  );
}

const RELLENO = '#fbe3f3';

/** Una puerta con una flecha que entra: iniciar sesión. */
export function IlustracionIngresar() {
  return (
    <Lienzo>
      {(trazo) => (
        <>
          <rect
            x="30"
            y="8"
            width="24"
            height="48"
            rx="4"
            fill={RELLENO}
            stroke={trazo}
          />
          <circle cx="36" cy="33" r="1.8" fill={trazo} stroke="none" />
          <path d="M8 32h28M27 23l9 9-9 9" stroke={trazo} />
        </>
      )}
    </Lienzo>
  );
}

/** Una credencial con su RUT y un sello de verificado: registrar. */
export function IlustracionRegistrar() {
  return (
    <Lienzo>
      {(trazo) => (
        <>
          <rect
            x="6"
            y="14"
            width="44"
            height="32"
            rx="5"
            fill={RELLENO}
            stroke={trazo}
          />
          <circle cx="18" cy="27" r="5" stroke={trazo} />
          <path
            d="M11 39c1.5-3.5 4-5 7-5s5.5 1.5 7 5M30 25h12M30 32h8"
            stroke={trazo}
          />
          <circle cx="48" cy="44" r="10" fill="#fff" stroke={trazo} />
          <path d="m43.5 44 3 3 6-6" stroke={trazo} />
        </>
      )}
    </Lienzo>
  );
}

/** Una tabla con un lápiz encima: buscar y editar. */
export function IlustracionGestionar() {
  return (
    <Lienzo>
      {(trazo) => (
        <>
          <rect
            x="6"
            y="10"
            width="40"
            height="40"
            rx="5"
            fill={RELLENO}
            stroke={trazo}
          />
          <path d="M6 22h40M6 34h40M20 22v28" stroke={trazo} />
          <path
            d="M52 26a4 4 0 0 1 5.6 5.6L40 49.2 33 51l1.8-7Z"
            fill="#fff"
            stroke={trazo}
          />
        </>
      )}
    </Lienzo>
  );
}
