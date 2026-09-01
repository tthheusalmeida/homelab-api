export const JobTypeOptions = {
  VIDEO_TRANSCRIPT: 'video-transcript',
} as const;

export type JobType = (typeof JobTypeOptions)[keyof typeof JobTypeOptions];

interface JobTypeData {
  type: string;
  label: string;
  description: string;
}

export const JobTypeConfig: Record<JobType, JobTypeData> = {
  [JobTypeOptions.VIDEO_TRANSCRIPT]: {
    type: JobTypeOptions.VIDEO_TRANSCRIPT,
    label: 'Transcrição de vídeo',
    description:
      'Baixa o vídeo, extrai o áudio, transcreve o conteúdo e salva o resultado em arquivo de texto.',
  },
};
