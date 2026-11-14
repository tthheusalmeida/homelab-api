# Vídeo, Whisper e arquivos (modules/video, ai/whisper)

## Download
- Aceita http e https. Segue redirecionamentos 3xx; o `Location` pode ser absoluto ou relativo (resolvido contra a URL atual).
- Status diferente de 200 rejeita com "Falha ao baixar. Status Code: N" e apaga o arquivo parcial.
- Erro de rede/escrita rejeita com mensagem específica e apaga o arquivo parcial.
- Destino padrão: `TEMP_VIDEO_DIR`; a pasta é criada se não existir.

## Conversão para áudio
- Usa `ffmpeg` (precisa estar no PATH): sem vídeo, mono, 16 kHz, WAV PCM 16 bits.
- O áudio tem o mesmo nome do vídeo com extensão `.wav`, em `TEMP_AUDIO_DIR`.
- Falha vira "Falha ao converter o vídeo para áudio".

## Transcrição (Whisper)
- Usa o executável `WHISPER_EXECUTABLE` e o modelo `WHISPER_MODEL`, ambos em `WHISPER_DIR`, idioma `pt`.
- Valida antes: executável, modelo e arquivo de áudio devem existir; senão erro específico e o whisper não roda.
- Lê o `.txt` gerado, devolve o texto sem espaços nas pontas e **sempre** tenta apagar o `.txt` (falha ao apagar é ignorada).
- Falha do whisper vira "Falha ao transcrever o áudio".

## Salvar arquivo
- Grava `nome + extensão` em UTF-8; a extensão padrão é `.md` e a pasta padrão é `TEMP_DOCS_DIR` (criada se não existir); devolve o caminho.

## Resumo
- Monta o prompt seguido da transcrição e envia ao `AIService.chat`. O prompt depende do **nível de detalhe** (`buildSummaryPrompt`): `brief` (prompt original, resumo curto), `detailed` (padrão; preserva conceitos, explicações, comandos e exemplos) e `study` (material de consulta quase completo, com agrupamentos Conceitos-chave / Passo a passo / Comandos e exemplos / Pontos de atenção / Para revisar, só com o que existir na fonte). Os três mantêm as regras de fidelidade à fonte; muda só a seção "NÍVEL DE DETALHE".
- Em `detailed` e `study`, transcrições com mais de 12000 caracteres são divididas em partes (`splitText`, cortando no fim de frases); cada parte é resumida em uma chamada (com a nota "parte i de n"; da 2ª em diante, sem repetir o título principal) e os resumos são juntados com linha em branco. `brief` sempre vai em uma chamada só.
- `thinking` assume `off` se não informado.
- Falha vira "Falha ao gerar o resumo".

## Apagar temporários
- `deleteVideo`/`deleteAudio` removem o arquivo; se não existir, lançam erro específico (vídeo ou áudio).

## Utilitários de texto
- `normalizeText`: quebras de linha viram espaço, espaços repetidos viram um, remove espaços das pontas.
- `removeAllegedAuthorship`: remove "Legenda por Sônia Ruberti" (com ou sem ponto, qualquer caixa) **apenas no final** do texto.
