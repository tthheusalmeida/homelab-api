export const JobTypeOptions = {
  VIDEO_TO_TRANSCRIPT: 'video-to-transcript',
  VIDEO_TO_SUMMARY: 'video-to-summary',
} as const;

export type JobType = (typeof JobTypeOptions)[keyof typeof JobTypeOptions];

interface JobTypeData {
  type: string;
  label: string;
  description: string;
}

export const JobTypeConfig: Record<JobType, JobTypeData> = {
  [JobTypeOptions.VIDEO_TO_TRANSCRIPT]: {
    type: JobTypeOptions.VIDEO_TO_TRANSCRIPT,
    label: 'Transcrição de vídeo',
    description:
      'Baixa o vídeo, extrai o áudio, transcreve o conteúdo e salva o resultado em arquivo de texto.',
  },
  [JobTypeOptions.VIDEO_TO_SUMMARY]: {
    type: JobTypeOptions.VIDEO_TO_SUMMARY,
    label: 'Resumo de vídeo',
    description:
      'Baixa o vídeo, extrai o áudio, transcreve, resume o conteúdo e salva o resultado em arquivo markdown.',
  },
};
