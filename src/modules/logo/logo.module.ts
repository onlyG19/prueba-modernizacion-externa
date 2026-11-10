import { Module } from '@nestjs/common';
import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';
import { VisitCounterService } from './visit-counter.service';

@Module({
  controllers: [LogoController],
  providers: [LogoService, VisitCounterService],
})
export class LogoModule {}
