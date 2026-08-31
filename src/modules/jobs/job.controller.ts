import { ApiBody } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Job } from './domain/job.entity';
import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import { VideoTranscriptDownloadDto } from './processors/video-transcript/dto/video-transcript-download.dto';
import { VideoTranscriptJobProcessor } from './processors/video-transcript/video-transcript-job.processor';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobs: JobService,
    private readonly runner: JobRunner,
    private readonly videoProcessor: VideoTranscriptJobProcessor,
  ) {}

  @Get()
  findAll(): Job[] {
    return this.jobs.findAll();
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.jobs.findById(id);
  }

  @ApiBody({ type: VideoTranscriptDownloadDto })
  @Post('video-transcript')
  createVideoTranscript(@Body('url') url: string) {
    const job = this.jobs.create('video-transcript');

    void this.runner.run(job, this.videoProcessor, url);

    return {
      id: job.id,
      status: job.status,
    };
  }
}
