export const DocumentTypeOptions = {
  SUMMARY: 'summary',
  TRANSCRIPTION: 'transcription',
  ARTICLE: 'article',
} as const;

export const DocumentSourceOptions = {
  VIDEO: 'video',
  MANUAL: 'manual',
} as const;

/**
 * pending: gerado por um job e aguardando decisão (pasta de entrada).
 * published: aparece na biblioteca.
 * archived: removido logicamente; o arquivo continua em `lib/`, mas não
 * aparece na biblioteca e pode ser readicionado.
 */
export const DocumentStatusOptions = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type DocumentType =
  (typeof DocumentTypeOptions)[keyof typeof DocumentTypeOptions];

export type DocumentSource =
  (typeof DocumentSourceOptions)[keyof typeof DocumentSourceOptions];

export type DocumentStatus =
  (typeof DocumentStatusOptions)[keyof typeof DocumentStatusOptions];

export const MAX_CATEGORY_DEPTH = 4;

export interface DocumentMeta {
  id: string;
  title: string;
  type: DocumentType;
  source: DocumentSource;
  /** URL do vídeo de origem, quando existir. */
  sourceUrl?: string;
  status: DocumentStatus;
  /** Caminho hierárquico, do mais amplo ao mais específico (0 a 4 níveis). */
  category: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
