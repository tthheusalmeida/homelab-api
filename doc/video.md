# Vídeo, Whisper e arquivos (modules/video, ai/whisper)

## Download
- Aceita http e https. Segue redirecionamentos 3xx; o `Location` pode ser absoluto ou relativo (resolvido contra a URL atual).
- Status diferente de 200 rejeita com "Falha ao baixar. Status Code: N" e apaga o arquivo parcial.
- Erro de rede/escrita rejeita com mensagem específica e apaga o arquivo parcial.
- Destino padrão: `D:/homelab/temp/video`; a pasta é criada se não existir.

## Conversão para áudio
- Usa `ffmpeg` (precisa estar no PATH): sem vídeo, mono, 16 kHz, WAV PCM 16 bits.
- O áudio tem o mesmo nome do vídeo com extensão `.wav`, em `D:/homelab/temp/audio`.
- Falha vira "Falha ao converter o vídeo para áudio".

## Transcrição (Whisper)
- Usa `whisper-cli.exe` e o modelo `ggml-large-v3-turbo.bin` em `D:/homelab/ai/whisper`, idioma `pt`.
- Valida antes: executável, modelo e arquivo de áudio devem existir; senão erro específico e o whisper não roda.
- Lê o `.txt` gerado, devolve o texto sem espaços nas pontas e **sempre** tenta apagar o `.txt` (falha ao apagar é ignorada).
- Falha do whisper vira "Falha ao transcrever o áudio".

## Salvar arquivo
- Grava `nome + extensão` em UTF-8 (padrão `D:/homelab/temp/txt`), criando a pasta; devolve o caminho.

## Resumo
- Monta o prompt (`SummarySpecialistPrompt`) seguido da transcrição e envia ao `AIService.chat`.
- `thinking` assume `off` se não informado.
- Falha vira "Falha ao gerar o resumo".

## Apagar temporários
- `deleteVideo`/`deleteAudio` removem o arquivo; se não existir, lançam erro específico (vídeo ou áudio).

## Utilitários de texto
- `normalizeText`: quebras de linha viram espaço, espaços repetidos viram um, remove espaços das pontas.
- `removeAllegedAuthorship`: remove "Legenda por Sônia Ruberti" (com ou sem ponto, qualquer caixa) **apenas no final** do texto.
