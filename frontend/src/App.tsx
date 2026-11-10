import { lazy, Suspense } from 'react';
import { cargarConsola } from './consola/cargar-consola';
import { PaginaInicio } from './inicio/PaginaInicio';
import { PaginaNoEncontrada } from './inicio/PaginaNoEncontrada';
import { Redirigir } from './rutas/Enlace';
import { leerParametro, useRuta } from './rutas/navegacion';
import {
  destinoTrasIngresar,
  esRutaDelPanel,
  PARAMETRO_VOLVER,
  RUTAS,
  rutaIngresarVolviendoA,
} from './rutas/rutas';
import { PantallaLogin } from './sesion/PantallaLogin';
import { useSesion } from './sesion/sesion-contexto';
import { PantallaCarga } from './ui/PantallaCarga';

const Consola = lazy(cargarConsola);

// [ANTES] /** Sin sesión, el login; con sesión, la consola (cargada bajo demanda). */
/**
 * Decide qué página mostrar según la ruta y la sesión:
 *
 * - `/`: el sitio de inicio, público.
 * - `/ingresar`: el login; con sesión iniciada, redirige al panel.
 * - `/panel/…`: la consola (cargada bajo demanda); sin sesión, redirige al
 *   login recordando a qué página se quería entrar.
 */
export function App() {
  const { state } = useSesion();
  const ruta = useRuta();
  const conSesion = state.sesion !== null;

  // [ANTES] return state.sesion ? (
  // [ANTES]   <Suspense fallback={<PantallaCarga />}>
  // [ANTES]     <Consola />
  // [ANTES]   </Suspense>
  // [ANTES] ) : (
  // [ANTES]   <PantallaLogin />
  // [ANTES] );
  if (ruta === RUTAS.inicio) {
    return <PaginaInicio />;
  }

  if (ruta === RUTAS.ingresar) {
    return conSesion ? (
      <Redirigir a={destinoTrasIngresar(leerParametro(PARAMETRO_VOLVER))} />
    ) : (
      <PantallaLogin />
    );
  }

  if (esRutaDelPanel(ruta)) {
    if (!conSesion) {
      // Entró por un enlace directo o la sesión expiró: tras ingresar, vuelve
      // a la misma página, con su búsqueda.
      return (
        <Redirigir a={rutaIngresarVolviendoA(ruta + window.location.search)} />
      );
    }
    return (
      <Suspense fallback={<PantallaCarga />}>
        <Consola />
      </Suspense>
    );
  }

  return <PaginaNoEncontrada />;
}
