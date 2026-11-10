import { useState } from 'react';
import type { Cuenta } from '../api/tipos';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { clases } from '../ui/clases';
import { IconoVerificado } from '../ui/iconos';
import estilos from './CrearCuenta.module.css';
import { FormularioCrearCuenta } from './FormularioCrearCuenta';

interface Props {
  onCreada: (cuenta: Cuenta) => void;
}

/** La tabla filtrada por su usuario: la recién creada queda a la vista seguro. */
function enlaceEnLaTabla(cuenta: Cuenta): string {
  const parametros = new URLSearchParams({ buscar: cuenta.username });
  return `${RUTAS.cuentas}?${parametros}`;
}

/** Pestaña "Crear cuenta": el formulario y, al lado, qué esperar al usarlo. */
export function CrearCuenta({ onCreada }: Props) {
  const [ultima, setUltima] = useState<Cuenta | null>(null);

  return (
    <div className={estilos.contenido}>
      <FormularioCrearCuenta
        onCreada={(cuenta) => {
          setUltima(cuenta);
          onCreada(cuenta);
        }}
      />

      <div className={estilos.lateral}>
        {ultima ? (
          <section
            className={clases(estilos.tarjeta, estilos.ultima)}
            aria-labelledby="titulo-ultima-cuenta"
          >
            <h2 id="titulo-ultima-cuenta" className={estilos.subtitulo}>
              <IconoVerificado />
              Cuenta creada
            </h2>
            <p className={estilos.usuario} translate="no">
              {ultima.username}
            </p>
            <p className={estilos.nota}>
              Entrégale a la persona su usuario y su contraseña por un canal
              seguro: ya puede ingresar.
            </p>
            <Enlace href={enlaceEnLaTabla(ultima)} className={estilos.enlace}>
              Verla en la tabla
            </Enlace>
          </section>
        ) : null}

        <section
          className={estilos.tarjeta}
          aria-labelledby="titulo-antes-de-crear"
        >
          <h2 id="titulo-antes-de-crear" className={estilos.subtitulo}>
            Antes de crear una cuenta
          </h2>
          <ul className={estilos.consejos}>
            <li>
              Quien ingrese con ella podrá ver, registrar, editar y eliminar
              usuarios, pero no ver ni crear cuentas.
            </li>
            <li>El usuario se guarda en minúsculas y no se puede repetir.</li>
            <li>Una cuenta por persona: no compartas la misma entre varias.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
