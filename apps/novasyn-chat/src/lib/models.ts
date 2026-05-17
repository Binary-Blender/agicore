export interface ModelDef {
  id: string;
  label: string;
  provider: string;
  contextWindow: number;
}

export const MODELS: ModelDef[] = [
  { id: 'claude-sonnet-4-20250514',         label: 'Claude Sonnet 4',   provider: 'anthropic', contextWindow: 200_000 },
  { id: 'claude-haiku-4-5-20251001',         label: 'Claude Haiku 4.5', provider: 'anthropic', contextWindow: 200_000 },
  { id: 'gpt-4o',                            label: 'GPT-4o',           provider: 'openai',    contextWindow: 128_000 },
  { id: 'gpt-4o-mini',                       label: 'GPT-4o Mini',      provider: 'openai',    contextWindow: 128_000 },
  { id: 'gemini-2.5-flash-preview-05-20',    label: 'Gemini 2.5 Flash', provider: 'google',    contextWindow: 1_000_000 },
  { id: 'grok-3-latest',                     label: 'Grok 3',           provider: 'xai',       contextWindow: 131_072 },
];

export function modelLabel(modelId: string): string {
  return MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

export function modelContextWindow(modelId: string): number {
  return MODELS.find((m) => m.id === modelId)?.contextWindow ?? 128_000;
}
