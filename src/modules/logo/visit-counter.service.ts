import { Inject, Injectable } from '@nestjs/common';
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
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Registra una visita y devuelve el total acumulado. */
  async increment(): Promise<number> {
    return this.redis.incr(VISIT_COUNTER_KEY);
  }

  /** Devuelve el total de visitas (0 si todavía no hay ninguna). */
  async getCount(): Promise<number> {
    const value = await this.redis.get(VISIT_COUNTER_KEY);
    return value ? parseInt(value, 10) : 0;
  }
}
