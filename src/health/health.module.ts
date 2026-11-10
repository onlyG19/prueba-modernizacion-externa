import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** `GET /health`: lo usan los healthchecks de Docker. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
