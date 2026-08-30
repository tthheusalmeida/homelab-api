export interface GeminiModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

export const pricing = new Map<string, GeminiModelPricing>([
  [
    'gemini-3.6-flash',
    {
      inputPerMillionTokens: 0.75,
      outputPerMillionTokens: 3.75,
    },
  ],
  [
    'gemini-3.5-flash',
    {
      inputPerMillionTokens: 0.75,
      outputPerMillionTokens: 4.5,
    },
  ],
  [
    'gemini-3.5-flash-lite',
    {
      inputPerMillionTokens: 0.3,
      outputPerMillionTokens: 2.5,
    },
  ],
  [
    'gemini-3.1-flash-lite',
    {
      inputPerMillionTokens: 0.25,
      outputPerMillionTokens: 1.5,
    },
  ],
]);
