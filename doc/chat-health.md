# Chat e Health

## Chat
- `POST chat` com `{ message, modelId, providerId, thinking? }` devolve `{ message }` com a resposta do modelo.
- Não guarda histórico: cada chamada é independente.
- Erros do provider são propagados.

## Health
- `GET health/system`: serviço `system` com o check `api` sempre `ok`.
- `GET health/ai`: serviço `ai` com um check por provider (`ollama`, `gemini`).
- Status possíveis: `ok` ou `error`. Um provider fora do ar vira `error` no seu check, sem derrubar o endpoint.
- Ollama é `ok` se `GET /api/tags` responde. Gemini é `ok` se `models.list` funciona.
