import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

import { normalizeText, removeAllegedAuthorship } from 'src/utils/text';

import { SummarySpecialistPrompt } from '../../../ai/prompts/summary-specialist.prompt';

import {
  VideoService,
  VideoSummarizeOptions,
} from 'src/modules/video/video.service';
import { WhisperService } from 'src/modules/ai/whisper/whisper.service';
import { VideoToSummaryDto } from './dto/video-to-summary.dto';

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
    const audioPath = await this.convertToAudio(videoPath);
    await this.deleteVideo(videoPath);

    const rawTranscription = await this.transcribe(audioPath);
    const transcription = removeAllegedAuthorship(
      normalizeText(rawTranscription),
    );

    const sumamary = await this.summarize(transcription, {
      providerId: input.providerId,
      modelId: input.modelId,
      thinking: input.thinking,
    });
    await this.saveFile(sumamary, job.id);
    await this.deleteAudio(audioPath);
  }

  private async downloadVideo(job: Job, videoUrl: string): Promise<string> {
    const videoPath = await this.videoService.download(
      videoUrl,
      `${job.id}.mp4`,
    );

    return videoPath;
  }

  private async convertToAudio(videoPath: string): Promise<string> {
    const audioPath = await this.videoService.toAudio(videoPath);

    return audioPath;
  }

  private async deleteVideo(videoPath: string): Promise<void> {
    await this.videoService.deleteVideo(videoPath);
  }

  private async transcribe(audioPath: string): Promise<string> {
    const transcription = await this.whisperService.transcribe(audioPath);

    return transcription;
  }

  private async summarize(
    transcription: string,
    options: VideoSummarizeOptions,
  ): Promise<string> {
    const summary = await this.videoService.summarize(
      SummarySpecialistPrompt,
      transcription,
      options,
    );

    return summary;
  }

  private async saveFile(
    transcription: string,
    fileName: string,
    fileExtension: string = '.md',
  ): Promise<string> {
    const transcriptionPath = await this.videoService.saveFile(
      transcription,
      fileName,
      fileExtension,
    );

    return transcriptionPath;
  }

  private async deleteAudio(audioPath: string): Promise<void> {
    await this.videoService.deleteAudio(audioPath);
  }
}
