import { ApiBody } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Job } from './domain/job.entity';
import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import { VideoToTranscriptDownloadDto } from './processors/video-to-transcript/dto/video-to-transcript-download.dto';
import { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/video-to-transcript-job.processor';
import { JobTypeConfig } from './jobs.types';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobs: JobService,
    private readonly runner: JobRunner,
    private readonly videoProcessor: VideoToTranscriptJobProcessor,
  ) {}

  @Get()
  findAll(): Job[] {
    return this.jobs.findAll();
  }

  @Get('types')
  findTypes() {
    return Object.values(JobTypeConfig).map((config) => ({
      ...config,
    }));
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.jobs.findById(id);
  }

  @ApiBody({ type: VideoToTranscriptDownloadDto })
  @Post('video-to-transcript')
  createVideoTranscript(@Body('url') url: string) {
    const job = this.jobs.create('video-to-transcript');

    void this.runner.run(job, this.videoProcessor, url);

    return {
      id: job.id,
      status: job.status,
    };
  }
}
