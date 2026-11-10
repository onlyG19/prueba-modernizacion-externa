import { lazy, Suspense } from 'react';
import { cargarConsola } from './consola/cargar-consola';
import { PantallaLogin } from './sesion/PantallaLogin';
import { useSesion } from './sesion/sesion-contexto';
import { PantallaCarga } from './ui/PantallaCarga';

const Consola = lazy(cargarConsola);

/** Sin sesión, el login; con sesión, la consola (cargada bajo demanda). */
export function App() {
  const { state } = useSesion();

  return state.sesion ? (
    <Suspense fallback={<PantallaCarga />}>
      <Consola />
    </Suspense>
  ) : (
    <PantallaLogin />
  );
}
