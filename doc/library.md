# Biblioteca (modules/library)

Fundação, armazenamento, índice, busca, operações e API.

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

## Armazenamento (`LibraryStorage`)
- Os arquivos `.md` são a fonte da verdade. Pendentes ficam em `TEMP_DOCS_DIR`; publicados e arquivados ficam em `LIB_DIR`, dentro das pastas da categoria (1 a 4 níveis).
- Gravar escolhe a pasta pelo `status`: pendente vai para a entrada; publicado e arquivado vão para a pasta da categoria. Publicar sem categoria, ou com mais de 4 níveis, dá erro.
- A pasta da categoria reaproveita uma já existente, mesmo com diferença de maiúscula, acento ou espaços; só cria quando não existe.
- A gravação é atômica: escreve em `.tmp` e renomeia. Arquivos que não terminam em `.md` são ignorados nas listagens.
- Gravar de novo o mesmo id e título sobrescreve o arquivo. Se o título muda, o nome muda; quem altera o título é responsável por apagar o arquivo antigo.
- Procurar por id usa só o nome do arquivo (não lê o conteúdo) e compara o id inteiro (`abc` não casa com `xabc`).
- Ler valida o frontmatter e exige que o id do nome do arquivo seja igual ao do frontmatter; erro cita o nome do arquivo.
- **A pasta manda na categoria:** ao ler um documento publicado ou arquivado de `LIB_DIR`, a categoria passa a ser o caminho de pastas onde o arquivo está (1 a 4 níveis válidos), mesmo que o frontmatter diga outra coisa. Assim mover o arquivo de pasta muda a categoria depois de reindexar. Arquivo direto na raiz de `LIB_DIR`, com mais de 4 níveis ou com nome de pasta inválido mantém a categoria do frontmatter; pendentes (entrada) nunca usam a pasta. O frontmatter não é reescrito: só é atualizado na próxima gravação (publicar, readicionar).
- Apagar remove o arquivo e as pastas de categoria que ficarem vazias (nunca a raiz `LIB_DIR`). Só aceita caminhos dentro de `LIB_DIR` ou `TEMP_DOCS_DIR`.

## Índice em memória (`LibraryIndex`)
- Guarda só **metadados** por id: meta, caminho, nome do arquivo, prévia (até 200 caracteres de texto puro) e uma chave de busca normalizada (título, nome do arquivo, tags e categorias). O corpo do texto **não** fica em memória.
- É reconstruído dos arquivos (entrada e biblioteca) ao iniciar a API e em `POST /library/reindex`. Cada operação (publicar, arquivar, descartar, criar artigo) atualiza o índice.
- Arquivo inválido (sem frontmatter, id diferente do nome etc.) é ignorado e listado em `errors` (nome do arquivo + motivo); não derruba o índice.
- Mesmo id em dois arquivos (ex.: falha no meio de uma movimentação): vale o de `updatedAt` mais recente e o outro vira erro.

## Busca e filtros (`LibrarySearch`)
- Por padrão lista só `published`. `status` aceita `published`, `archived` e `pending`.
- Filtros combináveis (todos precisam valer): `type`, `source`, `category` (caminho; casa o nível e tudo abaixo dele), `tag` (o documento precisa ter todas).
- Texto (`q`): divide em palavras; cada palavra deve aparecer nos metadados (título, nome do arquivo, tags, categorias) **ou** no conteúdo. Ignora maiúscula e acento.
- Primeiro filtra pelos metadados em memória; só então lê do disco (8 por vez) os arquivos que ainda não casaram por metadados. Cada resultado indica `matchedIn`: `metadata` ou `content`.
- Ordenação: `title` (padrão, alfanumérica natural pt-BR) ou `recent` (mais novos primeiro). Valor inválido em tipo, origem, status ou ordenação dá 400.
- Os resultados trazem metadados, nome do arquivo e prévia, nunca o corpo.

