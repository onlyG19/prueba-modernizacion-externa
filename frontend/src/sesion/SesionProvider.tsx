import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { solicitarJson } from '../api/cliente';
import type { Credenciales, TokenAcceso } from '../api/tipos';
import {
  borrarSesion,
  guardarSesion,
  leerSesion,
  type Sesion,
} from './almacen-sesion';
import { SesionContext, type MotivoCierre } from './sesion-contexto';

/** Máximo que acepta `setTimeout` (~24,8 días); más allá dispara de inmediato. */
const MAX_ESPERA = 2 ** 31 - 1;

export function SesionProvider({ children }: { children: ReactNode }) {
  // Inicialización perezosa: se lee el almacenamiento una sola vez.
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion());
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre | null>(null);

  const cerrarSesion = useCallback((motivo: MotivoCierre) => {
    borrarSesion();
    setSesion(null);
    setMotivoCierre(motivo);
  }, []);

  const iniciarSesion = useCallback(async (credenciales: Credenciales) => {
    const { accessToken, expiresIn, rol } = await solicitarJson<TokenAcceso>(
      '/auth/login',
      { metodo: 'POST', cuerpo: credenciales },
    );
    const nueva: Sesion = {
      token: accessToken,
      usuario: credenciales.username,
      rol,
      expiraEn: Date.now() + expiresIn * 1000,
    };
    guardarSesion(nueva);
    setMotivoCierre(null);
    setSesion(nueva);
  }, []);

  // Cierra la sesión justo cuando el token expira, aunque no haya actividad.
  const expiraEn = sesion?.expiraEn;
  useEffect(() => {
    if (expiraEn === undefined) {
      return;
    }
    const espera = Math.min(Math.max(0, expiraEn - Date.now()), MAX_ESPERA);
    const temporizador = window.setTimeout(
      () => cerrarSesion('expirada'),
      espera,
    );
    return () => window.clearTimeout(temporizador);
  }, [expiraEn, cerrarSesion]);

  const valor = useMemo(
    () => ({
      state: { sesion, motivoCierre },
      actions: { iniciarSesion, cerrarSesion },
    }),
    [sesion, motivoCierre, iniciarSesion, cerrarSesion],
  );

  return <SesionContext value={valor}>{children}</SesionContext>;
}
