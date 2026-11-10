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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'prueba_modernizacion'),
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
