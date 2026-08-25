import { Injectable, Inject, NotFoundException } from '@nestjs/common';

import { Job } from '../domain/job.entity';
import { JOB_REPOSITORY } from '../infrastructure/repositories/job.repository';
import { type JobRepository } from '../infrastructure/repositories/job.repository';

@Injectable()
export class JobService {
  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly repository: JobRepository,
  ) {}

  create(): Job {
    const job = new Job();

    this.repository.save(job);

    return job;
  }

  findById(id: string): Job {
    const job = this.repository.findById(id);

    if (!job) {
      throw new NotFoundException(`Job "${id}" não encontrado`);
    }

    return job;
  }

  findAll(): Job[] {
    return this.repository.findAll();
  }
}
