# CLAUDE.md — Back (homelab-api)

API NestJS 11 (TypeScript) do HomeLab. Prefixo global: `api/v1`. Porta: `PORT` ou 3000. CORS liberado só para `http://localhost:5173` (front).

## Como consultar regras de negócio
**Leia `doc/` antes de abrir código.** Cada arquivo descreve em frases as regras de um módulo. Só abra o código se a regra não estiver documentada.

| Arquivo | Assunto |
|---|---|
| `doc/ai.md` | Providers (Ollama/Gemini), modelos, thinking, custo, uso (usage) |
| `doc/jobs.md` | Job, ciclo de vida, etapas, fila (runner), pipelines |
| `doc/video.md` | Download, conversão para áudio, Whisper, resumo, arquivos temporários |
| `doc/chat-health.md` | Chat e health checks |
| `doc/testing.md` | Convenções de teste e como rodar |

## Comandos
- `npm run start:dev` — sobe com watch
- `npm test` — testes unitários (Jest, `src/**/*.spec.ts`)
- `npm run test:cov` — cobertura
- `npm run lint` / `npm run build`

## Mapa do código (`src/`)
- `main.ts` / `app.module.ts` — bootstrap, CORS, prefixo, Swagger (`config/swagger`)
- `config/common/constants.ts` — `API_PREFIX`
- `modules/ai/` — `ai.service` (roteia providers), `providers/{ollama,gemini}` (+ `*.pricing.ts`), `usage/` (métricas em memória), `whisper/` (transcrição local), `prompts/`, `dto/`
- `modules/chat/` — `POST chat`, delega ao `AIService`
- `modules/health/{ai,system}` — `GET health/ai`, `GET health/system`
- `modules/jobs/` — `domain/` (Job, status), `application/` (JobService, JobRunner), `infrastructure/repositories/` (in-memory), `processors/{video-to-transcript,video-to-resume}`, `jobs.types.ts` (tipos e pipelines)
- `modules/video/` — `VideoService` (download, ffmpeg, salvar, resumir, apagar)
- `utils/` — `text.ts`, `type-guards.ts`

## Convenções
- Imports absolutos via `src/...` (Jest mapeia em `moduleNameMapper`).
- Mensagens de erro e labels de usuário em **português**.
- Estado é **em memória** (jobs e usage somem ao reiniciar). Não há banco.
- Caminhos de arquivo/binários são fixos no código (`D:/homelab/...`): `temp/video`, `temp/audio`, `temp/txt`, `ai/whisper`.
- `GEMINI_API_KEY` é obrigatória: sem ela a API não sobe (o `GeminiProvider` lança no construtor).
- Dependências externas necessárias: `ffmpeg` no PATH, Ollama em `localhost:11434`, `whisper-cli.exe` + modelo em `D:/homelab/ai/whisper`.

## Regras para testes (OBRIGATÓRIO)
- Todo código novo ou alterado precisa de teste unitário `*.spec.ts` ao lado do arquivo.
- **Nome de cada teste: `when <situação>, should <resultado>`** (ex.: `it('when the id does not exist, should return null')`).
- Se uma mudança quebrar um teste existente, decida se é regressão (corrija o código) ou mudança de regra (atualize teste **e** `doc/`).
- Ao mudar uma regra de negócio, atualize o `doc/` correspondente na mesma entrega.
- Não chame serviços reais (rede, ffmpeg, whisper, Gemini) em testes: use mocks.
- `test/app.e2e-spec.ts` é o boilerplate do Nest e não reflete a API real; não usar como referência.
