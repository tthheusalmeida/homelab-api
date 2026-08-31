// application/job-runner.service.ts

import { Injectable, Inject } from '@nestjs/common';

import { Job } from '../domain/job.entity';
import { JobProcessor } from '../domain/job-processor.interface';

import { JOB_REPOSITORY } from '../infrastructure/repositories/job.repository';
import type { JobRepository } from '../infrastructure/repositories/job.repository';

@Injectable()
export class JobRunner {
  private queue: Array<{
    job: Job;
    processor: JobProcessor<any, any>;
    input: any;
  }> = [];

  private running = false;

  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly repository: JobRepository,
  ) {}

  run<TInput, TResult>(
    job: Job,
    processor: JobProcessor<TInput, TResult>,
    input: TInput,
  ): void {
    this.queue.push({
      job,
      processor,
      input,
    });

    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      await this.execute(item.job, item.processor, item.input);
    }

    this.running = false;
  }

  private async execute<TInput, TResult>(
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
