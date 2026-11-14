import { BadRequestException } from '@nestjs/common';

import { JobController } from './job.controller';
import { JobTypeConfig } from './jobs.types';
import { Job } from './domain/job.entity';
import type { JobService } from './application/job.service';
import type { JobRunner } from './application/job-runner.service';
import type { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/processor';
import type { VideoToSummaryJobProcessor } from './processors/video-to-resume/processor';

describe('JobController', () => {
  let jobs: { findAll: jest.Mock; findById: jest.Mock; create: jest.Mock };
  let runner: { run: jest.Mock };
  const transcriptProcessor = {} as VideoToTranscriptJobProcessor;
  const summaryProcessor = {} as VideoToSummaryJobProcessor;
  let controller: JobController;

  beforeEach(() => {
    jobs = { findAll: jest.fn(), findById: jest.fn(), create: jest.fn() };
    runner = { run: jest.fn() };
    controller = new JobController(
      jobs as unknown as JobService,
      runner as unknown as JobRunner,
      transcriptProcessor,
      summaryProcessor,
    );
  });

  it('when listing jobs, should return the service result', () => {
    const list = [new Job('video-to-transcript')];
    jobs.findAll.mockReturnValue(list);

    expect(controller.findAll()).toBe(list);
  });

  it('when listing types, should return one entry per configured type', () => {
    expect(controller.findTypes()).toEqual(Object.values(JobTypeConfig));
  });

  it('when finding a job by id, should delegate to the service', () => {
    const job = new Job('video-to-summary');
    jobs.findById.mockReturnValue(job);

    expect(controller.find(job.id)).toBe(job);
    expect(jobs.findById).toHaveBeenCalledWith(job.id);
  });

  it('when creating a transcript job, should enqueue it with the url and return id and status', () => {
    const job = new Job('video-to-transcript');
    jobs.create.mockReturnValue(job);

    const result = controller.createVideoToTranscript({
      url: 'http://x/v.mp4',
    });

    expect(jobs.create).toHaveBeenCalledWith('video-to-transcript', {});
    expect(runner.run).toHaveBeenCalledWith(
      job,
      transcriptProcessor,
      'http://x/v.mp4',
    );
    expect(result).toEqual({ id: job.id, status: 'pending' });
  });

  it('when creating a summary job, should enqueue it with the dto and return id and status', () => {
    const job = new Job('video-to-summary');
    jobs.create.mockReturnValue(job);
    const dto = {
      url: 'http://x/v.mp4',
      providerId: 'gemini' as const,
      modelId: 'm',
      thinking: 'off',
    };

    const result = controller.createVideoTranscript(dto);

    expect(jobs.create).toHaveBeenCalledWith('video-to-summary', {});
    expect(runner.run).toHaveBeenCalledWith(job, summaryProcessor, dto);
    expect(result).toEqual({ id: job.id, status: 'pending' });
  });

  it('when a transcript job has title, category and tags, should pass the normalized hints to the job', () => {
    const job = new Job('video-to-transcript');
    jobs.create.mockReturnValue(job);

    controller.createVideoToTranscript({
      url: 'http://x/v.mp4',
      title: '  Aula 3 ',
      category: ['Tecnologia', ' DevOps '],
      tags: ['Docker', 'docker'],
    });

    expect(jobs.create).toHaveBeenCalledWith('video-to-transcript', {
      title: 'Aula 3',
      category: ['Tecnologia', 'DevOps'],
      tags: ['docker'],
    });
  });

  it('when a summary job has title, category and tags, should pass the normalized hints to the job', () => {
    const job = new Job('video-to-summary');
    jobs.create.mockReturnValue(job);

    controller.createVideoTranscript({
      url: 'http://x/v.mp4',
      providerId: 'gemini',
      modelId: 'm',
      thinking: 'off',
      title: 'Resumo X',
      category: ['A'],
      tags: ['t'],
    });

    expect(jobs.create).toHaveBeenCalledWith('video-to-summary', {
      title: 'Resumo X',
      category: ['A'],
      tags: ['t'],
    });
  });

  it('when the category is invalid, should reject with BadRequestException and not create or enqueue the job', () => {
    expect(() =>
      controller.createVideoToTranscript({
        url: 'http://x/v.mp4',
        category: ['a', 'b', 'c', 'd', 'e'],
      }),
    ).toThrow(BadRequestException);
    expect(jobs.create).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });
});
