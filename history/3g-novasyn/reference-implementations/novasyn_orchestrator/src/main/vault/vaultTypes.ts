// NS Vault — Shared type definitions
// These types are used by both vaultService.ts and the IPC layer

export interface VaultItem {
  id: string;
  itemType: string; // 'chat_exchange' | 'generation' | 'document' | 'image' | 'video' | 'audio' | 'code_snippet' | 'prompt_template' | 'note'
  sourceApp: string; // 'novasyn-ai' | 'novasyn-studio' | 'novasyn-writer' | etc.
  title: string;
  content: string | null; // Text content (for chat, code, notes, prompts)
  filePath: string | null; // Path to binary file (for images, video, audio)
  outputTypeHint: string | null; // 'text' | 'image_prompt' | 'video_prompt' | 'code' | etc.
  parentId: string | null; // Provenance chain — links to the vault item this was derived from
  metadata: Record<string, unknown>; // JSON: model, provider, tokens, cost, dimensions, etc.
  tags: string[]; // Tag names, populated on read
  annotationCount: number; // Populated on read
  createdAt: string;
  updatedAt: string;
}

export interface VaultTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface VaultAnnotation {
  id: string;
  itemId: string;
  content: string;
  authorApp: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultSearchOptions {
  itemType?: string;
  sourceApp?: string;
  tags?: string[];
  query?: string; // Full-text search in title + content
  parentId?: string; // Find children of a specific item
  limit?: number;
  offset?: number;
}

export interface VaultStoreInput {
  itemType: string;
  title: string;
  content?: string | null;
  filePath?: string | null;
  outputTypeHint?: string | null;
  parentId?: string | null;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
