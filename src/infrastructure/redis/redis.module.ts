import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisProvider } from './redis.provider';

@Global()
@Module({
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Cierra la conexión con Redis cuando la app se apaga.
   *
   * @remarks
   * Nest solo llama a este hook ante SIGTERM/SIGINT si en `main.ts` se activó
   * `app.enableShutdownHooks()`. `quit()` espera a que terminen los comandos
   * en curso; si la conexión ya estaba caída, falla y se corta de inmediato.
   */
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
