const MAX_PREVIEW = 200;

/**
 * Trecho de texto puro para listagens: remove a marcação Markdown (títulos,
 * links, imagens, blocos de código, listas, tabelas) e corta em 200
 * caracteres.
 */
export function makePreview(body: string, max = MAX_PREVIEW): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+>]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/-{3,}/g, ' ')
    .replace(/[*_~`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
