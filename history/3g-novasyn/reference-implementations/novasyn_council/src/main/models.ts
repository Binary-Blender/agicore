import type { AIModel } from '../shared/types';

export const AVAILABLE_MODELS: AIModel[] = [
  // Anthropic
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000, requiresKey: true },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', contextWindow: 200000, requiresKey: true },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic', contextWindow: 200000, requiresKey: true },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, requiresKey: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, requiresKey: true },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', contextWindow: 1047576, requiresKey: true },
  // Google
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', contextWindow: 1048576, requiresKey: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', contextWindow: 1048576, requiresKey: true },
  // xAI
  { id: 'grok-3', name: 'Grok 3', provider: 'xai', contextWindow: 131072, requiresKey: true },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xai', contextWindow: 131072, requiresKey: true },
  // BabyAI (HuggingFace Space — OpenAI-compatible API)
  { id: 'babyai-auto', name: 'BabyAI Auto', provider: 'babyai', contextWindow: 4096, requiresKey: true },
  { id: 'hf_qwen_coder_7b', name: 'BabyAI Qwen Coder 7B', provider: 'babyai', contextWindow: 4096, requiresKey: true },
  { id: 'hf_llama_8b', name: 'BabyAI Llama 8B', provider: 'babyai', contextWindow: 4096, requiresKey: true },
  { id: 'hf_qwen3_8b', name: 'BabyAI Qwen3 8B', provider: 'babyai', contextWindow: 4096, requiresKey: true },
  { id: 'hf_deepseek_r1_7b', name: 'BabyAI DeepSeek R1 7B', provider: 'babyai', contextWindow: 4096, requiresKey: true },
];
