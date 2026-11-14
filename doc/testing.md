# Testes (back)

- Framework: Jest + ts-jest. Config no `package.json` (`rootDir: src`, `testRegex: .*\.spec\.ts$`).
- Imports `src/...` funcionam nos testes via `moduleNameMapper`.
- Rodar: `npm test` (tudo), `npx jest caminho/arquivo.spec.ts` (um), `npm run test:cov` (cobertura).
- Cada arquivo `x.ts` tem `x.spec.ts` ao lado. Controllers/health/chat agrupados em um spec por módulo quando pequenos.

## Padrão de nome (obrigatório)
`it('when <situação>, should <resultado>', ...)`. `describe` agrupa por classe/método.

## O que é mockado
- Rede/IA: `HttpService` (Ollama) e `@google/genai` (Gemini) são mockados.
- Binários: `child_process.execFile` (ffmpeg e whisper) é mockado; `fs` é mockado no Whisper.
- Download: usa servidor HTTP local real em porta efêmera.
- Arquivos: testes de `VideoService` usam pasta temporária do SO, removida ao final.

## Cobertura atual
utils, Job, JobService, JobRunner, repositório, tipos/pipelines, processors, JobController, AIService, AiUsageService, providers Ollama/Gemini, Whisper, VideoService, AIController, Chat, Health.

Não coberto: bootstrap (`main.ts`), módulos Nest (`*.module.ts`), Swagger, DTOs e e2e.
