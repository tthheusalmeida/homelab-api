import { Module } from '@nestjs/common';

import { JobController } from './job.controller';
import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import { InMemoryJobRepository } from './infrastructure/repositories/in-memory-job.repository';
import { JOB_REPOSITORY } from './infrastructure/repositories/job.repository';

import { AIModule } from '../ai/ai.module';
import { VideoModule } from '../video/video.module';
import { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/video-to-transcript-job.processor';

@Module({
  imports: [VideoModule, AIModule],
  controllers: [JobController],

  providers: [
    JobService,
    JobRunner,

    VideoToTranscriptJobProcessor,

    InMemoryJobRepository,

    {
      provide: JOB_REPOSITORY,
      useExisting: InMemoryJobRepository,
    },
  ],
})
export class JobsModule {}
