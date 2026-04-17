import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODELS = {
  "claude-opus-4-7": { label: "Claude Opus 4.7", tier: "agency" },
  "claude-sonnet-4-6": { label: "Claude Sonnet 4.6", tier: "solo" },
  "claude-haiku-4-5-20251001": { label: "Claude Haiku 4.5", tier: "free" },
} as const;

export type ModelId = keyof typeof MODELS;

export interface RunAgentOptions {
  model: ModelId;
  systemPrompt?: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  maxTokens?: number;
}

export async function runAgent({
  model,
  systemPrompt,
  messages,
  tools,
  maxTokens = 4096,
}: RunAgentOptions) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools,
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  return { response, inputTokens, outputTokens, costUsd };
}

// Approximate pricing per 1M tokens (as of 2025)
const PRICING: Record<ModelId, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
};

function calculateCost(model: ModelId, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}
