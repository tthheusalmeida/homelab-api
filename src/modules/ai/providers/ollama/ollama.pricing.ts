export interface OllamaModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

export const pricing = new Map<string, OllamaModelPricing>([
  [
    'qwen3.5:1.7b',
    {
      inputPerMillionTokens: 0,
      outputPerMillionTokens: 0,
    },
  ],
  [
    'qwen3.5:4b',
    {
      inputPerMillionTokens: 0,
      outputPerMillionTokens: 0,
    },
  ],
  [
    'qwen3.5:8b',
    {
      inputPerMillionTokens: 0,
      outputPerMillionTokens: 0,
    },
  ],
]);
