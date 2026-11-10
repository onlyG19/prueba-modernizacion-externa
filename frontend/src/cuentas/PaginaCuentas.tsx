import { useState } from 'react';
import type { Cuenta } from '../api/tipos';
import { Enlace } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { useSesionActiva } from '../sesion/sesion-contexto';
import { clases } from '../ui/clases';
import { IconoCandado, IconoVerificado } from '../ui/iconos';
import { FormularioCrearCuenta } from './FormularioCrearCuenta';
import estilos from './PaginaCuentas.module.css';

/**
 * Página de cuentas: el administrador crea aquí las cuentas con que otras
 * personas ingresan a la consola (con rol operador).
 *
 * @remarks Un operador no ve el enlace en la barra lateral, pero puede llegar
 * por la URL: se le explica que la sección es del administrador. Aunque
 * enviara el formulario igual, la API le respondería 403.
 */
export function PaginaCuentas() {
  const { rol } = useSesionActiva();
  const [ultima, setUltima] = useState<Cuenta | null>(null);

  return (
    <div className={estilos.pagina}>
      <title>Cuentas – Consola de usuarios</title>
      <div>
        <h1 tabIndex={-1} className={estilos.titulo}>
          Cuentas
        </h1>
        <p className={estilos.bajada}>
          Quién puede ingresar a la consola, además del administrador.
        </p>
      </div>

      {rol === 'admin' ? (
        <div className={estilos.contenido}>
          <FormularioCrearCuenta onCreada={setUltima} />

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
                  usuarios, pero no crear cuentas.
                </li>
                <li>
                  El usuario se guarda en minúsculas y no se puede repetir.
                </li>
                <li>
                  Una cuenta por persona: no compartas la misma entre varias.
                </li>
              </ul>
            </section>
          </div>
        </div>
      ) : (
        <section
          className={estilos.sinPermiso}
          aria-labelledby="titulo-sin-permiso"
        >
          <IconoCandado tamano={28} />
          <div>
            <h2 id="titulo-sin-permiso" className={estilos.subtitulo}>
              Esta sección es del administrador
            </h2>
            <p className={estilos.nota}>
              Solo el administrador puede crear cuentas: si alguien necesita
              una, pídela a quien administra la consola.
            </p>
            <Enlace href={RUTAS.panel} className={estilos.enlace}>
              Ir al resumen
            </Enlace>
          </div>
        </section>
      )}
    </div>
  );
}
