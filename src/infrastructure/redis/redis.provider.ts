import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  // [ANTES] useFactory: (): Redis => {
  useFactory: (config: AppConfigService): Redis => {
    return new Redis({
      // [ANTES] host: process.env.REDIS_HOST ?? 'localhost',
      host: config.get('REDIS_HOST', { infer: true }),
      // [ANTES] port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      port: config.get('REDIS_PORT', { infer: true }),
    });
  },
};
