import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { RedisModule } from './infrastructure/redis/redis.module';
import { LogoModule } from './modules/logo/logo.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { CuentasModule } from './modules/cuentas/cuentas.module';
import { HealthModule } from './health/health.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { validateEnv } from './config/env.validation';
import { LIMITE_GENERAL, MENSAJE_LIMITE } from './config/limites';
import { AppConfigService } from './config/app-config';
import { buildDataSourceOptions } from './infrastructure/database/database.options';
import { crearOpcionesLog } from './infrastructure/logging/logger.options';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Logs estructurados (JSON) con un id por petición; ver logger.options.ts.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: crearOpcionesLog({
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
          LOG_LEVEL: config.get('LOG_LEVEL', { infer: true }),
        }),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ...LIMITE_GENERAL }],
      errorMessage: MENSAJE_LIMITE,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: AppConfigService) =>
        buildDataSourceOptions({
          DB_HOST: config.get('DB_HOST', { infer: true }),
          DB_PORT: config.get('DB_PORT', { infer: true }),
          DB_USER: config.get('DB_USER', { infer: true }),
          DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
          DB_NAME: config.get('DB_NAME', { infer: true }),
        }),
    }),
    RedisModule,
    LogoModule,
    UsuariosModule,
    AuthModule,
    CuentasModule,
    HealthModule,
  ],
  // Sin controlador raíz: el "Hello World" de la plantilla de Nest no aportaba
  // nada, y para saber si la API está viva existe GET /health.
  providers: [
    // Todas las respuestas de error en formato Problem Details (RFC 9457).
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    // Límite de peticiones por IP en toda la API (ver config/limites.ts).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
