import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// [ANTES] import { RedisModule } from './redis/redis.module';
import { RedisModule } from './infrastructure/redis/redis.module';
// [ANTES] import { LogoModule } from './logo/logo.module';
import { LogoModule } from './modules/logo/logo.module';
// [ANTES] import { UsuariosModule } from './usuarios/usuarios.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
// [ANTES] import { Usuario } from './usuarios/usuario.entity';
import { Usuario } from './modules/usuarios/entities/usuario.entity';
import { validateEnv } from './config/env.validation';
import { AppConfigService } from './config/app-config';

@Module({
  imports: [
    // [ANTES] ConfigModule.forRoot({ isGlobal: true }),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // [ANTES] useFactory: (config: ConfigService) => ({
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        // [ANTES] host: config.get<string>('DB_HOST', 'localhost'),
        host: config.get('DB_HOST', { infer: true }),
        // [ANTES] port: config.get<number>('DB_PORT', 5432),
        port: config.get('DB_PORT', { infer: true }),
        // [ANTES] username: config.get<string>('DB_USER', 'postgres'),
        username: config.get('DB_USER', { infer: true }),
        // [ANTES] password: config.get<string>('DB_PASSWORD', 'postgres'),
        password: config.get('DB_PASSWORD', { infer: true }),
        // [ANTES] database: config.get<string>('DB_NAME', 'prueba_modernizacion'),
        database: config.get('DB_NAME', { infer: true }),
        entities: [Usuario],
        synchronize: config.get<string>('NODE_ENV') !== 'production', // migraciones en producción
      }),
    }),
    RedisModule,
    LogoModule,
    UsuariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
