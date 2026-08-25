import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';
import { VideoTranscriptJobProcessor } from './processors/video-transcript/video-transcript-job.processor';
import { ApiBody } from '@nestjs/swagger';
import { VideoTranscriptDownloadDto } from './processors/video-transcript/dto/video-transcript-download.dto';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobs: JobService,
    private readonly runner: JobRunner,
    private readonly videoProcessor: VideoTranscriptJobProcessor,
  ) {}

  @ApiBody({ type: VideoTranscriptDownloadDto })
  @Post('video-transcript')
  async createVideoTranscript(@Body('url') url: string) {
    const job = this.jobs.create();

    await this.runner.run(job, this.videoProcessor, url);

    return {
      id: job.id,
      status: job.status,
    };
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.jobs.findById(id);
  }
}
