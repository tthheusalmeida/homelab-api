import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

import { VideoService } from 'src/modules/video/video.service';
import { WhisperService } from 'src/modules/ai/whisper/whisper.service';
import { normalizeText, removeAllegedAuthorship } from 'src/utils/text';
import { VideoToTranscriptSteps } from './steps';

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
    const audioPath = await this.convertToAudio(job, videoPath);
    await this.deleteVideo(job, videoPath);

    const rawTranscription = await this.transcribe(job, audioPath);
    const transcription = removeAllegedAuthorship(
      normalizeText(rawTranscription),
    );
    await this.saveFile(job, transcription, job.id);
    await this.deleteAudio(job, audioPath);
  }

  private async downloadVideo(job: Job, videoUrl: string): Promise<string> {
    return job.runStep(VideoToTranscriptSteps.DOWNLOAD_VIDEO.name, () =>
      this.videoService.download(videoUrl, `${job.id}.mp4`),
    );
  }

  private async convertToAudio(job: Job, videoPath: string): Promise<string> {
    return job.runStep(VideoToTranscriptSteps.CONVERT_TO_AUDIO.name, () =>
      this.videoService.toAudio(videoPath),
    );
  }

  private async deleteVideo(job: Job, videoPath: string): Promise<void> {
    return job.runStep(VideoToTranscriptSteps.DELETE_VIDEO.name, () =>
      this.videoService.deleteVideo(videoPath),
    );
  }

  private async transcribe(job: Job, audioPath: string): Promise<string> {
    return job.runStep(VideoToTranscriptSteps.TRANSCRIBE.name, () =>
      this.whisperService.transcribe(audioPath),
    );
  }

  private async saveFile(
    job: Job,
    transcription: string,
    fileName: string,
    fileExtension = '.txt',
  ): Promise<string> {
    return job.runStep(VideoToTranscriptSteps.SAVE_FILE.name, () =>
      this.videoService.saveFile(transcription, fileName, fileExtension),
    );
  }

  private async deleteAudio(job: Job, audioPath: string): Promise<void> {
    return job.runStep(VideoToTranscriptSteps.DELETE_AUDIO.name, () =>
      this.videoService.deleteAudio(audioPath),
    );
  }
}
