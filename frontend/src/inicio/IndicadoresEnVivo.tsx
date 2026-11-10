import { useEffect, useState } from 'react';
import { solicitarJson } from '../api/cliente';
import type { ConteoVisitas } from '../api/tipos';
import { IconoGrafico, IconoPulso } from '../ui/iconos';
import estilos from './IndicadoresEnVivo.module.css';

type Lectura =
  | { estado: 'cargando' }
  | { estado: 'lista'; visitas: number; hora: Date }
  | { estado: 'sin-contador'; hora: Date };

const FORMATO_NUMERO = new Intl.NumberFormat('es-CL');
/** 24 horas (`17:10`): el formato de 12 horas de es-CL termina en "p. m.". */
const FORMATO_HORA = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Cifras públicas que entrega la API en este momento. `GET /logo/visitas`
 * solo lee el contador (no suma una visita) y responde 503 si Redis no está.
 *
 * @remarks Un efecto con fetch, y no TanStack Query: el sitio público no
 * tiene cliente de consultas (vive en la consola) y es una sola lectura.
 */
export function IndicadoresEnVivo() {
  const [lectura, setLectura] = useState<Lectura>({ estado: 'cargando' });

  useEffect(() => {
    const control = new AbortController();
    solicitarJson<ConteoVisitas>('/logo/visitas', { signal: control.signal })
      .then(({ count }) =>
        setLectura({ estado: 'lista', visitas: count, hora: new Date() }),
      )
      .catch(() => {
        if (!control.signal.aborted) {
          setLectura({ estado: 'sin-contador', hora: new Date() });
        }
      });
    return () => control.abort();
  }, []);

  const cargando = lectura.estado === 'cargando';

  return (
    <div className={estilos.panel} aria-busy={cargando}>
      <ul role="list" className={estilos.indicadores}>
        <li className={estilos.indicador}>
          <span className={estilos.icono}>
            <IconoGrafico tamano={20} />
          </span>
          <div>
            <p className={estilos.etiqueta}>Visitas al logo</p>
            <p className={estilos.valor}>
              {lectura.estado === 'lista'
                ? FORMATO_NUMERO.format(lectura.visitas)
                : cargando
                  ? 'Contando…'
                  : 'Sin datos'}
            </p>
          </div>
        </li>
        <li className={estilos.indicador}>
          <span className={estilos.icono}>
            <IconoPulso tamano={20} />
          </span>
          <div>
            <p className={estilos.etiqueta}>Contador de visitas</p>
            <p className={estilos.valor}>
              {cargando
                ? 'Consultando…'
                : lectura.estado === 'lista'
                  ? 'En línea'
                  : 'No disponible'}
            </p>
          </div>
        </li>
      </ul>
      <p className={estilos.actualizado}>
        {lectura.estado === 'cargando'
          ? 'Consultando la API…'
          : `Actualizado a las ${FORMATO_HORA.format(lectura.hora)}.`}
      </p>
    </div>
  );
}