## Operações (`LibraryService`)
- **Entrada:** documentos `pending` do mais recente ao mais antigo.
- **Adicionar (`publish`):** vale para pendente ou arquivado. Define título (opcional, mantém o atual), categoria (1 a 4 níveis, obrigatória) e tags (opcionais, mantém as atuais). Move o arquivo para a pasta da categoria, apaga o antigo só depois de gravar o novo e atualiza `updatedAt`. Documento já publicado dá 400.
- **Editar (`update`):** só de documento **publicado** (pendente/arquivado dá 400). Campos opcionais: `title`, `category` (1 a 4 níveis), `tags` e `content`; o que não vier mantém o valor atual. Conteúdo ou título em branco dá 400. Trocar título renomeia o arquivo e trocar categoria move para a nova pasta; o arquivo antigo (e pastas que ficarem vazias) só é apagado depois de gravar o novo, e categoria inválida não altera nada. Atualiza `updatedAt` e mantém `createdAt`, tipo, origem e `sourceUrl`.
- **Remover da biblioteca (`archive`):** só de publicado. Remoção lógica: `status: archived`, o arquivo continua em `lib/` e some da biblioteca, da árvore de categorias e das tags. Pode ser readicionado.
- **Descartar (`discard`):** apaga o arquivo de verdade, só de pendente ou arquivado. Publicado dá 400 ("remova da biblioteca antes").
- **Criar artigo:** título e conteúdo obrigatórios, categoria de 1 a 4 níveis. Nasce publicado, `type: article`, `source: manual`, id uuidv7.
- **Categorias:** árvore só dos publicados, com contagem por nível (inclui os níveis abaixo), em ordem natural. **Tags:** só dos publicados, com contagem, em ordem natural.
- Id inexistente dá 404. Categoria inválida não altera nada (o arquivo continua onde estava).

## Sugestão de classificação com IA (`LibraryClassifier`)
- `POST documents/:id/suggest` (`modelId?`) pede ao **Gemini** um título, uma categoria e tags para o documento (qualquer status). Não altera nada: o usuário revisa e só então publica.
- Modelo: o informado; sem `modelId`, o mais barato de `gemini.pricing.ts` (menor entrada + saída por milhão de tokens). O uso entra no `usage` como qualquer chat.
- O prompt leva o título, os primeiros 6000 caracteres do conteúdo, as categorias publicadas (caminhos `A > B`) e até 60 tags mais usadas, pedindo para **preferir** o que já existe.
- A resposta deve ser um JSON; cercas de código ao redor são toleradas. A categoria é limitada a 4 níveis, sanitizada e, em cada nível, reaproveita a grafia da pasta existente (ignorando acento e maiúscula). Tags: minúsculas, sem duplicadas, reaproveitam a grafia das existentes, no máximo 6. Título vazio mantém o atual.
- Falha da IA, resposta sem JSON, categoria ausente/vazia ou com nome inválido dão 502 com mensagem em português. Id inexistente dá 404 (sem chamar a IA).

## API (`/api/v1/library`)
- `GET documents` (`q`, `category` repetido por nível, `type`, `source`, `tag` repetido, `status`, `sort`), `GET documents/:id` (meta + conteúdo), `GET inbox`, `GET categories`, `GET tags`, `GET index` (total e erros), `POST reindex`.
- `POST documents/article` (`title`, `category[]`, `tags[]`, `content`), `POST documents/:id/publish` (`title?`, `category[]`, `tags[]?`), `PATCH documents/:id` (`title?`, `category[]?`, `tags[]?`, `content?`), `POST documents/:id/suggest` (`modelId?`), `POST documents/:id/archive`, `DELETE documents/:id` (204).
- Campos de lista (`category`, `tags`) que não sejam lista de textos dão 400.

## Pipelines de vídeo
- Resumo e transcrição gravam, em `TEMP_DOCS_DIR`, `<slug>_<jobId>.md` com frontmatter `status: pending`, `source: video`, `sourceUrl` com a URL do vídeo e o texto como corpo.
- Título padrão: o rótulo do job ("Resumo de vídeo" / "Transcrição de vídeo"), a menos que o job tenha recebido título; categoria e tags informadas na criação do job (ver `doc/jobs.md`) também vão no frontmatter pendente. O usuário ajusta tudo ao adicionar à biblioteca.
