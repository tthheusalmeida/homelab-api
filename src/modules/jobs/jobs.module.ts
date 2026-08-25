import { Module } from '@nestjs/common';

import { JobController } from './job.controller';
import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import { InMemoryJobRepository } from './infrastructure/repositories/in-memory-job.repository';
import { JOB_REPOSITORY } from './infrastructure/repositories/job.repository';

import { VideoModule } from '../video/video.module';
import { VideoTranscriptJobProcessor } from './processors/video-transcript/video-transcript-job.processor';

@Module({
  imports: [VideoModule],
  controllers: [JobController],

  providers: [
    JobService,
    JobRunner,

    VideoTranscriptJobProcessor,

    InMemoryJobRepository,

    {
      provide: JOB_REPOSITORY,
      useExisting: InMemoryJobRepository,
    },
  ],
})
export class JobsModule {}
