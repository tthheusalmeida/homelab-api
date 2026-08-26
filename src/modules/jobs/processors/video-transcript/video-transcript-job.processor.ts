import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

import { VideoService } from 'src/modules/video/video.service';

@Injectable()
export class VideoTranscriptJobProcessor implements JobProcessor<
  string,
  string
> {
  constructor(private readonly videoService: VideoService) {}

  async process(job: Job, videoUrl: string): Promise<string> {
    console.log(`[${job.id}] ⬇️  Baixando video...`);
    const videoPath = await this.videoService.download(
      videoUrl,
      `${job.id}.mp4`,
    );
    console.log(`[${job.id}] ✅ Video adquirido!`);

    console.log(`[${job.id}] 🎙️ Convertendo: Vídeo -> Áudio...`);
    await this.videoService.toAudio(videoPath);
    console.log(`[${job.id}] ✅ Áudio adquirido!`);

    console.log(`[${job.id}] ♻️ Deletando vídeo...`);
    await this.videoService.deleteVideo(videoPath);
    console.log(`[${job.id}] ❌ Vídeo deletado!`);

    // console.log(`[${job.id}] Transcrevendo...`);

    // const transcript = await this.transcribe(audioPath);

    // console.log(`[${job.id}] Gerando texto...`);

    // const markdown = await this.generateMarkdown(transcript);

    // return markdown;

    return `Baixou ['id': ${job.id}, 'status': ${job.status}`;
  }

  // private async transcribe(audioPath: string): Promise<string> {
  //   // Whisper
  //   return 'transcription...';
  // }

  // private async generateMarkdown(transcript: string): Promise<string> {
  //   // Ollama + Markdown writer
  //   return '# Knowledge';
  // }
}
