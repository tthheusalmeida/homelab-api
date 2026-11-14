export interface ClassificationPromptInput {
  title: string;
  content: string;
  /** Caminhos de categoria já existentes, ex.: `Ciência > Química`. */
  categories: string[];
  /** Tags já existentes. */
  tags: string[];
}

export function buildClassificationPrompt(
  input: ClassificationPromptInput,
): string {
  const categories = input.categories.length
    ? input.categories.map((path) => `- ${path}`).join('\n')
    : '(nenhuma ainda)';

  const tags = input.tags.length ? input.tags.join(', ') : '(nenhuma ainda)';

  return `
Você organiza uma biblioteca pessoal de documentos. Classifique o documento abaixo.

# REGRAS

- **title**: título curto e claro, no idioma do documento, sem aspas. Se o título atual já for bom, mantenha-o.
- **category**: caminho de pastas do mais amplo ao mais específico, de 1 a 4 níveis (ex.: ["Ciência", "Química", "Ligações"]).
  - PREFIRA uma categoria existente (use o nome exatamente como está na lista). Só crie uma nova se nenhuma servir.
  - Prefira poucos níveis (2 ou 3). Não use nomes genéricos como "Geral" ou "Outros".
- **tags**: de 2 a 6 etiquetas curtas, em minúsculas, para busca. Reaproveite tags existentes quando fizerem sentido.
- Baseie-se somente no documento fornecido.

# CATEGORIAS EXISTENTES
${categories}

# TAGS EXISTENTES
${tags}

# DOCUMENTO

Título atual: ${input.title}

Conteúdo:
${input.content}

# SAÍDA

Responda APENAS com um JSON válido, sem texto antes ou depois e sem cercas de código, neste formato:
{"title": "...", "category": ["...", "..."], "tags": ["...", "..."]}
`.trim();
}
