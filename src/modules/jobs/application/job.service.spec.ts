import { NotFoundException } from '@nestjs/common';

import { JobService } from './job.service';
import { Job } from '../domain/job.entity';
import { InMemoryJobRepository } from '../infrastructure/repositories/in-memory-job.repository';

describe('JobService', () => {
  let repository: InMemoryJobRepository;
  let service: JobService;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    service = new JobService(repository);
  });

  it('when create is called with a valid type, should create and persist the job', () => {
    const job = service.create('video-to-summary');

    expect(job).toBeInstanceOf(Job);
    expect(job.name).toBe('video-to-summary');
    expect(repository.findById(job.id)).toBe(job);
  });

  it('when create is called with document hints, should keep them in the job', () => {
    const job = service.create('video-to-summary', {
      title: 'T',
      category: ['A'],
      tags: ['x'],
    });

    expect(job.documentHints).toEqual({
      title: 'T',
      category: ['A'],
      tags: ['x'],
    });
  });

  it('when create is called without hints, should have empty hints', () => {
    expect(service.create('video-to-summary').documentHints).toEqual({});
  });

  it('when create is called with an invalid type, should throw and not persist', () => {
    expect(() => service.create('invalido')).toThrow();
    expect(repository.findAll()).toHaveLength(0);
  });

  it('when findById is called with an existing id, should return the job', () => {
    const job = service.create('video-to-transcript');

    expect(service.findById(job.id)).toBe(job);
  });

  it('when findById is called with an unknown id, should throw NotFoundException', () => {
    expect(() => service.findById('nope')).toThrow(NotFoundException);
  });

  it('when findAll is called, should list the created jobs', () => {
    const a = service.create('video-to-transcript');
    const b = service.create('video-to-summary');

    expect(service.findAll()).toEqual([a, b]);
  });
});
