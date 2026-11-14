import { Injectable } from '@nestjs/common';

import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { AIProviderName } from '../ai/ai.model';
import { SummaryDetail } from '../ai/prompts/summary-specialist.prompt';
import { splitText } from '../../utils/text';
import { AIService } from '../ai/ai.service';
import { EnvKeys } from '../../config/env/env';
import { AppConfig } from '../../config/env/app-config';

const execFileAsync = promisify(execFile);

export interface VideoSummarizeOptions {
  providerId: AIProviderName;
  modelId: string;
  thinking?: string;
  /** Qualquer valor diferente de brief divide transcrições longas em partes. */
  detail?: SummaryDetail;
}

/** Tamanho máximo (em caracteres) de cada parte enviada ao modelo. */
export const SUMMARY_CHUNK_CHARS = 12000;

@Injectable()
export class VideoService {
  constructor(
    private readonly aiService: AIService,
    private readonly config: AppConfig,
  ) {}

  async download(
    url: string,
    fileName: string = 'video-baixado.mp4',
    destinationDir: string = this.config.get(EnvKeys.TEMP_VIDEO_DIR),
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

          this.download(
            new URL(response.headers.location, url).href,
            fileName,
            destinationDir,
          )
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
    destinationDir: string = this.config.get(EnvKeys.TEMP_AUDIO_DIR),
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
    fileExtension: string = '.md',
    destinationDir: string = this.config.get(EnvKeys.TEMP_DOCS_DIR),
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
      const { providerId, modelId, thinking = 'off', detail } = options;

      // O resumo curto vai de uma vez; os detalhados resumem por partes para o
      // modelo não comprimir uma aula longa em poucos parágrafos.
      const chunks =
        detail && detail !== 'brief'
          ? splitText(transcription, SUMMARY_CHUNK_CHARS)
          : [transcription];

      const parts: string[] = [];

      for (const [index, chunk] of chunks.entries()) {
        const note = this.partNote(index, chunks.length);

        parts.push(
          await this.aiService.chat({
            providerId,
            modelId,
            thinking,
            message: `
      ${prompt}
      ${note}${chunk}
      `,
          }),
        );
      }

      return parts.join('\n\n');
    } catch (error) {
      console.log(error);
      throw new Error('Falha ao gerar o resumo.', {
        cause: error,
      });
    }
  }

  private partNote(index: number, total: number): string {
    if (total <= 1) {
      return '';
    }

    const intro = `Esta é a parte ${index + 1} de ${total} de uma mesma aula. Resuma somente esta parte; as outras são resumidas separadamente.`;

    return index === 0
      ? `${intro}\n\n`
      : `${intro} Não repita o título principal: comece direto pelas seções (##).\n\n`;
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
