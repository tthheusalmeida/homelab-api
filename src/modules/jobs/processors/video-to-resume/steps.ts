export const VideoToResumeSteps = {
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

  SUMMARIZE: {
    name: 'summarize',
    label: 'Resumir conteúdo',
  },

  SAVE_FILE: {
    name: 'save-file',
    label: 'Salvar resumo',
  },

  DELETE_AUDIO: {
    name: 'delete-audio',
    label: 'Remover áudio',
  },
} as const;

export const VideoToResumePipeline = [
  VideoToResumeSteps.DOWNLOAD_VIDEO,
  VideoToResumeSteps.CONVERT_TO_AUDIO,
  VideoToResumeSteps.DELETE_VIDEO,
  VideoToResumeSteps.TRANSCRIBE,
  VideoToResumeSteps.SUMMARIZE,
  VideoToResumeSteps.SAVE_FILE,
  VideoToResumeSteps.DELETE_AUDIO,
];
