// USD per one million tokens. Keep centralized and review against the provider pricing page.
export const modelPricing: Record<string, { input: number; cachedInput: number; output: number }> = {
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.75, output: 4.5 },
};

export function estimateModelCost(model: string, inputTokens: number, outputTokens: number, cachedInputTokens = 0) {
  const configured = modelPricing[model] || {
    input: Number(process.env.OPENAI_INPUT_USD_PER_MILLION || 0),
    cachedInput: Number(process.env.OPENAI_INPUT_USD_PER_MILLION || 0),
    output: Number(process.env.OPENAI_OUTPUT_USD_PER_MILLION || 0),
  };
  return ((inputTokens - cachedInputTokens) * configured.input + cachedInputTokens * configured.cachedInput + outputTokens * configured.output) / 1_000_000;
}
