# Jobs (modules/jobs)

## Tipos
- Dois tipos: `video-to-transcript` ("Transcrição de vídeo") e `video-to-summary` ("Resumo de vídeo"). Definidos em `jobs.types.ts`.
- Criar job com tipo desconhecido gera erro.
- `GET jobs/types` devolve a configuração de cada tipo (label, descrição, etapas).

## Pipelines (ordem das etapas)
- Transcrição: baixar vídeo → converter para áudio → remover vídeo → transcrever → salvar transcrição → remover áudio.
- Resumo: igual, mas com **resumir conteúdo** entre transcrever e salvar.
- Nomes das etapas: `download-video`, `convert-to-audio`, `delete-video`, `transcribe`, `summarize`, `save-file`, `delete-audio`.

## Job (entidade)
- Nasce `pending`, com `id` UUID v7, `createdAt`, label e cópia das etapas do tipo (todas `pending`).
- `start`: só de `pending` para `running` (grava `startedAt`); outro estado gera erro.
- `complete`: só de `running` para `completed` (grava `completedAt`); outro estado gera erro.
- `fail(msg)`: vai para `failed` e guarda a mensagem, de qualquer estado.
- Etapa inexistente gera erro. `runStep` marca `running`, depois `completed`; se o callback falhar marca `failed` e relança o erro original.
- Quando uma etapa falha, as seguintes ficam `pending`.

## Fila (`JobRunner`)
- Jobs rodam **um por vez**, na ordem de chegada (fila em memória).
- Erro do processor marca o job `failed` com a mensagem do erro (ou "Erro desconhecido" se não for `Error`) e a fila segue.
- O job é salvo no repositório ao iniciar, ao completar e ao falhar.

## Serviço e repositório
- `JobService.create` cria e salva; `findById` inexistente lança `NotFoundException` (404); `findAll` lista tudo.
- Repositório é em memória (Map por id): salvar o mesmo id substitui; busca inexistente devolve null.

## Endpoints
- `GET jobs`, `GET jobs/types`, `GET jobs/:id`.
- `POST jobs/video-to-transcript` (body `{ url }`) e `POST jobs/video-to-summary` (body `{ url, providerId, modelId, thinking }`): criam o job, enfileiram e respondem na hora `{ id, status }` (status `pending`). O acompanhamento é por polling em `GET jobs`/`GET jobs/:id`.

## Processors
- Ambos baixam o vídeo com nome `<jobId>.mp4`, convertem, apagam o vídeo, transcrevem, **normalizam** o texto e **removem a assinatura** "Legenda por Sônia Ruberti".
- Transcrição salva `<jobId>.txt`; resumo salva `<jobId>.md`.
- O áudio só é apagado ao final com sucesso; se algo falhar antes, os temporários ficam no disco.
