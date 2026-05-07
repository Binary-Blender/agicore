/**
 * Model Discovery Service
 *
 * Queries AI provider APIs to discover available models and their capabilities.
 * Results are cached to %APPDATA%/NovaSyn/model-cache.json with a 24-hour TTL,
 * shared across all NovaSyn + Binary Blender apps.
 *
 * Providers supported:
 *   - Anthropic: Full capabilities + context windows (richest API)
 *   - Google:    Context windows + supported generation methods
 *   - OpenAI:    Model IDs + known context window lookup (API lacks metadata)
 *   - xAI:       Model IDs + known context window lookup (OpenAI-compatible)
 */

import path from 'path';
import fs from 'fs';
import os from 'os';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoveredModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  modelId: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: {
    chat: boolean;
    structuredOutput: boolean;
    thinking: boolean;
    vision: boolean;
  };
  createdAt: string;
}

interface ProviderCache {
  lastFetched: string;
  models: DiscoveredModel[];
}

interface ModelCacheFile {
  version: number;
  providers: Record<string, ProviderCache>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_TIMEOUT = 15000; // 15s per provider

// ─── Cache I/O ───────────────────────────────────────────────────────────────

function getCachePath(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), '.config');
  const dir = path.join(appData, 'NovaSyn');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'model-cache.json');
}

function loadCache(): ModelCacheFile {
  try {
    const raw = fs.readFileSync(getCachePath(), 'utf-8');
    const cache = JSON.parse(raw) as ModelCacheFile;
    if (cache.version === CACHE_VERSION) return cache;
  } catch {}
  return { version: CACHE_VERSION, providers: {} };
}

function saveCache(cache: ModelCacheFile): void {
  try {
    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('[ModelDiscovery] Failed to save cache:', err);
  }
}

function isFresh(cache: ModelCacheFile, provider: string): boolean {
  const entry = cache.providers[provider];
  if (!entry?.lastFetched) return false;
  return Date.now() - new Date(entry.lastFetched).getTime() < CACHE_TTL_MS;
}

// ─── Display Name Helpers ────────────────────────────────────────────────────

function formatOpenAIName(id: string): string {
  const map: Record<string, string> = {
    'gpt-5.2': 'GPT-5.2', 'gpt-5-mini': 'GPT-5 Mini', 'gpt-5-nano': 'GPT-5 Nano',
    'gpt-4.1': 'GPT-4.1', 'gpt-4.1-mini': 'GPT-4.1 Mini', 'gpt-4.1-nano': 'GPT-4.1 Nano',
    'gpt-4o': 'GPT-4o', 'gpt-4o-mini': 'GPT-4o Mini',
    'o3': 'o3', 'o3-mini': 'o3 Mini', 'o4-mini': 'o4 Mini',
    'chatgpt-4o-latest': 'ChatGPT-4o Latest',
  };
  return map[id] || id;
}

function formatXAIName(id: string): string {
  const map: Record<string, string> = {
    'grok-3': 'Grok 3', 'grok-3-mini': 'Grok 3 Mini',
    'grok-2': 'Grok 2', 'grok-2-mini': 'Grok 2 Mini',
  };
  return map[id] || id;
}

// ─── Known Context Windows (OpenAI + xAI don't provide these) ────────────────

const OPENAI_CONTEXT: Record<string, number> = {
  'gpt-5.2': 400000, 'gpt-5-mini': 400000, 'gpt-5-nano': 400000,
  'gpt-4.1': 1047576, 'gpt-4.1-mini': 1047576, 'gpt-4.1-nano': 1047576,
  'o3': 200000, 'o3-mini': 200000, 'o4-mini': 200000,
  'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'chatgpt-4o-latest': 128000,
};

const XAI_CONTEXT: Record<string, number> = {
  'grok-3': 131072, 'grok-3-mini': 131072,
  'grok-2': 131072, 'grok-2-mini': 131072,
};

// ─── Provider: Anthropic ─────────────────────────────────────────────────────

async function discoverAnthropic(apiKey: string): Promise<DiscoveredModel[]> {
  const models: DiscoveredModel[] = [];
  let afterId: string | undefined;

  do {
    const url = new URL('https://api.anthropic.com/v1/models');
    url.searchParams.set('limit', '100');
    if (afterId) url.searchParams.set('after_id', afterId);

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Anthropic ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as any;

    for (const m of data.data || []) {
      models.push({
        id: m.id,
        name: m.display_name || m.id,
        provider: 'anthropic',
        modelId: m.id,
        contextWindow: m.max_input_tokens || 200000,
        maxOutputTokens: m.max_tokens || 8192,
        capabilities: {
          chat: true,
          structuredOutput: m.capabilities?.structured_outputs?.supported ?? false,
          thinking: m.capabilities?.thinking?.supported ?? false,
          vision: m.capabilities?.image_input?.supported ?? false,
        },
        createdAt: m.created_at || '',
      });
    }

    afterId = data.has_more ? data.last_id : undefined;
  } while (afterId);

  return models;
}

// ─── Provider: Google ────────────────────────────────────────────────────────

