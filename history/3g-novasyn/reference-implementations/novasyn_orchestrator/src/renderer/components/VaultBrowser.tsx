import React, { useState, useEffect, useCallback } from 'react';

interface VaultItem {
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

interface VaultTag {
  id: string;
  name: string;
  color: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (item: VaultItem) => void;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  chat_exchange: 'Chat Exchange',
  generation: 'Generation',
  document: 'Document',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  code_snippet: 'Code',
  prompt_template: 'Prompt',
  note: 'Note',
  workflow_output: 'Workflow Output',
};

const SOURCE_APP_LABELS: Record<string, string> = {
  'novasyn-ai': 'Chat',
  'novasyn-studio': 'Studio',
  'novasyn-writer': 'Writer',
  'novasyn-social': 'Social',
  'novasyn-council': 'Council',
  'novasyn-academy': 'Academy',
  'novasyn-orchestrator': 'Orchestrator',
};

export function VaultBrowser({ isOpen, onClose, onImport }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [tags, setTags] = useState<VaultTag[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [provenance, setProvenance] = useState<VaultItem[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const results = await window.electronAPI.vaultSearch({
        query: searchQuery || undefined,
        itemType: filterType || undefined,
        sourceApp: filterSource || undefined,
        limit: 200,
      });
      setItems(results);
    } catch (err) {
      console.error('Failed to load vault items:', err);
    }
    setLoading(false);
  }, [searchQuery, filterType, filterSource]);

