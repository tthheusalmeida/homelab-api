import { VideoToSummaryJobProcessor } from './processor';
import { Job } from '../../domain/job.entity';
import { parseDocument } from 'src/modules/library/domain/frontmatter';
import { JobStatus } from '../../domain/job-status.enum';
import { SummarySpecialistPrompt } from '../../../ai/prompts/summary-specialist.prompt';
import type { VideoService } from 'src/modules/video/video.service';
import type { WhisperService } from 'src/modules/ai/whisper/whisper.service';

describe('VideoToSummaryJobProcessor', () => {
  let video: Record<
    | 'download'
    | 'toAudio'
    | 'deleteVideo'
    | 'summarize'
    | 'saveFile'
    | 'deleteAudio',
    jest.Mock
  >;
  let whisper: { transcribe: jest.Mock };
  let processor: VideoToSummaryJobProcessor;
  let job: Job;
  let calls: string[];

  const dto = {
    url: 'http://x/v.mp4',
    providerId: 'ollama' as const,
    modelId: 'qwen3.5:8b',
    thinking: 'on',
  };

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
      summarize: track('summarize', '# resumo'),
      saveFile: track('saveFile', '/tmp/out.md'),
      deleteAudio: track('deleteAudio'),
    };
    whisper = { transcribe: track('transcribe', 'fala\n crua') };

    processor = new VideoToSummaryJobProcessor(
      video as unknown as VideoService,
      whisper as unknown as WhisperService,
    );
    job = new Job('video-to-summary');
  });

  it('when processing, should run the steps in pipeline order including summarize', async () => {
    await processor.process(job, dto);

    expect(calls).toEqual([
      'download',
      'toAudio',
      'deleteVideo',
      'transcribe',
      'summarize',
      'saveFile',
      'deleteAudio',
    ]);
  });

  it('when summarizing, should send the specialist prompt, normalized transcript and chosen model', async () => {
    await processor.process(job, dto);

    expect(video.summarize).toHaveBeenCalledWith(
      SummarySpecialistPrompt,
      'fala crua',
      { providerId: 'ollama', modelId: 'qwen3.5:8b', thinking: 'on' },
    );
  });

  it('when saving, should write a .md named <slug>_<job id>', async () => {
    await processor.process(job, dto);

    expect(video.saveFile).toHaveBeenCalledWith(
      expect.any(String),
      `resumo_de_video_${job.id}`,
      '.md',
    );
  });

  it('when saving, should put the summary in the body and a pending summary frontmatter with the video url', async () => {
    await processor.process(job, dto);

    const { meta, body } = parseDocument(
      video.saveFile.mock.calls[0][0] as string,
    );
    expect(body).toBe('# resumo\n');
    expect(meta).toMatchObject({
      id: job.id,
      type: 'summary',
      source: 'video',
      sourceUrl: dto.url,
      status: 'pending',
    });
  });

  it('when everything succeeds, should complete all steps', async () => {
    await processor.process(job, dto);

    expect(job.steps.every((s) => s.status === JobStatus.COMPLETED)).toBe(true);
  });

  it('when summarize fails, should mark it FAILED and not save the file', async () => {
    video.summarize.mockRejectedValue(new Error('llm off'));

    await expect(processor.process(job, dto)).rejects.toThrow('llm off');

    expect(job.steps.find((s) => s.name === 'summarize')!.status).toBe(
      JobStatus.FAILED,
    );
    expect(video.saveFile).not.toHaveBeenCalled();
  });
});
