export interface VaultItem {
  id: string;
  itemType: string;
  sourceApp: string;
  title: string;
  content: string | null;
  filePath: string | null;
  outputTypeHint: string | null;
  parentId: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  annotationCount: number;
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
  query?: string;
  parentId?: string;
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
