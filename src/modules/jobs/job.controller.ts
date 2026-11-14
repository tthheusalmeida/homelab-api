import { ApiBody } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { parseDocumentHints } from './domain/document-hints';
import { Job } from './domain/job.entity';
import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import { JobTypeConfig } from './jobs.types';

import { VideoToTranscriptDownloadDto } from './processors/video-to-transcript/dto/video-to-transcript-download.dto';
import { VideoToSummaryDto } from './processors/video-to-resume/dto/video-to-summary.dto';

import { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/processor';
import { VideoToSummaryJobProcessor } from './processors/video-to-resume/processor';

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
  createVideoToTranscript(@Body() dto: VideoToTranscriptDownloadDto) {
    const job = this.jobs.create(
      'video-to-transcript',
      parseDocumentHints(dto),
    );

    void this.runner.run(job, this.videoToTranscriptProcessor, dto.url);

    return {
      id: job.id,
      status: job.status,
    };
  }

  @ApiBody({ type: VideoToSummaryDto })
  @Post('video-to-summary')
  createVideoTranscript(@Body() dto: VideoToSummaryDto) {
    const job = this.jobs.create('video-to-summary', parseDocumentHints(dto));

    void this.runner.run(job, this.videoToSummaryProcessor, dto);

    return {
      id: job.id,
      status: job.status,
    };
  }
}
