import { Job } from './job.entity';

export interface JobProcessor<TInput = unknown, TResult = unknown> {
  process(job: Job, input: TInput): Promise<TResult | void>;
}
