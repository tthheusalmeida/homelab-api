import { Module } from '@nestjs/common';
import { HealthSystemModule } from './modules/health/system/health-system.module';

@Module({
  imports: [HealthSystemModule],
  providers: [],
})
export class AppModule {}
