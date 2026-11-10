import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: AppConfigService): Redis => {
    const client = new Redis({
      host: config.get('REDIS_HOST', { infer: true }),
      port: config.get('REDIS_PORT', { infer: true }),
      // Vacía equivale a "sin contraseña" (Redis sin requirepass).
      password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
      // Falla rápido si Redis no está disponible, en vez de encolar el comando
      // y dejar la request esperando mientras ioredis reintenta conectarse.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    logConnectionChanges(client);
    return client;
  },
};

/**
 * Registra en el log los cambios de estado de la conexión con Redis, una sola
 * vez por cambio.
 *
 * @remarks
 * Sin un listener de `error`, ioredis imprime "Unhandled error event" en cada
 * reintento de conexión. Aquí se registra solo la primera falla y la
 * recuperación, para no inundar el log.
 *
 * @param client - Cliente de Redis a observar.
 * @param logger - Logger donde registrar los cambios.
 */
export function logConnectionChanges(
  client: Redis,
  logger: Pick<Logger, 'warn' | 'log'> = new Logger('Redis'),
): void {
  let available = true;

  client.on('error', (error: NodeJS.ErrnoException) => {
    if (available) {
      available = false;
      const detail = error.message || error.code || error.name;
      logger.warn(`Conexión con Redis perdida: ${detail}`);
    }
  });

  client.on('ready', () => {
    if (!available) {
      available = true;
      logger.log('Conexión con Redis restablecida');
    }
  });
}
