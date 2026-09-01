export function normalizeText(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function removeAllegedAuthorship(text: string): string {
  return text.replace(/\s*Legenda por Sônia Ruberti\.?\s*$/i, '').trim();
}
