import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

import { normalizeText, removeAllegedAuthorship } from 'src/utils/text';
import { VideoToSummaryDto } from './dto/video-to-summary.dto';

import { SummarySpecialistPrompt } from '../../../ai/prompts/summary-specialist.prompt';
import { WhisperService } from 'src/modules/ai/whisper/whisper.service';
import {
  VideoService,
  VideoSummarizeOptions,
} from 'src/modules/video/video.service';

import { VideoToResumeSteps } from './steps';

@Injectable()
export class VideoToSummaryJobProcessor implements JobProcessor<
  VideoToSummaryDto,
  string
> {
  constructor(
    private readonly videoService: VideoService,
    private readonly whisperService: WhisperService,
  ) {}

  async process(job: Job, input: VideoToSummaryDto): Promise<void> {
    const videoPath = await this.downloadVideo(job, input.url);
    const audioPath = await this.convertToAudio(job, videoPath);
    await this.deleteVideo(job, videoPath);

    const rawTranscription = await this.transcribe(job, audioPath);
    const transcription = removeAllegedAuthorship(
      normalizeText(rawTranscription),
    );
    const summary = await this.summarize(job, transcription, {
      providerId: input.providerId,
      modelId: input.modelId,
      thinking: input.thinking,
    });

    await this.saveFile(job, summary, job.id);
    await this.deleteAudio(job, audioPath);
  }

  private async downloadVideo(job: Job, videoUrl: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.DOWNLOAD_VIDEO.name, () =>
      this.videoService.download(videoUrl, `${job.id}.mp4`),
    );
  }

  private async convertToAudio(job: Job, videoPath: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.CONVERT_TO_AUDIO.name, () =>
      this.videoService.toAudio(videoPath),
    );
  }

  private async deleteVideo(job: Job, videoPath: string): Promise<void> {
    return job.runStep(VideoToResumeSteps.DELETE_VIDEO.name, () =>
      this.videoService.deleteVideo(videoPath),
    );
  }

  private async transcribe(job: Job, audioPath: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.TRANSCRIBE.name, () =>
      this.whisperService.transcribe(audioPath),
    );
  }

  private async summarize(
    job: Job,
    transcription: string,
    options: VideoSummarizeOptions,
  ): Promise<string> {
    return job.runStep(VideoToResumeSteps.SUMMARIZE.name, () =>
      this.videoService.summarize(
        SummarySpecialistPrompt,
        transcription,
        options,
      ),
    );
  }

  private async saveFile(
    job: Job,
    summary: string,
    fileName: string,
    fileExtension = '.md',
  ): Promise<string> {
    return job.runStep(VideoToResumeSteps.SAVE_FILE.name, () =>
      this.videoService.saveFile(summary, fileName, fileExtension),
    );
  }

  private async deleteAudio(job: Job, audioPath: string): Promise<void> {
    return job.runStep(VideoToResumeSteps.DELETE_AUDIO.name, () =>
      this.videoService.deleteAudio(audioPath),
    );
  }
}
