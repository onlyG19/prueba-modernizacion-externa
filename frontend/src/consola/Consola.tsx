import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PaginaCuentas } from '../cuentas/PaginaCuentas';
import { Enlace } from '../rutas/Enlace';
import { useRuta } from '../rutas/navegacion';
import { RUTAS } from '../rutas/rutas';
import { useSesion } from '../sesion/sesion-contexto';
import { PaginaUsuarios } from '../usuarios/PaginaUsuarios';
import { crearClienteConsultas } from './cliente-consultas';
import estilos from './Consola.module.css';
import { Encabezado } from './Encabezado';
import { CONSERVAR_FOCO } from './foco';
import { NavegacionLateral } from './NavegacionLateral';
import { Resumen } from './Resumen';

/** La página del panel que corresponde a la ruta. */
function paginaDe(ruta: string): ReactNode {
  switch (ruta) {
    case RUTAS.panel:
      return <Resumen />;
    // Misma página para ambas pestañas: React la conserva al cambiar de una a
    // otra (con su estado), y solo cambia el contenido de la pestaña.
    case RUTAS.usuarios:
      return <PaginaUsuarios seccion="tabla" />;
    case RUTAS.registrarUsuario:
      return <PaginaUsuarios seccion="registrar" />;
    case RUTAS.cuentas:
      return <PaginaCuentas seccion="tabla" />;
    case RUTAS.crearCuenta:
      return <PaginaCuentas seccion="crear" />;
    default:
      return <SeccionNoEncontrada />;
  }
}

/**
 * La consola completa, cargada de forma diferida tras iniciar sesión (ver
 * `cargar-consola.ts`): quien no ha ingresado no descarga este código.
 *
 * @remarks El cliente de consultas vive aquí: al cerrar sesión la consola se
 * desmonta y con ella se descarta la caché de datos de esa sesión.
 */
export default function Consola() {
  const { actions } = useSesion();
  const ruta = useRuta();
  const [clienteConsultas] = useState(() =>
    crearClienteConsultas(() => actions.cerrarSesion('expirada')),
  );
  const refContenido = useRef<HTMLElement>(null);
  const rutaAnterior = useRef(ruta);

  // Al cambiar de página, el foco va a su título: el lector de pantalla
  // anuncia dónde se está y el teclado sigue desde ahí. Las pestañas son la
  // excepción: el foco se queda en la pestaña elegida, como se espera de ellas.
  useEffect(() => {
    if (rutaAnterior.current === ruta) {
      return;
    }
    rutaAnterior.current = ruta;
    if (document.activeElement?.closest(`[${CONSERVAR_FOCO}]`)) {
      return;
    }
    const titulo = refContenido.current?.querySelector<HTMLElement>('h1');
    (titulo ?? refContenido.current)?.focus({ preventScroll: true });
  }, [ruta]);

  return (
    <QueryClientProvider client={clienteConsultas}>
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <div className={estilos.consola}>
        <Encabezado />
        <NavegacionLateral />
        <main
          id="contenido"
          ref={refContenido}
          className={estilos.contenido}
          tabIndex={-1}
        >
          {paginaDe(ruta)}
        </main>
      </div>
    </QueryClientProvider>
  );
}

function SeccionNoEncontrada() {
  return (
    <div className={estilos.noEncontrada}>
      <title>Sección no encontrada – Consola de usuarios</title>
      <h1 tabIndex={-1}>Esta sección no existe</h1>
      <p>Revisa el enlace o vuelve al resumen del panel.</p>
      <Enlace href={RUTAS.panel}>Ir al resumen</Enlace>
    </div>
  );
}
