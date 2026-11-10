import { useMutation } from '@tanstack/react-query';
import { solicitarJson } from '../api/cliente';
import type { Cuenta, NuevaCuenta } from '../api/tipos';
import { useSesionActiva } from '../sesion/sesion-contexto';

/** Crea una cuenta. Solo el admin puede: a otro rol la API le responde 403. */
export function useCrearCuenta() {
  const { token } = useSesionActiva();
  return useMutation({
    mutationFn: (datos: NuevaCuenta) =>
      solicitarJson<Cuenta>('/cuentas', {
        metodo: 'POST',
        cuerpo: datos,
        token,
      }),
  });
}
