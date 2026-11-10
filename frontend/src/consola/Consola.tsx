import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useSesion } from '../sesion/sesion-contexto';
import { RegistroUsuarios } from '../usuarios/RegistroUsuarios';
import { crearClienteConsultas } from './cliente-consultas';
import estilos from './Consola.module.css';
import { Encabezado } from './Encabezado';

/**
 * La consola completa, cargada de forma diferida tras iniciar sesión (ver
 * `cargar-consola.ts`): quien no ha ingresado no descarga este código.
 *
 * @remarks El cliente de consultas vive aquí: al cerrar sesión la consola se
 * desmonta y con ella se descarta la caché de datos de esa sesión.
 */
export default function Consola() {
  const { actions } = useSesion();
  const [clienteConsultas] = useState(() =>
    crearClienteConsultas(() => actions.cerrarSesion('expirada')),
  );

  return (
    <QueryClientProvider client={clienteConsultas}>
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <Encabezado />
      <main id="contenido" className={estilos.contenido} tabIndex={-1}>
        <RegistroUsuarios />
      </main>
    </QueryClientProvider>
  );
}
