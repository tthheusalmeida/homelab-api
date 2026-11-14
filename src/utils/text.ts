export function normalizeText(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function removeAllegedAuthorship(text: string): string {
  return text.replace(/\s*Legenda por Sônia Ruberti\.?\s*$/i, '').trim();
}

/**
 * Divide um texto longo em blocos de até `maxChars`, cortando no fim de frases
 * (e, se uma frase sozinha passar do limite, entre palavras).
 */
export function splitText(text: string, maxChars: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => splitLongSentence(sentence, maxChars));

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current && current.length + 1 + sentence.length > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitLongSentence(sentence: string, maxChars: number): string[] {
  if (sentence.length <= maxChars) {
    return [sentence];
  }

  const parts: string[] = [];
  let current = '';

  for (const word of sentence.split(' ')) {
    if (current && current.length + 1 + word.length > maxChars) {
      parts.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}