async function discoverGoogle(apiKey: string): Promise<DiscoveredModel[]> {
  const models: DiscoveredModel[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Google ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as any;

    for (const m of data.models || []) {
      const id = (m.name || '').replace('models/', '');
      // Only include Gemini chat models with generateContent support
      if (!id.startsWith('gemini-')) continue;
      if (!m.supportedGenerationMethods?.includes('generateContent')) continue;

      models.push({
        id,
        name: m.displayName || id,
        provider: 'google',
        modelId: id,
        contextWindow: m.inputTokenLimit || 32000,
        maxOutputTokens: m.outputTokenLimit || 8192,
        capabilities: {
          chat: true,
          structuredOutput: true,
          thinking: id.includes('thinking'),
          vision: true,
        },
        createdAt: '',
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return models;
}

// ─── Provider: OpenAI ────────────────────────────────────────────────────────

async function discoverOpenAI(apiKey: string): Promise<DiscoveredModel[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as any;

  // Chat model prefixes
  const chatPrefixes = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt-'];
  // Skip these patterns (non-chat variants)
  const skipPatterns = ['realtime', 'audio', 'search', 'transcribe', 'tts', 'whisper', 'embedding', 'dall-e', 'gpt-image', 'moderation'];
  // Skip dated versions (e.g., gpt-4o-2024-08-06) — keep only the latest alias
  const datePattern = /-\d{4}-\d{2}-\d{2}/;

  return (data.data || [])
    .filter((m: any) => {
      const id = (m.id || '').toLowerCase();
      if (!chatPrefixes.some((p) => id.startsWith(p))) return false;
      if (skipPatterns.some((p) => id.includes(p))) return false;
      if (datePattern.test(id)) return false;
      if (id.startsWith('ft:')) return false;
      return true;
    })
    .map((m: any) => ({
      id: m.id,
      name: formatOpenAIName(m.id),
      provider: 'openai' as const,
      modelId: m.id,
      contextWindow: OPENAI_CONTEXT[m.id] || 128000,
      maxOutputTokens: 16384,
      capabilities: {
        chat: true,
        structuredOutput: true,
        thinking: /^o\d/.test(m.id),
        vision: /4o|gpt-5|4\.1/.test(m.id),
      },
      createdAt: m.created ? new Date(m.created * 1000).toISOString() : '',
    }));
}

// ─── Provider: xAI ──────────────────────────────────────────────────────────

async function discoverXAI(apiKey: string): Promise<DiscoveredModel[]> {
  const response = await fetch('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`xAI ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as any;

  return (data.data || [])
    .filter((m: any) => {
      const id = (m.id || '').toLowerCase();
      // Only chat models — exclude image/video generation models
      return id.includes('grok') && !id.includes('imagine') && !id.includes('image') && !id.includes('vision');
    })
    .map((m: any) => ({
      id: m.id,
      name: formatXAIName(m.id),
      provider: 'xai' as const,
      modelId: m.id,
      contextWindow: XAI_CONTEXT[m.id] || 131072,
      maxOutputTokens: 16384,
      capabilities: {
        chat: true,
        structuredOutput: true,
        thinking: (m.id || '').includes('mini'),
        vision: true,
      },
      createdAt: m.created ? new Date(m.created * 1000).toISOString() : '',
    }));
}

// ─── Main Discovery ──────────────────────────────────────────────────────────

const PROVIDERS: { key: string; discover: (apiKey: string) => Promise<DiscoveredModel[]> }[] = [
  { key: 'anthropic', discover: discoverAnthropic },
  { key: 'openai', discover: discoverOpenAI },
  { key: 'google', discover: discoverGoogle },
  { key: 'xai', discover: discoverXAI },
];

/**
 * Discover models from all providers where the user has an API key.
 * Results are cached with a 24-hour TTL. Pass forceRefresh=true to bypass cache.
 */
export async function discoverModels(
  apiKeys: Record<string, string>,
  forceRefresh: boolean = false,
): Promise<DiscoveredModel[]> {
  const cache = loadCache();
  const allModels: DiscoveredModel[] = [];
  let cacheUpdated = false;

  // Query all providers in parallel
  const results = await Promise.allSettled(
    PROVIDERS.map(async ({ key, discover }) => {
      const apiKey = apiKeys[key];

      // Use cache if fresh and not forcing refresh
      if (!forceRefresh && isFresh(cache, key)) {
        return { key, models: cache.providers[key].models, fromCache: true };
      }

      // No API key — return cached data if available
      if (!apiKey) {
        return { key, models: cache.providers[key]?.models || [], fromCache: true };
      }

      // Fetch fresh data
      const models = await discover(apiKey);
      return { key, models, fromCache: false };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { key, models, fromCache } = result.value;
      allModels.push(...models);
      if (!fromCache) {
        cache.providers[key] = { lastFetched: new Date().toISOString(), models };
        cacheUpdated = true;
      }
    } else {
      // Provider failed — try cached data
      console.error('[ModelDiscovery] Provider failed:', result.reason?.message);
    }
  }

  if (cacheUpdated) saveCache(cache);

  // Sort: by provider, then newest first
  return allModels.sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

// ─── Synchronous Accessors (for fast startup / fallback lookups) ─────────────

/** Get cached models without any network calls */
export function getCachedModels(): DiscoveredModel[] {
  const cache = loadCache();
  const all: DiscoveredModel[] = [];
  for (const entry of Object.values(cache.providers)) {
    all.push(...entry.models);
  }
  return all;
}

/** Look up context window for a model by ID */
export function getModelContextWindow(modelId: string): number | null {
  const cache = loadCache();
  for (const entry of Object.values(cache.providers)) {
    const model = entry.models.find((m) => m.id === modelId || m.modelId === modelId);
    if (model) return model.contextWindow;
  }
  return null;
}

/** Look up full model info by ID */
export function getDiscoveredModel(modelId: string): DiscoveredModel | null {
  const cache = loadCache();
  for (const entry of Object.values(cache.providers)) {
    const model = entry.models.find((m) => m.id === modelId || m.modelId === modelId);
    if (model) return model;
  }
  return null;
}

/** Invalidate cache for all providers (next call to discoverModels will re-fetch) */
export function invalidateCache(): void {
  try {
    const cachePath = getCachePath();
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  } catch {}
}
