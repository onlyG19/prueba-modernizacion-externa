import { useState } from 'react';
import type { Usuario } from '../api/tipos';
import { CONSERVAR_FOCO } from '../consola/foco';
import { EnlaceNav } from '../rutas/Enlace';
import { RUTAS } from '../rutas/rutas';
import { IconoAgregarUsuario, IconoTabla } from '../ui/iconos';
import estilos from './PaginaUsuarios.module.css';
import { RegistrarUsuario } from './RegistrarUsuario';
import { TablaUsuarios } from './TablaUsuarios';

interface Props {
  seccion: 'tabla' | 'registrar';
}

const TITULOS: Record<Props['seccion'], string> = {
  tabla: 'Tabla de usuarios – Consola de usuarios',
  registrar: 'Registrar usuario – Consola de usuarios',
};

/**
 * La página de usuarios, con dos pestañas: la tabla y el registro.
 *
 * @remarks Cada pestaña es una ruta (se puede enlazar, recargar o volver
 * atrás), así que son enlaces con `aria-current`, no un `role="tablist"`: ese
 * patrón es para paneles que cambian dentro de una misma página.
 */
export function PaginaUsuarios({ seccion }: Props) {
  // Sobrevive al cambio de pestaña: tras registrar a alguien, la tabla lo
  // destaca al llegar a ella.
  const [idResaltado, setIdResaltado] = useState<Usuario['id'] | null>(null);

  return (
    <div className={estilos.pagina}>
      <title>{TITULOS[seccion]}</title>
      <div>
        <h1 tabIndex={-1} className={estilos.titulo}>
          Usuarios
        </h1>
        <p className={estilos.bajada}>
          Las personas registradas, con su nombre y su RUT.
        </p>
      </div>

      <nav
        aria-label="Secciones de usuarios"
        className={estilos.pestanas}
        {...{ [CONSERVAR_FOCO]: true }}
      >
        <EnlaceNav href={RUTAS.usuarios} className={estilos.pestana}>
          <IconoTabla />
          Tabla de usuarios
        </EnlaceNav>
        <EnlaceNav href={RUTAS.registrarUsuario} className={estilos.pestana}>
          <IconoAgregarUsuario />
          Registrar usuario
        </EnlaceNav>
      </nav>

      {seccion === 'tabla' ? (
        <TablaUsuarios idResaltado={idResaltado} />
      ) : (
        <RegistrarUsuario
          onRegistrado={(usuario) => setIdResaltado(usuario.id)}
        />
      )}
    </div>
  );
}
