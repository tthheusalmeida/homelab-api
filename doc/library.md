# Biblioteca (modules/library) — fundação

Esta seção descreve o que já existe. A indexação, a API e a interface virão nas próximas etapas.

## Documentos
- Todo conteúdo gerado ou escrito é um arquivo **Markdown (`.md`) com frontmatter YAML**. Não se usa mais `.txt`.
- Campos: `id`, `title`, `type`, `source`, `sourceUrl` (opcional), `status`, `category`, `tags`, `createdAt`, `updatedAt`.
- `type`: `summary` (Resumo), `transcription` (Transcrição) ou `article` (Criação). `source`: `video` ou `manual`.
- `id` é o id do job (uuidv7) e é a referência principal do documento.
- `category` é o caminho hierárquico, do mais amplo ao mais específico, com **0 a 4 níveis** (vazio enquanto pendente; de 1 a 4 para publicar).
- Strings são gravadas entre aspas (um id numérico não vira número); chaves em texto simples.
- Ler um arquivo sem frontmatter, com YAML inválido, campo obrigatório ausente, valor desconhecido, data inválida ou mais de 4 níveis dá erro descritivo.
- `tags` ficam em minúsculas, sem espaços nas pontas, sem vazias e sem duplicadas (ignorando acento e maiúscula).

## Ciclo de vida (`status`)
- `pending`: acabou de ser gerado por um job; fica na pasta `TEMP_DOCS_DIR` aguardando a decisão do usuário.
- `published`: está na biblioteca (`LIB_DIR`) e aparece nas buscas.
- `archived`: removido logicamente; o arquivo continua em `LIB_DIR`, mas não aparece na biblioteca e pode ser readicionado.
- Adicionar à biblioteca move o arquivo da entrada para `LIB_DIR` e o apaga da entrada. Só "descartar" apaga de verdade.

## Nome do arquivo
- Padrão `<slug>_<id>.md` (ex.: `praticas_da_primeira_maneira_01a1d993-....md`). O slug vem primeiro para o nome ordenar por tema.
- Slug: minúsculas, sem acentos, palavras separadas por `_`, no máximo 60 caracteres; título vazio vira `sem_titulo`.
- O id é tudo depois do último `_` (o uuid não tem `_`). Nome que não termina em `.md` ou sem slug/id é inválido.

## Categorias (nomes de pasta)
- Cada nível vira uma pasta em `LIB_DIR`. Acentos e espaços são mantidos; caracteres inválidos (`< > : " / \ | ? *` e de controle) são removidos; pontos e espaços nas pontas também.
- Rejeita nome vazio, só pontos, acima de 60 caracteres e nomes reservados do Windows (`CON`, `NUL`, `COM1`…). Isso impede escapar da pasta com `..`.
- Comparação de nomes ignora maiúscula, acento e espaços extras (para reaproveitar pasta existente).
- Ordenação alfanumérica natural em pt-BR: "Aula 2" antes de "Aula 10"; acentuadas junto da letra base.

## Pipelines de vídeo
- Resumo e transcrição gravam, em `TEMP_DOCS_DIR`, `<slug>_<jobId>.md` com frontmatter `status: pending`, `source: video`, `sourceUrl` com a URL do vídeo e o texto como corpo.
- Título padrão: o rótulo do job ("Resumo de vídeo" / "Transcrição de vídeo"); o usuário poderá ajustar ao adicionar à biblioteca.
