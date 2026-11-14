# IA (modules/ai)

## Providers
- Existem dois providers: `ollama` (label "Ollama") e `gemini` (label "Gemini"), registrados no `AIService`.
- Pedir um provider desconhecido gera erro "Provider de IA não suportado".
- A lista de providers sempre sai na ordem ollama, gemini.

## Modelos
- Com provider informado, cada modelo ganha `id` (igual ao nome) e `label` (cada palavra separada por hífen vira capitalizada, hífen vira espaço; ex.: `gemini-3.5-flash` → "Gemini 3.5 Flash").
- Sem provider, devolve a junção dos modelos de todos os providers, sem `id`/`label`.
- Ollama: usa a URL de `OLLAMA_URL`. Lista via `GET /api/tags`, ordena por nome; qualquer item fora do formato esperado derruba a listagem inteira com erro.
- Gemini: só aparecem modelos que têm preço em `gemini.pricing.ts`; o prefixo `models/` é removido; ordenado por nome.
- Para um modelo aparecer no Gemini ele precisa ser cadastrado em `gemini.pricing.ts`.
- `cheapestModel()` devolve o modelo cadastrado com menor entrada + saída por milhão de tokens (hoje usado pela sugestão de classificação da biblioteca).

## Thinking
- Se o modelo suporta raciocínio, as opções são sempre `off` ("Desativado") e `on` ("Ativado"); senão, lista vazia.
- Ollama: suporta se `capabilities` do `/api/show` inclui `thinking`; resposta sem `capabilities` conta como sem suporte.
- Gemini: suporta se o modelo tem `thinking`.
- Erro na consulta gera mensagem com o nome do modelo.
- No chat do Ollama, `think` é `true` somente quando `thinking === 'on'`. No Gemini o parâmetro é ignorado.

## Chat
- O `AIService.chat` converte o DTO (`message`, `modelId`, `providerId`, `thinking?`) em request do provider.
- Gemini: sem texto na resposta é falha; qualquer falha vira "A requisição para o chat do Gemini falhou" e registra **uma** falha de uso.
- Ollama: resposta sem `message.content` string é inválida e vira falha de chat.
- Falhas registram uso com tokens e custo zerados e `success: false`.

## Custo
- Custo = `tokensEntrada/1.000.000 × preçoEntrada + tokensSaída/1.000.000 × preçoSaída`.
- Modelo sem preço cadastrado custa 0. Ollama é sempre 0.
- Tokens ausentes na resposta contam como 0. Total = total informado, ou entrada + saída.

## Usage (`AiUsageService`)
- Guarda em memória no máximo 1000 registros; o mais recente fica primeiro e o mais antigo é descartado.
- Cada registro recebe `id` (UUID) e `createdAt` (ISO).
- `getUsage(provider?)` filtra **todas** as seções pelo provider quando informado.
- Seções: `summary` (somas e latência média arredondada), `timeline` (por dia UTC, crescente), `byProvider`, `byModel` (chave provider+modelo) e `recentRequests` (até 100).
- Sem registros: tudo zerado e listas vazias.
- `AIService.usage(query)` devolve dados **fictícios** (mock) e não é usado pelo controller; o endpoint real é `GET ai/usage`.

## Endpoints
- `GET ai/providers`, `GET ai/providers/:providerId/models`, `GET ai/thinking?providerId&modelId`, `GET ai/usage?provider`.
