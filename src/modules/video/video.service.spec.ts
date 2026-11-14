import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AddressInfo } from 'node:net';

import { VideoService } from './video.service';
import type { AppConfig } from '../../config/env/app-config';
import type { AIService } from '../ai/ai.service';

const execFileMock = jest.fn();

jest.mock('node:child_process', () => ({
  ...jest.requireActual<object>('node:child_process'),
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

describe('VideoService', () => {
  let tmp: string;
  let chat: jest.Mock;
  let service: VideoService;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-spec-'));
    chat = jest.fn();
    service = new VideoService(
      { chat } as unknown as AIService,
      {
        get: (key: string) =>
          ({
            TEMP_VIDEO_DIR: path.join(tmp, 'video'),
            TEMP_AUDIO_DIR: path.join(tmp, 'audio'),
            TEMP_DOCS_DIR: path.join(tmp, 'docs'),
          })[key],
      } as unknown as AppConfig,
    );
    execFileMock.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('download', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeEach(async () => {
      server = http.createServer((req, res) => {
        if (req.url === '/video') {
          res.writeHead(200);
          res.end('conteudo');
        } else if (req.url === '/redirect') {
          res.writeHead(302, { Location: `${baseUrl}/video` });
          res.end();
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    it('when the URL returns 200, should save the file in the destination dir', async () => {
      const out = await service.download(`${baseUrl}/video`, 'v.mp4', tmp);

      expect(out).toBe(path.resolve(tmp, 'v.mp4'));
      expect(fs.readFileSync(out, 'utf8')).toBe('conteudo');
    });

    it('when no destination dir is given, should save in TEMP_VIDEO_DIR', async () => {
      const out = await service.download(`${baseUrl}/video`, 'padrao.mp4');

      expect(out).toBe(path.resolve(tmp, 'video', 'padrao.mp4'));
    });

    it('when the URL redirects, should follow it', async () => {
      const out = await service.download(`${baseUrl}/redirect`, 'r.mp4', tmp);

      expect(fs.readFileSync(out, 'utf8')).toBe('conteudo');
    });

    it('when the redirect location is relative, should resolve it against the current url', async () => {
      server.removeAllListeners('request');
      server.on('request', (req, res) => {
        if (req.url === '/start') {
          res.writeHead(302, { Location: '/video' });
          res.end();
        } else {
          res.writeHead(200);
          res.end('conteudo');
        }
      });

      const out = await service.download(`${baseUrl}/start`, 'rel.mp4', tmp);

      expect(fs.readFileSync(out, 'utf8')).toBe('conteudo');
    });

    it('when the status is not 200, should reject with the status code', async () => {
      await expect(
        service.download(`${baseUrl}/missing`, 'x.mp4', tmp),
      ).rejects.toThrow('404');
    });

    it('when the connection fails, should reject', async () => {
      await expect(
        service.download('http://127.0.0.1:1/x', 'x.mp4', tmp),
      ).rejects.toThrow('Erro durante o download');
    });
  });

  describe('toAudio', () => {
    it('when no dir is given, should write the audio in TEMP_AUDIO_DIR', async () => {
      execFileMock.mockImplementation(
        (_c: string, _a: string[], cb: (e: null, r: object) => void) =>
          cb(null, {}),
      );

      const out = await service.toAudio('/x/a.mp4');

      expect(out).toBe(path.resolve(tmp, 'audio', 'a.wav'));
    });

    it('when converting, should call ffmpeg as mono 16kHz PCM and return the .wav path', async () => {
      execFileMock.mockImplementation(
        (_c: string, _a: string[], cb: (e: null, r: object) => void) =>
          cb(null, {}),
      );

      const out = await service.toAudio('/x/meu-video.mp4', tmp);

      expect(out).toBe(path.resolve(tmp, 'meu-video.wav'));
      expect(execFileMock.mock.calls[0][0]).toBe('ffmpeg');
      expect(execFileMock.mock.calls[0][1]).toEqual([
        '-i',
        '/x/meu-video.mp4',
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'pcm_s16le',
        out,
      ]);
    });

    it('when ffmpeg fails, should throw a conversion error', async () => {
      execFileMock.mockImplementation(
        (_c: string, _a: string[], cb: (e: Error) => void) =>
          cb(new Error('x')),
      );

      await expect(service.toAudio('/x/a.mp4', tmp)).rejects.toThrow(
        'Falha ao converter',
      );
    });
  });

  describe('saveFile', () => {
    it('when no extension or dir is given, should save a .md in TEMP_DOCS_DIR', async () => {
      const out = await service.saveFile('x', 'doc');

      expect(out).toBe(path.resolve(tmp, 'docs', 'doc.md'));
      expect(fs.existsSync(out)).toBe(true);
    });

    it('when saving a file, should write name plus extension and return the path', async () => {
      const out = await service.saveFile('conteúdo', 'job1', '.md', tmp);

      expect(out).toBe(path.resolve(tmp, 'job1.md'));
      expect(fs.readFileSync(out, 'utf8')).toBe('conteúdo');
    });

    it('when the directory does not exist, should create it', async () => {
      const dir = path.join(tmp, 'a', 'b');

      await service.saveFile('x', 'f', '.txt', dir);

      expect(fs.existsSync(path.join(dir, 'f.txt'))).toBe(true);
    });
  });

  describe('summarize', () => {
    it('when summarizing, should build prompt plus transcript and default thinking to off', async () => {
      chat.mockResolvedValue('resumo');

      const result = await service.summarize('PROMPT', 'TRANSCRICAO', {
        providerId: 'ollama',
        modelId: 'm',
      });

      expect(result).toBe('resumo');

      const arg = chat.mock.calls[0][0] as {
        message: string;
        thinking: string;
        providerId: string;
        modelId: string;
      };
      expect(arg).toMatchObject({
        providerId: 'ollama',
        modelId: 'm',
        thinking: 'off',
      });
      expect(arg.message).toContain('PROMPT');
      expect(arg.message).toContain('TRANSCRICAO');
      expect(arg.message.indexOf('PROMPT')).toBeLessThan(
        arg.message.indexOf('TRANSCRICAO'),
      );
    });

    it('when thinking is given, should pass it through', async () => {
      chat.mockResolvedValue('r');

      await service.summarize('p', 't', {
        providerId: 'gemini',
        modelId: 'm',
        thinking: 'on',
      });

      expect(chat.mock.calls[0][0]).toMatchObject({ thinking: 'on' });
    });

    it('when the detail is brief, should send the whole transcript in one call', async () => {
      chat.mockResolvedValue('r');
      const long = 'Frase longa. '.repeat(3000);

      await service.summarize('p', long, {
        providerId: 'gemini',
        modelId: 'm',
        detail: 'brief',
      });

      expect(chat).toHaveBeenCalledTimes(1);
    });

    it('when the detail is not brief and the transcript is short, should call once without part notes', async () => {
      chat.mockResolvedValue('r');

      await service.summarize('p', 'curta.', {
        providerId: 'gemini',
        modelId: 'm',
        detail: 'detailed',
      });

      expect(chat).toHaveBeenCalledTimes(1);
      expect(
        (chat.mock.calls[0][0] as { message: string }).message,
      ).not.toContain('parte 1 de');
    });

    it('when a detailed transcript is long, should summarize it in parts and join them', async () => {
      chat
        .mockResolvedValueOnce('# Aula\n\n## A')
        .mockResolvedValueOnce('## B');
      const long = 'Frase longa. '.repeat(1500);

      const result = await service.summarize('p', long, {
        providerId: 'gemini',
        modelId: 'm',
        detail: 'study',
      });

      expect(chat).toHaveBeenCalledTimes(2);
      expect(result).toBe('# Aula\n\n## A\n\n## B');

      const first = (chat.mock.calls[0][0] as { message: string }).message;
      const second = (chat.mock.calls[1][0] as { message: string }).message;

      expect(first).toContain('parte 1 de 2');
      expect(first).not.toContain('Não repita o título principal');
      expect(second).toContain('parte 2 de 2');
      expect(second).toContain('Não repita o título principal');
    });

    it('when chat fails, should throw a summary error', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      chat.mockRejectedValue(new Error('x'));

      await expect(
        service.summarize('p', 't', { providerId: 'ollama', modelId: 'm' }),
      ).rejects.toThrow('Falha ao gerar o resumo');
    });
  });

  describe('deleteVideo / deleteAudio', () => {
    it('when deleting an existing file, should remove it', async () => {
      const file = path.join(tmp, 'a.bin');
      fs.writeFileSync(file, 'x');

      await service.deleteVideo(file);
      expect(fs.existsSync(file)).toBe(false);

      fs.writeFileSync(file, 'x');
      await service.deleteAudio(file);
      expect(fs.existsSync(file)).toBe(false);
    });

    it('when the file does not exist, should throw a specific message', async () => {
      const missing = path.join(tmp, 'nao-existe');

      await expect(service.deleteVideo(missing)).rejects.toThrow('vídeo');
      await expect(service.deleteAudio(missing)).rejects.toThrow('áudio');
    });
  });
});