  const loadTags = useCallback(async () => {
    try {
      const t = await window.electronAPI.vaultGetTags();
      setTags(t);
    } catch (err) {
      console.error('Failed to load vault tags:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
      loadTags();
    }
  }, [isOpen, loadItems, loadTags]);

  const handleSelectItem = async (item: VaultItem) => {
    setSelectedItem(item);
    try {
      const [prov, annots] = await Promise.all([
        window.electronAPI.vaultGetProvenance(item.id),
        window.electronAPI.vaultGetAnnotations(item.id),
      ]);
      setProvenance(prov);
      setAnnotations(annots);
    } catch (err) {
      console.error('Failed to load item details:', err);
    }
  };

  const handleAddAnnotation = async () => {
    if (!selectedItem || !newAnnotation.trim()) return;
    try {
      await window.electronAPI.vaultAnnotate(selectedItem.id, newAnnotation.trim());
      setNewAnnotation('');
      const annots = await window.electronAPI.vaultGetAnnotations(selectedItem.id);
      setAnnotations(annots);
      loadItems();
    } catch (err) {
      console.error('Failed to add annotation:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vault item?')) return;
    try {
      await window.electronAPI.vaultDelete(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
        setProvenance([]);
        setAnnotations([]);
      }
      loadItems();
    } catch (err) {
      console.error('Failed to delete vault item:', err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPreview = (item: VaultItem): string => {
    if (!item.content) return item.filePath || '(no content)';
    if (item.itemType === 'chat_exchange') {
      try {
        const parsed = JSON.parse(item.content);
        return parsed.userMessage?.slice(0, 200) || item.content.slice(0, 200);
      } catch {
        return item.content.slice(0, 200);
      }
    }
    return item.content.slice(0, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-[900px] h-[600px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
          <h2 className="text-lg font-semibold text-white">NS Vault</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800/50">
          <input
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadItems()}
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); }}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="">All Types</option>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => { setFilterSource(e.target.value); }}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="">All Apps</option>
            {Object.entries(SOURCE_APP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button onClick={loadItems} className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-3 py-1.5 rounded">
            Search
          </button>
        </div>

        {/* Content -- split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Item list */}
          <div className="w-[360px] border-r border-slate-700 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-400 text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-gray-400 text-sm">No vault items found.</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`p-3 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 transition ${selectedItem?.id === item.id ? 'bg-slate-700' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-400">
                      {ITEM_TYPE_LABELS[item.itemType] || item.itemType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {SOURCE_APP_LABELS[item.sourceApp] || item.sourceApp}
                    </span>
                  </div>
                  <div className="text-sm text-white truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-1 truncate">{getPreview(item)}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-slate-600 text-gray-300 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-gray-500 ml-auto">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedItem ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{selectedItem.title}</h3>
                  <div className="flex items-center gap-2">
                    {onImport && (
                      <button
                        onClick={() => { onImport(selectedItem); onClose(); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-3 py-1 rounded"
                      >
                        Import
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedItem.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-400">
                  <div>Type: <span className="text-gray-200">{ITEM_TYPE_LABELS[selectedItem.itemType] || selectedItem.itemType}</span></div>
                  <div>Source: <span className="text-gray-200">{SOURCE_APP_LABELS[selectedItem.sourceApp] || selectedItem.sourceApp}</span></div>
                  <div>Created: <span className="text-gray-200">{formatDate(selectedItem.createdAt)}</span></div>
                  {selectedItem.metadata?.model && (
                    <div>Model: <span className="text-gray-200">{String(selectedItem.metadata.model)}</span></div>
                  )}
                  {selectedItem.metadata?.tokens && (
                    <div>Tokens: <span className="text-gray-200">{String(selectedItem.metadata.tokens)}</span></div>
                  )}
                </div>

                {/* Content preview */}
                <div className="bg-slate-900 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                  {selectedItem.itemType === 'chat_exchange' && selectedItem.content ? (
                    (() => {
                      try {
                        const parsed = JSON.parse(selectedItem.content);
                        return (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-medium text-blue-400 mb-1">User:</div>
                              <div className="text-sm text-gray-200 whitespace-pre-wrap">{parsed.userMessage}</div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-purple-400 mb-1">AI:</div>
                              <div className="text-sm text-gray-200 whitespace-pre-wrap">{parsed.aiMessage?.slice(0, 500)}{parsed.aiMessage?.length > 500 ? '...' : ''}</div>
                            </div>
                          </div>
                        );
                      } catch {
                        return <pre className="text-sm text-gray-200 whitespace-pre-wrap">{selectedItem.content}</pre>;
                      }
                    })()
                  ) : (
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap">
                      {selectedItem.content || selectedItem.filePath || '(no content)'}
                    </pre>
                  )}
                </div>

                {/* Provenance chain */}
                {provenance.length > 1 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Provenance Chain</h4>
                    <div className="space-y-1">
                      {provenance.map((p, i) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 text-xs ${p.id === selectedItem.id ? 'text-purple-400' : 'text-gray-400'}`}
                        >
                          {i > 0 && <span className="text-gray-600 ml-2">^</span>}
                          <span className="bg-slate-700 px-2 py-0.5 rounded">
                            {ITEM_TYPE_LABELS[p.itemType] || p.itemType}
                          </span>
                          <span className="truncate">{p.title}</span>
                          <span className="text-gray-500 ml-auto flex-shrink-0">
                            {SOURCE_APP_LABELS[p.sourceApp] || p.sourceApp}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annotations */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Annotations ({annotations.length})
                  </h4>
                  {annotations.map((a) => (
                    <div key={a.id} className="bg-slate-900 rounded p-2 mb-2 text-sm">
                      <div className="text-gray-200">{a.content}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {SOURCE_APP_LABELS[a.authorApp] || a.authorApp} &middot; {formatDate(a.createdAt)}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newAnnotation}
                      onChange={(e) => setNewAnnotation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAnnotation()}
                      placeholder="Add a note..."
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleAddAnnotation}
                      disabled={!newAnnotation.trim()}
                      className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-3 py-1 rounded disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select an item to view details
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 text-xs text-gray-500 flex items-center justify-between">
          <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <span>vault.db &middot; shared across all NovaSyn apps</span>
        </div>
      </div>
    </div>
  );
}
