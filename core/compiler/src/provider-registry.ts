// Canonical provider registry — single source of truth for all generators.
// `hasTemplate` = ai-service.ts emits a Rust dispatch function for this provider.
// Key-storage-only providers (e.g. babyai) have hasTemplate: false but still
// appear in ApiKeyModal and SettingsView so users can configure their credentials.

export interface ProviderMeta {
  label: string;
  placeholder: string;
  url: string;
  hasTemplate: boolean;
}

export const PROVIDER_REGISTRY: Record<string, ProviderMeta> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    url: 'https://console.anthropic.com/settings/keys',
    hasTemplate: true,
  },
  openai: {
    label: 'OpenAI',
    placeholder: 'sk-...',
    url: 'https://platform.openai.com/api-keys',
    hasTemplate: true,
  },
  google: {
    label: 'Google (Gemini)',
    placeholder: 'AIza...',
    url: 'https://aistudio.google.com/app/apikey',
    hasTemplate: true,
  },
  xai: {
    label: 'xAI (Grok)',
    placeholder: 'xai-...',
    url: 'https://x.ai/api',
    hasTemplate: true,
  },
  huggingface: {
    label: 'HuggingFace',
    placeholder: 'hf_...',
    url: 'https://huggingface.co/settings/tokens',
    hasTemplate: true,
  },
  babyai: {
    label: 'BabyAI (HuggingFace)',
    placeholder: 'hf_...',
    url: 'https://huggingface.co/settings/tokens',
    hasTemplate: false,
  },
};

export function providerMeta(id: string): ProviderMeta {
  return PROVIDER_REGISTRY[id] ?? { label: id, placeholder: 'API key', url: '#', hasTemplate: false };
}
