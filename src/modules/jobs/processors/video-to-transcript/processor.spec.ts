import { VideoToTranscriptJobProcessor } from './processor';
import { Job } from '../../domain/job.entity';
import { JobStatus } from '../../domain/job-status.enum';
import type { VideoService } from 'src/modules/video/video.service';
import type { WhisperService } from 'src/modules/ai/whisper/whisper.service';

describe('VideoToTranscriptJobProcessor', () => {
  let video: Record<
    'download' | 'toAudio' | 'deleteVideo' | 'saveFile' | 'deleteAudio',
    jest.Mock
  >;
  let whisper: { transcribe: jest.Mock };
  let processor: VideoToTranscriptJobProcessor;
  let job: Job;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    const track = (name: string, value?: unknown) =>
      jest.fn().mockImplementation(() => {
        calls.push(name);
        return Promise.resolve(value);
      });

    video = {
      download: track('download', '/tmp/v.mp4'),
      toAudio: track('toAudio', '/tmp/a.wav'),
      deleteVideo: track('deleteVideo'),
      saveFile: track('saveFile', '/tmp/out.txt'),
      deleteAudio: track('deleteAudio'),
    };
    whisper = { transcribe: track('transcribe', 'texto\n  cru Legenda por Sônia Ruberti.') };

    processor = new VideoToTranscriptJobProcessor(
      video as unknown as VideoService,
      whisper as unknown as WhisperService,
    );
    job = new Job('video-to-transcript');
  });

  it('when processing, should run the steps in pipeline order', async () => {
    await processor.process(job, 'http://x/v.mp4');

    expect(calls).toEqual([
      'download',
      'toAudio',
      'deleteVideo',
      'transcribe',
      'saveFile',
      'deleteAudio',
    ]);
  });

  it('when processing, should download using the job id as file name', async () => {
    await processor.process(job, 'http://x/v.mp4');

    expect(video.download).toHaveBeenCalledWith(
      'http://x/v.mp4',
      `${job.id}.mp4`,
    );
  });

  it('when processing, should save the normalized transcript without the signature as .txt', async () => {
    await processor.process(job, 'http://x/v.mp4');

    expect(video.saveFile).toHaveBeenCalledWith('texto cru', job.id, '.txt');
  });

  it('when everything succeeds, should complete all steps', async () => {
    await processor.process(job, 'http://x/v.mp4');

    expect(job.steps.every((s) => s.status === JobStatus.COMPLETED)).toBe(true);
  });

  it('when a step fails, should mark it FAILED, rethrow and skip the next steps', async () => {
    whisper.transcribe.mockRejectedValue(new Error('whisper off'));

    await expect(processor.process(job, 'http://x/v.mp4')).rejects.toThrow(
      'whisper off',
    );

    const status = (name: string) =>
      job.steps.find((s) => s.name === name)!.status;
    expect(status('transcribe')).toBe(JobStatus.FAILED);
    expect(status('save-file')).toBe(JobStatus.PENDING);
    expect(video.saveFile).not.toHaveBeenCalled();
  });
});
