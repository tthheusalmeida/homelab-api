export const VideoToTranscriptSteps = {
  DOWNLOAD_VIDEO: {
    name: 'download-video',
    label: 'Baixar vídeo',
  },

  CONVERT_TO_AUDIO: {
    name: 'convert-to-audio',
    label: 'Converter para áudio',
  },

  DELETE_VIDEO: {
    name: 'delete-video',
    label: 'Remover vídeo',
  },

  TRANSCRIBE: {
    name: 'transcribe',
    label: 'Transcrever áudio',
  },

  SAVE_FILE: {
    name: 'save-file',
    label: 'Salvar transcrição',
  },

  DELETE_AUDIO: {
    name: 'delete-audio',
    label: 'Remover áudio',
  },
} as const;

export const VideoToTranscriptPipeline = [
  VideoToTranscriptSteps.DOWNLOAD_VIDEO,
  VideoToTranscriptSteps.CONVERT_TO_AUDIO,
  VideoToTranscriptSteps.DELETE_VIDEO,
  VideoToTranscriptSteps.TRANSCRIBE,
  VideoToTranscriptSteps.SAVE_FILE,
  VideoToTranscriptSteps.DELETE_AUDIO,
];
