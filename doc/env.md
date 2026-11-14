# Variáveis de ambiente (back)

Definidas em `back/.env` (não versionado). O modelo está em `back/.env.example`. **Todas são obrigatórias**, exceto `PORT` (padrão 3000) — se alguma faltar ou estiver vazia, a API não sobe e a mensagem lista todas as que faltam.

| Variável | Para que serve |
|---|---|
| `GEMINI_API_KEY` | Chave da API do Gemini (sem ela o provider lança no construtor) |
| `PORT` | Porta da API (opcional) |
| `CORS_ORIGIN` | Origem do front permitida no CORS |
| `LIB_DIR` | Pasta da biblioteca (documentos publicados e arquivados) |
| `TEMP_DOCS_DIR` | Pasta de entrada: documentos gerados pelos jobs aguardando decisão |
| `TEMP_VIDEO_DIR` | Vídeos baixados (temporário) |
| `TEMP_AUDIO_DIR` | Áudios convertidos (temporário) |
| `WHISPER_DIR` | Pasta do Whisper |
| `WHISPER_EXECUTABLE` | Nome do executável dentro de `WHISPER_DIR` |
| `WHISPER_MODEL` | Nome do arquivo de modelo dentro de `WHISPER_DIR` |
| `OLLAMA_URL` | URL do Ollama |

## Regras
- Nenhum caminho, URL ou porta pode ficar fixo no código. Ao criar uma variável nova: adicione em `config/env/env.ts` (entra na validação), no `.env.example` e nesta tabela.
- Os serviços recebem `AppConfig` por injeção e usam `config.get(EnvKeys.X)`. Nos testes, injete um objeto `{ get }` com pastas temporárias.
- `validateEnv` roda na inicialização (`ConfigModule.forRoot({ validate })`).
