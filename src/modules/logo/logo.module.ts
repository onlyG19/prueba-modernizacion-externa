import { Module } from '@nestjs/common';
import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';

@Module({
  controllers: [LogoController],
  providers: [LogoService],
})
export class LogoModule {}
