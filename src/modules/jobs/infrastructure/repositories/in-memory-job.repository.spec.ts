import { Job } from '../../domain/job.entity';
import { InMemoryJobRepository } from './in-memory-job.repository';

describe('InMemoryJobRepository', () => {
  let repository: InMemoryJobRepository;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
  });

  it('when a job is saved, should be found by id', () => {
    const job = new Job('video-to-transcript');

    repository.save(job);

    expect(repository.findById(job.id)).toBe(job);
  });

  it('when the id does not exist, should return null', () => {
    expect(repository.findById('x')).toBeNull();
  });

  it('when the same job is saved twice, should not duplicate it', () => {
    const job = new Job('video-to-transcript');

    repository.save(job);
    repository.save(job);

    expect(repository.findAll()).toHaveLength(1);
  });

  it('when findAll is called, should return all jobs', () => {
    const a = new Job('video-to-transcript');
    const b = new Job('video-to-summary');

    repository.save(a);
    repository.save(b);

    expect(repository.findAll()).toEqual([a, b]);
  });
});
