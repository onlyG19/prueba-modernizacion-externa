import { useState } from 'react';
import type { Usuario } from '../api/tipos';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { clases } from '../ui/clases';
import { IconoVerificado } from '../ui/iconos';
import { FormularioCrearUsuario } from './formulario/FormularioCrearUsuario';
import estilos from './RegistrarUsuario.module.css';
import { formatearRutParcial } from './rut/formato-rut';

interface Props {
  onRegistrado: (usuario: Usuario) => void;
}

/** La tabla filtrada por un RUT: el recién registrado queda a la vista seguro. */
function enlaceEnLaTabla(usuario: Usuario): string {
  const parametros = new URLSearchParams({
    buscar: formatearRutParcial(usuario.rut),
  });
  return `${RUTAS.usuarios}?${parametros}`;
}

/** Pestaña de registro: el formulario y, al lado, qué esperar al usarlo. */
export function RegistrarUsuario({ onRegistrado }: Props) {
  const [ultimo, setUltimo] = useState<Usuario | null>(null);

  return (
    <div className={estilos.registrar}>
      <FormularioCrearUsuario
        onRegistrado={(usuario) => {
          setUltimo(usuario);
          onRegistrado(usuario);
        }}
      />

      <div className={estilos.lateral}>
        {ultimo ? (
          <section
            className={clases(estilos.tarjeta, estilos.ultimo)}
            aria-labelledby="titulo-ultimo-registrado"
          >
            <h2 id="titulo-ultimo-registrado" className={estilos.titulo}>
              <IconoVerificado />
              Último registrado
            </h2>
            <p className={estilos.nombre}>{ultimo.nombre}</p>
            <p className={clases(estilos.rut, 'cifras')} translate="no">
              {formatearRutParcial(ultimo.rut)}
            </p>
            <Enlace href={enlaceEnLaTabla(ultimo)} className={estilos.enlace}>
              Verlo en la tabla
            </Enlace>
          </section>
        ) : null}

        <section
          className={estilos.tarjeta}
          aria-labelledby="titulo-antes-de-registrar"
        >
          <h2 id="titulo-antes-de-registrar" className={estilos.titulo}>
            Antes de registrar
          </h2>
          <ul className={estilos.consejos}>
            <li>
              Escribe el RUT con su dígito verificador; los puntos y el guion se
              agregan solos.
            </li>
            <li>Si el dígito no corresponde, te decimos cuál debería ser.</li>
            <li>
              Cada RUT se registra una sola vez: si ya existe, te avisamos.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
