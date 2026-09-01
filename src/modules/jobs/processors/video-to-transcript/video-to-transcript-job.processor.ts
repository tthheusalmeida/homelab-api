import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

import { VideoService } from 'src/modules/video/video.service';
import { WhisperService } from 'src/modules/ai/whisper/whisper.service';
import { normalizeText, removeAllegedAuthorship } from 'src/utils/text';

@Injectable()
export class VideoToTranscriptJobProcessor implements JobProcessor<
  string,
  string
> {
  constructor(
    private readonly videoService: VideoService,
    private readonly whisperService: WhisperService,
  ) {}

  async process(job: Job, videoUrl: string): Promise<void> {
    const videoPath = await this.downloadVideo(job, videoUrl);
    const audioPath = await this.convertToAudio(videoPath);
    await this.deleteVideo(videoPath);

    const rawTranscription = await this.transcribe(audioPath);
    const transcription = removeAllegedAuthorship(
      normalizeText(rawTranscription),
    );
    await this.saveTranscription(transcription, `${job.id}.txt`);
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

  private async saveTranscription(
    transcription: string,
    fileName: string,
  ): Promise<string> {
    const transcriptionPath = await this.videoService.saveTranscription(
      transcription,
      fileName,
    );

    return transcriptionPath;
  }

  private async deleteAudio(audioPath: string): Promise<void> {
    await this.videoService.deleteAudio(audioPath);
  }
}
