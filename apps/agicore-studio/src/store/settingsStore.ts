// Settings store — persistent across sessions via the shared API-keys
// file (per OQ-4). Loads on app mount, writes on save. In-memory state
// holds a draft the panel can edit without committing until the user
// clicks Save.

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'huggingface';

export const PROVIDERS: { id: ProviderId; label: string; placeholder: string }[] = [
  { id: 'anthropic',   label: 'Anthropic',    placeholder: 'sk-ant-…' },
  { id: 'openai',      label: 'OpenAI',       placeholder: 'sk-…' },
  { id: 'google',      label: 'Google',       placeholder: 'AI…' },
  { id: 'xai',         label: 'xAI (Grok)',   placeholder: 'xai-…' },
  { id: 'huggingface', label: 'HuggingFace',  placeholder: 'hf_…' },
];

type Keys = Record<string, string>;

interface SettingsStore {
  keys: Keys;
  loaded: boolean;
  saving: boolean;
  error: string | null;

  load: () => Promise<void>;
  setKey: (provider: ProviderId, value: string) => void;
  save: () => Promise<void>;
  /** True when at least one provider has a non-empty key configured. */
  hasAnyKey: () => boolean;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  keys: {},
  loaded: false,
  saving: false,
  error: null,

  load: async () => {
    try {
      // Rust returns `ApiKeys(pub BTreeMap)` — serde flattens the tuple
      // struct so the wire shape is just the map.
      const keys = await invoke<Keys>('read_api_keys');
      set({ keys: keys ?? {}, loaded: true, error: null });
    } catch (e) {
      set({
        loaded: true,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  setKey: (provider, value) =>
    set((s) => ({ keys: { ...s.keys, [provider]: value } })),

  save: async () => {
    set({ saving: true, error: null });
    try {
      // Strip empty entries so the file doesn't accumulate clutter.
      const trimmed: Keys = {};
      for (const [k, v] of Object.entries(get().keys)) {
        if (v && v.trim()) trimmed[k] = v.trim();
      }
      await invoke<void>('write_api_keys', { keys: trimmed });
      set({ keys: trimmed, saving: false });
    } catch (e) {
      set({
        saving: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  hasAnyKey: () => Object.values(get().keys).some((v) => v && v.trim().length > 0),
}));
