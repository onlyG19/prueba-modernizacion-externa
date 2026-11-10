import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import { Cuenta } from './entities/cuenta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cuenta])],
  controllers: [CuentasController],
  providers: [CuentasService],
  // El login (AuthModule) busca las cuentas para verificar sus credenciales.
  exports: [CuentasService],
})
export class CuentasModule {}
