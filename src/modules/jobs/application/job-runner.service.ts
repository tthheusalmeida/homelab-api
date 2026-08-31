// application/job-runner.service.ts

import { Injectable, Inject } from '@nestjs/common';

import { Job } from '../domain/job.entity';
import { JobProcessor } from '../domain/job-processor.interface';

import { JOB_REPOSITORY } from '../infrastructure/repositories/job.repository';
import type { JobRepository } from '../infrastructure/repositories/job.repository';

@Injectable()
export class JobRunner {
  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly repository: JobRepository,
  ) {}

  async run<TInput, TResult>(
    job: Job,
    processor: JobProcessor<TInput, TResult>,
    input: TInput,
  ): Promise<void> {
    try {
      job.start();
      this.repository.save(job);

      await processor.process(job, input);

      job.complete();
      this.repository.save(job);
    } catch (error) {
      job.fail(error instanceof Error ? error.message : 'Erro desconhecido');

      this.repository.save(job);
    }
  }
}
