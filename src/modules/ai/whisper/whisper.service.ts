import { Injectable } from '@nestjs/common';

import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';

import { EnvKeys } from '../../../config/env/env';
import { AppConfig } from '../../../config/env/app-config';

const execFileAsync = promisify(execFile);

@Injectable()
export class WhisperService {
  private readonly whisperPath: string;

  private readonly modelPath: string;

  constructor(config: AppConfig) {
    const basePath = config.get(EnvKeys.WHISPER_DIR);

    this.whisperPath = path.join(
      basePath,
      config.get(EnvKeys.WHISPER_EXECUTABLE),
    );
    this.modelPath = path.join(basePath, config.get(EnvKeys.WHISPER_MODEL));
  }

  async transcribe(audioPath: string): Promise<string> {
    this.validateFiles(audioPath);

    const outputPath = `${audioPath}.txt`;

    try {
      await execFileAsync(this.whisperPath, [
        '-m',
        this.modelPath,
        '-f',
        audioPath,
        '-l',
        'pt',
        '--no-prints',
        '--output-txt',
        '-of',
        outputPath.replace(/\.txt$/, ''),
      ]);

      const text = await fs.promises.readFile(outputPath, 'utf8');

      return text.trim();
    } catch (error) {
      throw new Error('Falha ao transcrever o áudio.', {
        cause: error,
      });
    } finally {
      await fs.promises.unlink(outputPath).catch(() => {});
    }
  }

  private validateFiles(audioPath: string): void {
    if (!fs.existsSync(this.whisperPath)) {
      throw new Error(`Whisper CLI não encontrado: ${this.whisperPath}`);
    }

    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`Modelo Whisper não encontrado: ${this.modelPath}`);
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Arquivo de áudio não encontrado: ${audioPath}`);
    }
  }
}
