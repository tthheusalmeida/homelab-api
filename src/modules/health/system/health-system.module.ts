import { Module } from '@nestjs/common';
import { HealthSystemService } from './health-system.service.js';
import { HealthSystemController } from './health-system.controller.js';

@Module({
  controllers: [HealthSystemController],
  providers: [HealthSystemService],
})
export class HealthSystemModule {}
