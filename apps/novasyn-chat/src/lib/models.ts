export interface ModelDef {
  id: string;
  label: string;
  provider: string;
}

export const MODELS: ModelDef[] = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'grok-3-latest', label: 'Grok 3', provider: 'xai' },
];

export function modelLabel(modelId: string): string {
  return MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}
