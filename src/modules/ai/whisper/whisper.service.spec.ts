import * as fs from 'node:fs';

import { WhisperService } from './whisper.service';

const execFileMock = jest.fn();

jest.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  promises: { readFile: jest.fn(), unlink: jest.fn() },
}));

const existsSync = fs.existsSync as jest.Mock;
const readFile = fs.promises.readFile as unknown as jest.Mock;
const unlink = fs.promises.unlink as unknown as jest.Mock;

describe('WhisperService', () => {
  let service: WhisperService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhisperService();
    existsSync.mockReturnValue(true);
    unlink.mockResolvedValue(undefined);
    execFileMock.mockImplementation(
      (_cmd: string, _args: string[], cb: (e: Error | null, r?: object) => void) =>
        cb(null, { stdout: '', stderr: '' }),
    );
  });

  it('when the whisper executable is missing, should throw without running it', async () => {
    existsSync.mockImplementation((p: string) => !p.endsWith('.exe'));

    await expect(service.transcribe('a.wav')).rejects.toThrow('Whisper CLI');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('when the model file is missing, should throw', async () => {
    existsSync.mockImplementation((p: string) => !p.endsWith('.bin'));

    await expect(service.transcribe('a.wav')).rejects.toThrow('Modelo Whisper');
  });

  it('when the audio file is missing, should throw', async () => {
    existsSync.mockImplementation((p: string) => p !== 'a.wav');

    await expect(service.transcribe('a.wav')).rejects.toThrow('a.wav');
  });

  it('when transcribing, should use Portuguese, return trimmed text and delete the .txt', async () => {
    readFile.mockResolvedValue('  texto transcrito \n');

    const text = await service.transcribe('a.wav');

    expect(text).toBe('texto transcrito');

    const args = execFileMock.mock.calls[0][1] as string[];
    expect(args).toEqual(expect.arrayContaining(['-l', 'pt', '--output-txt']));
    expect(args[args.indexOf('-f') + 1]).toBe('a.wav');
    expect(args[args.indexOf('-of') + 1]).toBe('a.wav');

    expect(readFile).toHaveBeenCalledWith('a.wav.txt', 'utf8');
    expect(unlink).toHaveBeenCalledWith('a.wav.txt');
  });

  it('when whisper fails, should throw a transcription error and still delete the .txt', async () => {
    execFileMock.mockImplementation(
      (_c: string, _a: string[], cb: (e: Error) => void) =>
        cb(new Error('crash')),
    );

    await expect(service.transcribe('a.wav')).rejects.toThrow(
      'Falha ao transcrever',
    );
    expect(unlink).toHaveBeenCalledWith('a.wav.txt');
  });

  it('when deleting the .txt fails, should ignore the failure', async () => {
    readFile.mockResolvedValue('ok');
    unlink.mockRejectedValue(new Error('sem arquivo'));

    await expect(service.transcribe('a.wav')).resolves.toBe('ok');
  });
});
