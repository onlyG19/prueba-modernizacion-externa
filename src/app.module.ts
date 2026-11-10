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
import { AuthModule } from './modules/auth/auth.module';
// [ANTES] import { Usuario } from './modules/usuarios/entities/usuario.entity';
import { validateEnv } from './config/env.validation';
import { AppConfigService } from './config/app-config';
import { buildDataSourceOptions } from './infrastructure/database/database.options';

@Module({
  imports: [
    // [ANTES] ConfigModule.forRoot({ isGlobal: true }),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // [ANTES] useFactory: (config: ConfigService) => ({
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
