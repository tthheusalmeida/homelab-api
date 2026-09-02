import { ApiBody } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Job } from './domain/job.entity';
import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import { JobTypeConfig } from './jobs.types';

import { VideoToTranscriptDownloadDto } from './processors/video-to-transcript/dto/video-to-transcript-download.dto';
import { VideoToSummaryDto } from './processors/video-to-resume/dto/video-to-summary.dto';

import { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/video-to-transcript-job.processor';
import { VideoToSummaryJobProcessor } from './processors/video-to-resume/video-to-summary-job.processor';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobs: JobService,
    private readonly runner: JobRunner,
    private readonly videoToTranscriptProcessor: VideoToTranscriptJobProcessor,
    private readonly videoToSummaryProcessor: VideoToSummaryJobProcessor,
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
  createVideoToTranscript(@Body('url') url: string) {
    const job = this.jobs.create('video-to-transcript');

    void this.runner.run(job, this.videoToTranscriptProcessor, url);

    return {
      id: job.id,
      status: job.status,
    };
  }

  @ApiBody({ type: VideoToSummaryDto })
  @Post('video-to-summary')
  createVideoTranscript(@Body() dto: VideoToSummaryDto) {
    const job = this.jobs.create('video-to-summary');

    void this.runner.run(job, this.videoToSummaryProcessor, dto);

    return {
      id: job.id,
      status: job.status,
    };
  }
}
