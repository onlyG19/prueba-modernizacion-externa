import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';

/** Clave de Redis donde se acumulan las visitas al logo. */
export const VISIT_COUNTER_KEY = 'logo:request:count';

/**
 * Cuenta las visitas al logo en Redis.
 *
 * @remarks
 * Se separó de `LogoService` para que cada servicio tenga una sola
 * responsabilidad: uno sirve la imagen y el otro lleva la métrica.
 */
@Injectable()
export class VisitCounterService {
  private readonly logger = new Logger(VisitCounterService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Registra una visita y devuelve el total acumulado.
   *
   * @returns El total, o `null` si Redis no está disponible.
   * @remarks Nunca lanza: el contador es secundario y su falla no debe impedir
   *   que se sirva el logo.
   */
  async increment(): Promise<number | null> {
    try {
      return await this.redis.incr(VISIT_COUNTER_KEY);
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar la visita: ${errorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Devuelve el total de visitas (0 si todavía no hay ninguna).
   *
   * @throws ServiceUnavailableException Si Redis no está disponible (503): este
   *   endpoint no tiene nada que responder sin Redis.
   */
  async getCount(): Promise<number> {
    try {
      const value = await this.redis.get(VISIT_COUNTER_KEY);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.warn(`No se pudo leer el contador: ${errorMessage(error)}`);
      throw new ServiceUnavailableException(
        'El contador de visitas no está disponible',
      );
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
