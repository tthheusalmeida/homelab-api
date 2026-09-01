import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

import { VideoService } from 'src/modules/video/video.service';
import { WhisperService } from 'src/modules/ai/whisper/whisper.service';
import { normalizeText, removeAllegedAuthorship } from 'src/utils/text';

@Injectable()
export class VideoTranscriptJobProcessor implements JobProcessor<
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
    await this.saveTranscription(job, transcription, `${job.id}.txt`);
    await this.deleteAudio(job, audioPath);
  }

  private async downloadVideo(job: Job, videoUrl: string): Promise<string> {
    console.log(`[${job.id}] ⬇️ Baixando video...`);
    const videoPath = await this.videoService.download(
      videoUrl,
      `${job.id}.mp4`,
    );
    console.log(`[${job.id}] ✅ Video adquirido!`);

    return videoPath;
  }

  private async convertToAudio(job: Job, videoPath: string): Promise<string> {
    console.log(`[${job.id}] 🎙️ Convertendo: Vídeo -> Áudio...`);
    const audioPath = await this.videoService.toAudio(videoPath);
    console.log(`[${job.id}] ✅ Áudio adquirido!`);

    return audioPath;
  }

  private async deleteVideo(job: Job, videoPath: string): Promise<void> {
    console.log(`[${job.id}] ♻️ Deletando vídeo...`);
    await this.videoService.deleteVideo(videoPath);
    console.log(`[${job.id}] ❌ Vídeo deletado!`);
  }

  private async transcribe(job: Job, audioPath: string): Promise<string> {
    console.log(`[${job.id}] 📝 Transcrevendo...`);
    const transcription = await this.whisperService.transcribe(audioPath);
    console.log(`[${job.id}] ✅ Transcrição completa!`);

    return transcription;
  }

  private async saveTranscription(
    job: Job,
    transcription: string,
    fileName: string,
  ): Promise<string> {
    console.log(`[${job.id}] 💾 Salvando transcrição...`);
    const transcriptionPath = await this.videoService.saveTranscription(
      transcription,
      fileName,
    );
    console.log(`[${job.id}] ✅ Transcrição salva!`);
    return transcriptionPath;
  }

  private async deleteAudio(job: Job, audioPath: string): Promise<void> {
    console.log(`[${job.id}] ♻️ Deletando áudio...`);
    await this.videoService.deleteAudio(audioPath);
    console.log(`[${job.id}] ❌ Áudio deletado!`);
  }
}
