import { Injectable } from '@nestjs/common';

import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { AIProviderName } from '../ai/ai.model';
import { AIService } from '../ai/ai.service';

const execFileAsync = promisify(execFile);

export interface VideoSummarizeOptions {
  providerId: AIProviderName;
  modelId: string;
  thinking?: string;
}

@Injectable()
export class VideoService {
  constructor(private readonly aiService: AIService) {}

  async download(
    url: string,
    fileName: string = 'video-baixado.mp4',
    destinationDir: string = 'D:/homelab/temp/video',
  ): Promise<string> {
    // path.resolve lida automaticamente com diferenças de sistema operacional
    const outputPath = path.resolve(destinationDir, fileName);

    // Garante que a pasta de destino existe antes de criar o stream
    fs.mkdirSync(destinationDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(outputPath);

      // Remove o arquivo parcialmente baixado quando ocorre algum erro.
      const cleanup = () => {
        fileStream.close();
        fs.unlink(outputPath, () => {});
      };

      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const request = client.get(url, (response) => {
        // O vídeo pode estar hospedado em outro endereço.
        // Neste caso, segue o redirecionamento para continuar o download.
        if (
          response.statusCode !== undefined &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          // Libera o response atual porque ele não contém o vídeo.
          response.resume();

          this.download(response.headers.location, fileName, destinationDir)
            .then(resolve)
            .catch(reject);

          return;
        }

        if (response.statusCode !== 200) {
          cleanup();

          reject(
            new Error(`Falha ao baixar. Status Code: ${response.statusCode}`),
          );

          return;
        }

        // Envia o conteúdo da resposta diretamente para o arquivo.
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(outputPath);
        });

        fileStream.on('error', (error) => {
          cleanup();

          reject(
            new Error(`Erro ao salvar o vídeo: ${error.message}`, {
              cause: error,
            }),
          );
        });
      });

      request.on('error', (error) => {
        cleanup();

        reject(
          new Error(`Erro durante o download: ${error.message}`, {
            cause: error,
          }),
        );
      });
    });
  }

  async toAudio(
    videoPath: string,
    destinationDir: string = 'D:/homelab/temp/audio',
  ): Promise<string> {
    try {
      fs.mkdirSync(destinationDir, { recursive: true });

      const videoFileName = path.basename(videoPath);
      const videoName = path.parse(videoFileName).name;

      const audioFileName = `${videoName}.wav`;
      const audioPath = path.resolve(destinationDir, audioFileName);

      await execFileAsync('ffmpeg', [
        '-i',
        videoPath,
        // Remove o vídeo
        '-vn',
        // Áudio mono
        '-ac',
        '1',
        // 16 kHz, ideal para speech-to-text
        '-ar',
        '16000',
        // WAV PCM
        '-c:a',
        'pcm_s16le',

        audioPath,
      ]);

      return audioPath;
    } catch (error) {
      throw new Error('Falha ao converter o vídeo para áudio.', {
        cause: error,
      });
    }
  }

  async saveFile(
    transcription: string,
    fileName: string = 'transcription',
    fileExtension: string = '.txt',
    destinationDir: string = 'D:/homelab/temp/txt',
  ): Promise<string> {
    try {
      fs.mkdirSync(destinationDir, { recursive: true });

      const fileFullName = fileName + fileExtension;
      const outputPath = path.resolve(destinationDir, fileFullName);
      await fs.promises.writeFile(outputPath, transcription, 'utf-8');

      return outputPath;
    } catch (error) {
      throw new Error('Falha ao salvar a transcrição.', {
        cause: error,
      });
    }
  }

  async summarize(
    prompt: string,
    transcription: string,
    options: VideoSummarizeOptions,
  ): Promise<string> {
    try {
      const { providerId, modelId, thinking = 'off' } = options;

      const currentPrompt = `
      ${prompt}
      ${transcription}
      `;

      const response = await this.aiService.chat({
        providerId,
        modelId,
        thinking,
        message: currentPrompt,
      });

      return response;
    } catch (error) {
      console.log(error);
      throw new Error('Falha ao gerar o resumo.', {
        cause: error,
      });
    }
  }

  async deleteVideo(videoPath: string): Promise<void> {
    try {
      await fs.promises.unlink(videoPath);
    } catch (error) {
      throw new Error('Falha ao remover o vídeo temporário.', {
        cause: error,
      });
    }
  }

  async deleteAudio(audioPath: string): Promise<void> {
    try {
      await fs.promises.unlink(audioPath);
    } catch (error) {
      throw new Error('Falha ao remover o áudio temporário.', {
        cause: error,
      });
    }
  }
}
