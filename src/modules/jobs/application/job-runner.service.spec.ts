import { JobRunner } from './job-runner.service';
import { Job } from '../domain/job.entity';
import { JobStatus } from '../domain/job-status.enum';
import { InMemoryJobRepository } from '../infrastructure/repositories/in-memory-job.repository';
import { JobProcessor } from '../domain/job-processor.interface';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('JobRunner', () => {
  let repository: InMemoryJobRepository;
  let runner: JobRunner;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    runner = new JobRunner(repository);
  });

  it('when the processor succeeds, should mark the job COMPLETED', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockResolvedValue(undefined),
    };

    runner.run(job, processor, 'input');
    await flush();

    expect(processor.process).toHaveBeenCalledWith(job, 'input');
    expect(job.status).toBe(JobStatus.COMPLETED);
    expect(repository.findById(job.id)).toBe(job);
  });

  it('when the processor is executing, should have the job RUNNING', async () => {
    const job = new Job('video-to-transcript');
    let statusDuring: JobStatus | undefined;
    const processor: JobProcessor<string> = {
      process: jest.fn().mockImplementation(() => {
        statusDuring = job.status;
        return Promise.resolve();
      }),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(statusDuring).toBe(JobStatus.RUNNING);
  });

  it('when the processor throws an Error, should mark the job FAILED with its message', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockRejectedValue(new Error('deu ruim')),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.error).toBe('deu ruim');
  });

  it('when the thrown value is not an Error, should use the generic message', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockRejectedValue('texto'),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.error).toBe('Erro desconhecido');
  });

  it('when several jobs are queued, should process them in series in arrival order', async () => {
    const order: string[] = [];
    const make = (label: string): JobProcessor<string> => ({
      process: async () => {
        order.push(`start-${label}`);
        await flush();
        order.push(`end-${label}`);
      },
    });

    runner.run(new Job('video-to-transcript'), make('a'), '');
    runner.run(new Job('video-to-transcript'), make('b'), '');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(order).toEqual(['start-a', 'end-a', 'start-b', 'end-b']);
  });

  it('when a job fails, should still run the next job in the queue', async () => {
    const failing = new Job('video-to-transcript');
    const next = new Job('video-to-transcript');

    runner.run(failing, { process: () => Promise.reject(new Error('x')) }, '');
    runner.run(next, { process: () => Promise.resolve() }, '');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(failing.status).toBe(JobStatus.FAILED);
    expect(next.status).toBe(JobStatus.COMPLETED);
  });
});
