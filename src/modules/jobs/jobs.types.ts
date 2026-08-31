export const JobTypeOptions = {
  VIDEO_TRANSCRIPT: 'video-transcript',
} as const;

export type JobType = (typeof JobTypeOptions)[keyof typeof JobTypeOptions];

export const JobTypeConfig: Record<JobType, { description: string }> = {
  [JobTypeOptions.VIDEO_TRANSCRIPT]: {
    description:
      'Baixa o vídeo, extrai o áudio, transcreve o conteúdo e salva o resultado em arquivo de texto.',
  },
};
