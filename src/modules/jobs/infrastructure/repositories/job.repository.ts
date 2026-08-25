import { Job } from '../../domain/job.entity';

export const JOB_REPOSITORY = Symbol('JOB_REPOSITORY');

export interface JobRepository {
  save(job: Job): void;

  findById(id: string): Job | null;
}
