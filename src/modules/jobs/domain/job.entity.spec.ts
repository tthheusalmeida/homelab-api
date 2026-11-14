import { Job } from './job.entity';
import { JobStatus } from './job-status.enum';
import { JobTypeConfig } from '../jobs.types';

describe('Job', () => {
  const newJob = () => new Job('video-to-transcript');

  describe('criação', () => {
    it('when a job is created, should start as PENDING with id and createdAt', () => {
      const job = newJob();

      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.id).toEqual(expect.any(String));
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.startedAt).toBeUndefined();
      expect(job.completedAt).toBeUndefined();
      expect(job.error).toBeUndefined();
    });

    it('when a job is created without hints, should have empty document hints', () => {
      expect(newJob().documentHints).toEqual({});
    });

    it('when a job is created with hints, should expose them but not serialize them', () => {
      const job = new Job('video-to-transcript', { title: 'T' });

      expect(job.documentHints).toEqual({ title: 'T' });
      expect(job.toJSON()).not.toHaveProperty('documentHints');
    });

    it('when a job is created, should copy label and steps from its type, all PENDING', () => {
      const job = newJob();
      const config = JobTypeConfig['video-to-transcript'];

      expect(job.name).toBe('video-to-transcript');
      expect(job.label).toBe(config.label);
      expect(job.steps.map((s) => s.name)).toEqual(
        config.steps.map((s) => s.name),
      );
      expect(job.steps.every((s) => s.status === JobStatus.PENDING)).toBe(true);
    });

    it('when the job type is unknown, should throw', () => {
      expect(() => new Job('inexistente')).toThrow('inexistente');
    });

    it('when two jobs are created, should generate distinct ids', () => {
      expect(newJob().id).not.toBe(newJob().id);
    });
  });

  describe('ciclo de vida', () => {
    it('when start is called on a PENDING job, should become RUNNING with startedAt', () => {
      const job = newJob();

      job.start();

      expect(job.status).toBe(JobStatus.RUNNING);
      expect(job.startedAt).toBeInstanceOf(Date);
    });

    it('when start is called on a non-PENDING job, should throw', () => {
      const job = newJob();
      job.start();

      expect(() => job.start()).toThrow();
    });

    it('when complete is called on a RUNNING job, should become COMPLETED with completedAt', () => {
      const job = newJob();
      job.start();

      job.complete();

      expect(job.status).toBe(JobStatus.COMPLETED);
      expect(job.completedAt).toBeInstanceOf(Date);
    });

    it('when complete is called on a non-RUNNING job, should throw', () => {
      expect(() => newJob().complete()).toThrow();
    });

    it('when fail is called, should become FAILED and store the message', () => {
      const job = newJob();

      job.fail('boom');

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.error).toBe('boom');
    });
  });

  describe('etapas', () => {
    const stepName = 'download-video';
    const statusOf = (job: Job) =>
      job.steps.find((s) => s.name === stepName)!.status;

    it('when step transitions are called, should update the step status', () => {
      const job = newJob();

      job.startStep(stepName);
      expect(statusOf(job)).toBe(JobStatus.RUNNING);

      job.completeStep(stepName);
      expect(statusOf(job)).toBe(JobStatus.COMPLETED);

      job.failStep(stepName);
      expect(statusOf(job)).toBe(JobStatus.FAILED);
    });

    it('when the step does not exist, should throw', () => {
      expect(() => newJob().startStep('nao-existe')).toThrow('nao-existe');
    });

    it('when runStep callback succeeds, should complete the step and return the result', async () => {
      const job = newJob();

      const result = await job.runStep(stepName, () => Promise.resolve(42));

      expect(result).toBe(42);
      expect(statusOf(job)).toBe(JobStatus.COMPLETED);
    });

    it('when runStep callback fails, should mark the step FAILED and rethrow the original error', async () => {
      const job = newJob();
      const error = new Error('falhou');

      await expect(
        job.runStep(stepName, () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(statusOf(job)).toBe(JobStatus.FAILED);
    });
  });

  it('when serialized, should expose the public fields', () => {
    const job = newJob();

    expect(Object.keys(job.toJSON()).sort()).toEqual(
      [
        'completedAt',
        'createdAt',
        'error',
        'id',
        'label',
        'name',
        'startedAt',
        'status',
        'steps',
      ].sort(),
    );
  });
});
