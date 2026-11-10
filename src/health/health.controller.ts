import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';
import { REDIS_CLIENT } from '../infrastructure/redis/redis.provider';
import {
  HealthStatusDto,
  type DependencyStatus,
} from './dto/health-status.dto';

/** Tiempo máximo de cada verificación: un healthcheck nunca debe colgarse. */
export const PROBE_TIMEOUT_MS = 3000;

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Estado de la API y de sus dependencias, para healthchecks (Docker,
   * balanceadores de carga).
   *
   * @remarks Sin base de datos la API no puede operar: responde 503. Sin Redis
   * solo se pierde el contador de visitas: responde 200 con `degraded`, para
   * que un orquestador no reinicie una API que sigue funcionando.
   */
  @ApiOkResponse({ type: HealthStatusDto })
  @ApiServiceUnavailableResponse({
    description: 'La base de datos no responde',
    type: HealthStatusDto,
  })
  @Get()
  async check(): Promise<HealthStatusDto> {
    // Independientes entre sí: se verifican en paralelo.
    const [database, redis] = await Promise.all([
      probe(() => this.dataSource.query('SELECT 1')),
      probe(() => this.redis.ping()),
    ]);

    const salud: HealthStatusDto = {
      status: overallStatus(database, redis),
      database,
      redis,
    };
    if (salud.status === 'error') {
      throw new ServiceUnavailableException(salud);
    }
    return salud;
  }
}

function overallStatus(
  database: DependencyStatus,
  redis: DependencyStatus,
): HealthStatusDto['status'] {
  if (database === 'down') {
    return 'error';
  }
  return redis === 'down' ? 'degraded' : 'ok';
}

/** Ejecuta una verificación con tiempo máximo; cualquier falla cuenta como `down`. */
async function probe(check: () => Promise<unknown>): Promise<DependencyStatus> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error('Tiempo de espera agotado')),
      PROBE_TIMEOUT_MS,
    );
  });
  try {
    await Promise.race([check(), limite]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(temporizador);
  }
}
