// React Component Scaffold Generator
// Generates React components, App.tsx routing, and Sidebar from VIEW declarations

import type { AgiFile, ViewDecl, EntityDecl } from '@agicore/parser';
import { toCamelCase, lcFirst, toSnakeCase, humanizeModelId } from '../naming.js';

/**
 * If an entity has a `BELONGS_TO X` relationship and `X` is in
 * `ast.app.current ?? []`, return the parent name. The generated list view
 * should then read `currentXId` from the store and call the SQL-pushdown
 * `loadEntityForCurrentX` action instead of the unfiltered `loadEntitys`.
 *
 * When an entity BELONGS_TO multiple CURRENT entities, the first relationship
 * in declaration order wins — deterministic, simple, swap in a smarter
 * heuristic if it ever bites us.
 */
function pickCurrentParent(entity: EntityDecl | undefined, ast: AgiFile): string | undefined {
  if (!entity) return undefined;
  const currents = ast.app.current ?? [];
  for (const rel of entity.relationships) {
    if (rel.type !== 'BELONGS_TO') continue;
    if (currents.includes(rel.target)) return rel.target;
  }
  return undefined;
}

function generateTableView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  const parent = pickCurrentParent(entity, ast);
  if (parent) {
    return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const current${parent}Id = useAppStore((s) => s.current${parent}Id);
  const load = useAppStore((s) => s.load${name}sForCurrent${parent});

  useEffect(() => { load(); }, [current${parent}Id, load]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">${view.title ?? view.name}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
${fields.map(f => `            <th className="text-left py-2 px-3">${toCamelCase(f)}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
          {${plural}.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
${fields.map(f => `              <td className="py-2 px-3">{String(item.${toCamelCase(f)} ?? '')}</td>`).join('\n')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
  }

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const load = useAppStore((s) => s.load${name}s);

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">${view.title ?? view.name}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
${fields.map(f => `            <th className="text-left py-2 px-3">${toCamelCase(f)}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
          {${plural}.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
${fields.map(f => `              <td className="py-2 px-3">{String(item.${toCamelCase(f)} ?? '')}</td>`).join('\n')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
}

function generateSplitView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  const parent = pickCurrentParent(entity, ast);
  const loaderReads = parent
    ? `  const current${parent}Id = useAppStore((s) => s.current${parent}Id);
  const load = useAppStore((s) => s.load${name}sForCurrent${parent});`
    : `  const load = useAppStore((s) => s.load${name}s);`;
  const effectDeps = parent ? `[current${parent}Id, load]` : `[]`;

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const selectedId = useAppStore((s) => s.selected${name}Id);
  const select = useAppStore((s) => s.select${name});
${loaderReads}

  useEffect(() => { load(); }, ${effectDeps});

  const selected = ${plural}.find((i) => i.id === selectedId);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-64 border-r border-[var(--border)] overflow-y-auto">
        {${plural}.map((item) => (
          <div
            key={item.id}
            onClick={() => select(item.id)}
            className={\`p-3 cursor-pointer border-b border-[var(--border)] \${
              item.id === selectedId ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
            }\`}
          >
            <div className="font-medium">{String(item.${toCamelCase(fields[0] ?? 'id')})}</div>
${fields.slice(1, 3).map(f => `            <div className="text-xs text-[var(--text-secondary)]">{String(item.${toCamelCase(f)} ?? '')}</div>`).join('\n')}
          </div>
        ))}
      </div>

      {/* Detail */}
      <div className="flex-1 p-6">
        {selected ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">{String(selected.${toCamelCase(fields[0] ?? 'id')})}</h2>
${fields.map(f => `            <div className="mb-2"><span className="text-[var(--text-secondary)]">${toCamelCase(f)}:</span> {String(selected.${toCamelCase(f)} ?? '')}</div>`).join('\n')}
          </div>
        ) : (
          <div className="text-[var(--text-secondary)]">Select an item to view details</div>
        )}
      </div>
    </div>
  );
}
`;
}

function generateCardsView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  const parent = pickCurrentParent(entity, ast);
  const loaderReads = parent
    ? `  const current${parent}Id = useAppStore((s) => s.current${parent}Id);
  const load = useAppStore((s) => s.load${name}sForCurrent${parent});`
    : `  const load = useAppStore((s) => s.load${name}s);`;
  const effectDeps = parent ? `[current${parent}Id, load]` : `[]`;

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
${loaderReads}

  useEffect(() => { load(); }, ${effectDeps});

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">${view.title ?? view.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {${plural}.map((item) => (
          <div key={item.id} className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4">
${fields.map((f, i) => i === 0
  ? `            <h3 className="font-medium mb-2">{String(item.${toCamelCase(f)})}</h3>`
  : `            <div className="text-sm text-[var(--text-secondary)]">${toCamelCase(f)}: {String(item.${toCamelCase(f)} ?? '')}</div>`
).join('\n')}
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

function generateCustomView(view: ViewDecl): string {
  return `export function ${view.name}() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">${view.title ?? view.name}</h2>
      <div className="text-[var(--text-secondary)]">
        Custom view — implement your layout here.
      </div>
    </div>
  );
}
`;
}

/**
 * Find the entity that is likely the "chat message" entity — it has
 * BELONGS_TO toward a CURRENT entity. Used to wire ChatView generation.
 */
function findChatMessageEntity(ast: AgiFile): EntityDecl | undefined {
  const currentNames = new Set(ast.app.current ?? []);
  return ast.entities.find(e =>
    e.relationships.some(r => r.type === 'BELONGS_TO' && currentNames.has(r.target)) &&
    e.fields.some(f => f.name === 'user_message' || f.name === 'userMessage' || f.name === 'ai_message')
  );
}

function generateViewComponent(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  // Detect AI chat view: no entity, AI_SERVICE declared, and a chat-message entity
  // exists that BELONGS_TO a CURRENT entity. Convention: view name ends with "Chat".
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  if (view.layout === 'custom' && !view.entity && hasAiService && view.name.toLowerCase().includes('chat')) {
    const msgEntity = findChatMessageEntity(ast);
    if (msgEntity) return generateAiChatView(view, msgEntity, ast);
  }

  switch (view.layout) {
    case 'table':           return generateTableView(view, entity, ast);
    case 'split':           return generateSplitView(view, entity, ast);
    case 'cards':           return generateCardsView(view, entity, ast);
    case 'document_editor': return generateDocumentEditorView(view, entity, ast);
    case 'settings':        return generateSettingsView(view, ast);
    case 'form':
    case 'detail':
    case 'custom':
    default:                return generateCustomView(view);
  }
}

function generateDocumentEditorView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const entityName = entity?.name ?? 'Document';
  const entityCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const entitySnake = toSnakeCase(entityName);
  const entityPlural = entityCamel + 's';
  const loadAction = `load${entityName}s`;
  const titleField = entity?.fields.find(f => f.name === 'title' || f.name === 'name')?.name ?? 'title';
  const titleCamel = toCamelCase(titleField);

  return `import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { ${entityName} } from '../lib/types';

export function ${view.name}() {
  const ${entityPlural} = useAppStore((s) => s.${entityPlural});
  const ${loadAction} = useAppStore((s) => s.${loadAction});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft${entityName}Title, setDraft${entityName}Title] = useState('');

  useEffect(() => { ${loadAction}(); }, []);

  const selected = ${entityPlural}.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setDraft${entityName}Title(selected.${titleCamel});
  }, [selected]);

  async function handleNew() {
    const name = \`Untitled \${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\`;
    try {
      await invoke('create_${entitySnake}', { input: { ${titleCamel}: name, filePath: name, language: 'markdown' } });
      await ${loadAction}();
    } catch (err) { console.error('Create failed:', err); }
  }

  async function handleDelete(id: string) {
    try {
      await invoke('delete_${entitySnake}', { id });
      await ${loadAction}();
      if (selectedId === id) setSelectedId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  async function handleSave() {
    if (!selected) return;
    try {
      await invoke('update_${entitySnake}', { id: selected.id, input: { ${titleCamel}: draft${entityName}Title } });
      await ${loadAction}();
      setEditing(false);
    } catch (err) { console.error('Save failed:', err); }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 border-r border-slate-700 bg-slate-900/40 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">${view.title ?? view.name}</h2>
          <button onClick={handleNew} className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition" title="New">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {${entityPlural}.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No items yet.<br />Click + to create one.</p>
          )}
          {${entityPlural}.map((item) => (
            <${entityName}ListItem
              key={item.id}
              item={item}
              isActive={selectedId === item.id}
              onSelect={() => setSelectedId(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              {editing ? (
                <input
                  type="text"
                  value={draft${entityName}Title}
                  onChange={(e) => setDraft${entityName}Title(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 bg-slate-700 border border-blue-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none mr-3"
                  autoFocus
                />
              ) : (
                <h2 className="text-lg font-semibold text-white cursor-pointer" onClick={() => setEditing(true)}>{selected.${titleCamel}}</h2>
              )}
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSave} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Save</button>
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Edit Title</button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
              <MarkdownRenderer content={\`# \${selected.${titleCamel}}\`} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a document to view</p>
              <p className="text-xs text-gray-700 mt-1">or click + to create a new one</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ${entityName}ListItem({ item, isActive, onSelect, onDelete }: {
  item: ${entityName}; isActive: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (confirmDelete) {
    return (
      <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded mx-1 mb-0.5">
        <p className="text-xs text-red-300 mb-1.5 truncate">Delete "{item.${titleCamel}}"?</p>
        <div className="flex gap-1">
          <button onClick={onDelete} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div
      onClick={onSelect}
      className={\`group flex items-center gap-2 px-2 py-1.5 rounded mx-1 mb-0.5 cursor-pointer transition \${
        isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }\`}
    >
      <FileText size={14} className="flex-shrink-0 opacity-60" />
      <span className="text-sm flex-1 truncate">{item.${titleCamel}}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
        title="Delete"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
`;
}

function generateSettingsView(view: ViewDecl, ast: AgiFile): string {
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const appTitle = ast.app.title;

  // Build provider list from AI_SERVICE declaration
  const providers = hasAiService
    ? (ast.aiService!.providers ?? []).filter((p: any) => typeof p === 'string' ? true : p)
    : [];

  // Provider metadata — known providers get their label/placeholder/url
  const PROVIDER_META: Record<string, { label: string; placeholder: string; url: string }> = {
    anthropic: { label: 'Anthropic (Claude)', placeholder: 'sk-ant-...', url: 'https://console.anthropic.com/settings/keys' },
    openai:    { label: 'OpenAI (GPT-4o)',    placeholder: 'sk-...',     url: 'https://platform.openai.com/api-keys' },
    google:    { label: 'Google (Gemini)',     placeholder: 'AIza...',    url: 'https://aistudio.google.com/app/apikey' },
    xai:       { label: 'xAI (Grok)',          placeholder: 'xai-...',    url: 'https://x.ai/api' },
    babyai:    { label: 'BabyAI (HuggingFace)', placeholder: 'hf_...',   url: 'https://huggingface.co/settings/tokens' },
  };

  const providerEntries = providers.map((p: string) => {
    const meta = PROVIDER_META[p] ?? { label: p, placeholder: 'key...', url: '#' };
    return `  { id: '${p}', label: '${meta.label}', placeholder: '${meta.placeholder}', url: '${meta.url}' }`;
  });

  const providersBlock = providerEntries.length > 0
    ? `const PROVIDERS = [\n${providerEntries.join(',\n')},\n];`
    : `const PROVIDERS: Array<{ id: string; label: string; placeholder: string; url: string }> = [];`;

  const keysFileHint = hasAiService ? (ast.aiService as any).keysFile ?? '%APPDATA%/app/api-keys.json' : '';
  const dbName = toSnakeCase(ast.app.name);

  return `import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Database, Info } from 'lucide-react';

${providersBlock}

export function ${view.name}() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const masked = await invoke<Record<string, string>>('get_api_keys');
      setMaskedKeys(masked);
    } catch (err) { console.error('Load keys failed:', err); }
  }

  async function handleSave(provider: string) {
    const key = keys[provider]?.trim() ?? '';
    try {
      await invoke('set_api_key', { provider, key });
      setEditing(null);
      setKeys((prev) => ({ ...prev, [provider]: '' }));
      setSaved(provider);
      setTimeout(() => setSaved(null), 2000);
      await loadKeys();
    } catch (err) { console.error('Save key failed:', err); }
  }

  async function handleRemove(provider: string) {
    try {
      await invoke('set_api_key', { provider, key: '' });
      await loadKeys();
    } catch (err) { console.error('Remove key failed:', err); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
      {PROVIDERS.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-blue-400" />
            <h3 className="text-sm font-medium text-white">API Keys</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Stored locally in <code className="bg-slate-800 px-1.5 py-0.5 rounded">${keysFileHint}</code>.
            Never sent anywhere except the provider you're calling.
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const isEditing = editing === p.id;
              const hasKey = Boolean(maskedKeys[p.id]);
              return (
                <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-200 font-medium">{p.label}</label>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition">Get key →</a>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={keys[p.id] || ''}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(p.id); if (e.key === 'Escape') setEditing(null); }}
                        placeholder={p.placeholder}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button onClick={() => handleSave(p.id)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition">Save</button>
                      <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded transition">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-400 bg-slate-900/50 px-3 py-1.5 rounded">
                        {hasKey ? maskedKeys[p.id] : 'Not configured'}
                      </code>
                      <button onClick={() => setEditing(p.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition">
                        {hasKey ? 'Update' : 'Add Key'}
                      </button>
                      {hasKey && (
                        <button onClick={() => handleRemove(p.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded transition" title="Remove">Remove</button>
                      )}
                      {saved === p.id && <span className="text-xs text-green-400">✓ Saved</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-purple-400" />
          <h3 className="text-sm font-medium text-white">Database</h3>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-2 text-sm text-gray-300">
          <p><span className="text-gray-500">File:</span> <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-xs">${dbName}.db</code></p>
        </div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-amber-400" />
          <h3 className="text-sm font-medium text-white">About</h3>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm text-gray-300 space-y-1">
          <p><span className="text-gray-500">App:</span> ${appTitle}</p>
          <p><span className="text-gray-500">Framework:</span> Agicore</p>
          <p className="text-xs text-gray-500 pt-2 border-t border-slate-700/50 mt-2">
            Generated by Agicore DSL. <a href="https://github.com/Binary-Blender/agicore" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">GitHub</a>
          </p>
        </div>
      </section>
    </div>
  );
}
`;
}

function generateAiChatView(view: ViewDecl, msgEntity: EntityDecl, ast: AgiFile): string {
  const appTitle = ast.app.title;
  const msgType = msgEntity.name;
  const msgCamel = msgType.charAt(0).toLowerCase() + msgType.slice(1);
  const msgSnake = toSnakeCase(msgType);
  const msgPlural = msgCamel + 's';

  // Find the parent CURRENT entity name (Session or equivalent)
  const currentNames = new Set(ast.app.current ?? []);
  const parentEntityName = msgEntity.relationships
    .find(r => r.type === 'BELONGS_TO' && currentNames.has(r.target))?.target ?? 'Session';
  const currentIdField = `current${parentEntityName}Id`;
  const loadAction = `load${msgType}sForCurrent${parentEntityName}`;

  return `import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ContextBar } from './ContextBar';
import { MessageInput } from './MessageInput';
import { SearchBar } from './SearchBar';
import { TagPicker } from './TagPicker';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ${msgType} } from '../lib/types';

interface StreamDelta { requestId: string; delta: string; done: boolean; }

export function ${view.name}() {
  const ${msgPlural} = useAppStore((s) => s.${msgPlural});
  const ${loadAction} = useAppStore((s) => s.${loadAction});
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);
  const sessions = useAppStore((s) => s.sessions);
  const ${currentIdField} = useAppStore((s) => s.${currentIdField});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<${msgType}[] | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFolderItems] = useState<string[]>([]);
  const [folderItemsMap] = useState<Record<string, any>>({});
  const selectedModel = useAppStore((s) => s.selectedModel);

  useEffect(() => { ${loadAction}(); }, [${currentIdField}, ${loadAction}]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [${msgPlural}, streamingContent, ${currentIdField}]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setShowSearch((v) => !v); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const displayMessages = searchResults ?? ${msgPlural};

  const handleSend = useCallback(async (text: string) => {
    const requestId = crypto.randomUUID();
    setStreamingContent('');
    const unlisten = await listen<StreamDelta>('chat-stream', (event) => {
      const { requestId: rid, delta, done } = event.payload;
      if (rid !== requestId || done) return;
      setStreamingContent((prev) => (prev ?? '') + delta);
    });
    try {
      const history = [...${msgPlural}]
        .filter((m) => !m.isExcluded && !m.isArchived)
        .flatMap((m) => [
          { role: 'user', content: m.userMessage },
          { role: 'assistant', content: m.aiMessage },
        ]);
      const response = await invoke<{
        content: string; model: string; provider: string;
        inputTokens: number; outputTokens: number;
      }>('send_chat', { request: { messages: [...history, { role: 'user', content: text }], model: selectedModel }, requestId });
      await invoke('create_${msgSnake}', {
        input: {
          userMessage: text,
          aiMessage: response.content,
          userTokens: response.inputTokens || Math.ceil(text.length / 4),
          aiTokens: response.outputTokens || Math.ceil(response.content.length / 4),
          totalTokens: (response.inputTokens || 0) + (response.outputTokens || 0),
          model: response.model,
          provider: response.provider,
          userId: 'default-user',
          sessionId: ${currentIdField},
        },
      });
      setStreamingContent(null);
      await ${loadAction}();
    } catch (err) {
      console.error('Send failed:', err);
      setStreamingContent(\`Error: \${err}\`);
      setTimeout(() => setStreamingContent(null), 5000);
    } finally { unlisten(); }
  }, [${loadAction}, ${msgPlural}, selectedModel, ${currentIdField}]);

  return (
    <div className="flex flex-col h-full">
      {showSearch && (
        <SearchBar
          onResults={(results) => setSearchResults(results)}
          onClear={() => setSearchResults(null)}
        />
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {displayMessages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-400 mb-2">${appTitle}</h2>
              <p className="text-sm text-gray-600">Built on Agicore. Start a conversation.</p>
              <p className="text-xs text-gray-700 mt-2">Ctrl+F to search</p>
            </div>
          </div>
        )}
        {displayMessages.map((msg) => (
          <${msgType}Item key={msg.id} message={msg} folders={folders} tags={tags} sessions={sessions} onRefresh={${loadAction}} />
        ))}
        {streamingContent && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
              <div className="flex-1 min-w-0">
                <MarkdownRenderer content={streamingContent} />
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ContextBar selectedFolderItems={selectedFolderItems} folderItemsMap={folderItemsMap} onRemove={() => {}} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}

function ${msgType}Item({ message, folders, tags: _tags, sessions, onRefresh }: {
  message: ${msgType}; folders: any[]; tags: any[]; sessions: any[];
  onRefresh: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);

  const ts = new Date(message.createdAt);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const contextTokens = Math.ceil(message.userMessage.length / 4) + message.aiTokens;

  async function handleCopy() {
    await navigator.clipboard.writeText(message.aiMessage);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  async function handleToggleExclude() {
    await invoke('update_${msgSnake}', { id: message.id, input: { isExcluded: !message.isExcluded } });
    await onRefresh(); setMenuOpen(false);
  }
  async function handleToggleArchive() {
    await invoke('update_${msgSnake}', { id: message.id, input: { isArchived: !message.isArchived } });
    await onRefresh(); setMenuOpen(false);
  }
  async function handleDelete() {
    await invoke('delete_${msgSnake}', { id: message.id }); await onRefresh();
  }
  async function handleSaveToFolder(folderId: string) {
    try {
      await invoke('create_folder_item', { input: { content: message.aiMessage, tokens: message.aiTokens, itemType: 'ai-response', folderId } });
      setSavedFolderId(folderId); setShowFolderPicker(false); setMenuOpen(false);
      setTimeout(() => setSavedFolderId(null), 2000);
    } catch (err) { console.error('Save to folder failed:', err); }
  }
  async function handleMoveToSession(targetSessionId: string) {
    await invoke('update_${msgSnake}', { id: message.id, input: { sessionId: targetSessionId } });
    await onRefresh(); setShowMovePicker(false); setMenuOpen(false);
  }

  return (
    <>
      {showTagPicker && <TagPicker messageId={message.id} onClose={() => setShowTagPicker(false)} onTagged={onRefresh} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-[22rem] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-white mb-2">Delete Message?</h2>
            <p className="text-xs text-gray-400 mb-4">This message will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition">Cancel</button>
              <button onClick={handleDelete} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className={\`group relative rounded-xl border transition-all \${
        message.isArchived ? 'opacity-40 border-slate-700 bg-slate-800/30'
          : message.isExcluded ? 'opacity-60 border-slate-700 bg-slate-800/40 border-dashed'
          : message.isPruned ? 'opacity-45 border-orange-700/40 bg-slate-800/30 border-dashed'
          : 'border-slate-700 bg-slate-800/60'
      }\`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={handleCopy} className="text-xs text-gray-500 hover:text-white bg-slate-700 px-2 py-0.5 rounded transition">
            {copied ? '✓' : 'Copy'}
          </button>
          <div className="relative">
            <button onClick={() => { setMenuOpen(!menuOpen); setShowFolderPicker(false); setShowMovePicker(false); }} className="text-gray-500 hover:text-white text-lg leading-none px-1 bg-slate-700 rounded transition">⋮</button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10 w-48 py-1">
                <button onClick={handleToggleExclude} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">
                  {message.isExcluded ? '✓ Include in session' : '× Exclude from session'}
                </button>
                <button onClick={handleToggleArchive} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">
                  {message.isArchived ? '📤 Unarchive' : '📥 Archive'}
                </button>
                <hr className="border-slate-600 my-1" />
                <button onClick={() => { setShowTagPicker(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">Tag message</button>
                {folders.length > 0 && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <button onClick={() => setShowFolderPicker(!showFolderPicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                      <span>📁 Save to folder</span><span className="text-gray-400 text-xs">{showFolderPicker ? '▲' : '▶'}</span>
                    </button>
                    {showFolderPicker && (
                      <div className="bg-slate-800 border-t border-slate-600">
                        {folders.map((folder) => (
                          <button key={folder.id} onClick={() => handleSaveToFolder(folder.id)} className="w-full text-left px-4 py-1.5 text-sm text-blue-300 hover:bg-slate-600 transition">{folder.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {sessions.length > 1 && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <button onClick={() => setShowMovePicker(!showMovePicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                      <span>Move to...</span><span className="text-gray-400 text-xs">{showMovePicker ? '▲' : '▶'}</span>
                    </button>
                    {showMovePicker && (
                      <div className="bg-slate-800 border-t border-slate-600 max-h-40 overflow-y-auto">
                        {sessions.map((s) => (
                          <button key={s.id} onClick={() => handleMoveToSession(s.id)} className="w-full text-left px-4 py-1.5 text-sm text-blue-300 hover:bg-slate-600 transition truncate">{s.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <hr className="border-slate-600 my-1" />
                <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 transition">Delete</button>
              </div>
            )}
          </div>
        </div>
        {menuOpen && <div className="fixed inset-0 z-0" onClick={() => { setMenuOpen(false); setShowFolderPicker(false); setShowMovePicker(false); }} />}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">U</div>
            <div className="flex-1 min-w-0"><p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{message.userMessage}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
            <div className="flex-1 min-w-0"><MarkdownRenderer content={message.aiMessage} /></div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-gray-600">{timeStr}</span>
            <span className="text-xs text-gray-600 bg-slate-700/50 px-1.5 py-0.5 rounded">{message.model}</span>
            <span className="text-xs text-gray-600">~{contextTokens.toLocaleString()} tokens</span>
            {message.isPruned && <span className="text-xs text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">pruned</span>}
            {message.isExcluded && <span className="text-xs text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">excluded</span>}
            {message.isArchived && <span className="text-xs text-gray-500 bg-slate-700/50 px-1.5 py-0.5 rounded">archived</span>}
            {savedFolderId && <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">✓ saved</span>}
          </div>
        </div>
      </div>
    </>
  );
}
`;
}

function generateAppTsx(ast: AgiFile): string {
  const imports = ast.views.map(v =>
    `import { ${v.name} } from './${v.name}';`
  ).join('\n');

  const cases = ast.views.map(v =>
    `      case '${v.name}': return <${v.name} />;`
  ).join('\n');

  return `import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
${imports}

export function App() {
  const currentView = useAppStore((s) => s.currentView);

  const renderView = () => {
    switch (currentView) {
${cases}
      default: return <div className="p-6">Unknown view</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
`;
}

function generateSidebar(ast: AgiFile): string {
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const currentEntities = ast.app.current ?? [];
  const sessionEntityName = currentEntities.find(name =>
    ast.entities.some(e => e.name === name)
  );

  // When AI_SERVICE + a CURRENT session entity are declared, emit the full
  // session-management sidebar (create / rename / delete sessions + model picker).
  // Otherwise fall back to a generic icon nav rail.
  if (hasAiService && sessionEntityName) {
    return generateSessionSidebar(ast, sessionEntityName);
  }
  return generateNavRailSidebar(ast);
}

function generateSessionSidebar(ast: AgiFile, sessionEntity: string): string {
  const appTitle = ast.app.title;
  const camel = sessionEntity.charAt(0).toLowerCase() + sessionEntity.slice(1);
  const plural = camel + 's';
  const load = `load${sessionEntity}s`;
  const setCurrent = `setCurrent${sessionEntity}Id`;
  const currentId = `current${sessionEntity}Id`;

  return `import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Key, MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { ModelPicker } from './ModelPicker';
import { ApiKeyModal } from './ApiKeyModal';
import type { ${sessionEntity} } from '../lib/types';

interface ${sessionEntity}ItemProps {
  session: ${sessionEntity};
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function ${sessionEntity}Item({ session, isActive, onSelect, onRename, onDelete }: ${sessionEntity}ItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onRename(name); setEditing(false); }
            if (e.key === 'Escape') { setName(session.name); setEditing(false); }
          }}
          onBlur={() => { onRename(name); setEditing(false); }}
          className="w-full bg-slate-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded mx-1 mb-0.5">
        <p className="text-xs text-red-300 mb-1.5">Delete "{session.name}"?</p>
        <div className="flex gap-1">
          <button onClick={onDelete} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={\`group flex items-center gap-2 px-2 py-1.5 rounded mx-1 mb-0.5 cursor-pointer transition \${
        isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }\`}
    >
      <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
      <span className="text-sm flex-1 truncate">{session.name}</span>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-slate-600 transition"
          title="Rename"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className="text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const ${plural} = useAppStore((s) => s.${plural});
  const ${load} = useAppStore((s) => s.${load});
  const ${currentId} = useAppStore((s) => s.${currentId});
  const ${setCurrent} = useAppStore((s) => s.${setCurrent});
  const [showApiKeys, setShowApiKeys] = useState(false);

  useEffect(() => { ${load}(); }, []);

  useEffect(() => {
    if (!${currentId} && ${plural}.length > 0) {
      ${setCurrent}(${plural}[0].id);
    }
  }, [${plural}, ${currentId}]);

  async function handleNew${sessionEntity}() {
    const name = \`New Session \${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\`;
    try {
      await invoke('create_${camel}', { input: { name, userId: 'default-user' } });
      await ${load}();
    } catch (err) { console.error('Create ${camel} failed:', err); }
  }

  async function handleRename${sessionEntity}(id: string, name: string) {
    if (!name.trim()) return;
    try {
      await invoke('update_${camel}', { id, input: { name: name.trim() } });
      await ${load}();
    } catch (err) { console.error('Rename failed:', err); }
  }

  async function handleDelete${sessionEntity}(id: string) {
    try {
      await invoke('delete_${camel}', { id });
      await ${load}();
      if (${currentId} === id) ${setCurrent}(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  return (
    <>
      {showApiKeys && <ApiKeyModal onClose={() => setShowApiKeys(false)} />}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-700 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">${appTitle}</h2>
          <button
            onClick={() => setShowApiKeys(true)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
            title="API Keys"
          >
            <Key size={14} />
          </button>
        </div>
        <ModelPicker />
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-1 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Conversations</span>
            <button
              onClick={handleNew${sessionEntity}}
              className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition"
              title="New ${sessionEntity}"
            >
              <Plus size={14} />
            </button>
          </div>
          {${plural}.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">
              No conversations yet.<br />Click + to start one.
            </p>
          )}
          {${plural}.map((session) => (
            <${sessionEntity}Item
              key={session.id}
              session={session}
              isActive={${currentId} === session.id}
              onSelect={() => ${setCurrent}(session.id)}
              onRename={(name) => handleRename${sessionEntity}(session.id, name)}
              onDelete={() => handleDelete${sessionEntity}(session.id)}
            />
          ))}
        </div>
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-gray-600">
          <span>Built on Agicore</span>
        </div>
      </aside>
    </>
  );
}
`;
}

function generateNavRailSidebar(ast: AgiFile): string {
  const items = ast.views
    .filter(v => v.sidebar)
    .map(v => ({
      name: v.name,
      icon: v.sidebar!.icon,
      title: v.title ?? v.name,
    }));

  const iconImports = [...new Set(items.map(i => i.icon))].join(', ');

  return `import { ${iconImports} } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const NAV_ITEMS = [
${items.map(i => `  { view: '${i.name}', icon: ${i.icon}, title: '${i.title}' },`).join('\n')}
];

export function Sidebar() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  return (
    <nav className="w-14 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col items-center py-2 gap-1">
      {NAV_ITEMS.map(({ view, icon: Icon, title }) => (
        <button
          key={view}
          onClick={() => setCurrentView(view)}
          title={title}
          className={\`w-10 h-10 flex items-center justify-center rounded-lg transition-colors \${
            currentView === view
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }\`}
        >
          <Icon size={20} />
        </button>
      ))}
    </nav>
  );
}
`;
}

/**
 * Derive a human-friendly display label from a raw model id when the user
 * didn't supply an explicit LABEL. The strategy is intentionally simple:
 *
 *   1. strip a trailing `-YYYY-MM-DD` or `-YYYYMMDD` date stamp,
 *   2. strip a `latest` suffix,
 *   3. split on `-` and `_`, drop empty tokens,
 *   4. title-case each remaining token (preserve digits + dots verbatim),
 *   5. rejoin with spaces.
 *
 * Examples:
 *   claude-sonnet-4-20250514       -> "Claude Sonnet 4"
 *   claude-haiku-4-5-20251001      -> "Claude Haiku 4 5"
 *   gpt-4o                          -> "Gpt 4o"
 *   gemini-2.5-flash-preview-05-20 -> "Gemini 2.5 Flash Preview"
 *   grok-3-latest                   -> "Grok 3"
 */
/**
 * Emit `src/components/ModelPicker.tsx` — a small dropdown bound to
 * `selectedModel` / `setSelectedModel` in the generated Zustand store.
 *
 * The MODELS array literal mirrors the AI_SERVICE.MODELS block one-for-one
 * (same order as declared in the .agi source). Each entry resolves its label
 * either from the explicit LABEL or via `humanizeModelId()`.
 *
 * The className strings here match what NovaSyn Chat's hand-written picker
 * was using so swapping in `<ModelPicker />` is a visual no-op.
 */
function generateModelPicker(ast: AgiFile): string {
  const ai = ast.aiService;
  // generateModelPicker is only invoked when ai is set — but be defensive.
  if (!ai) return '';

  const entries = ai.models.map(m => {
    const label = m.label ?? humanizeModelId(m.id);
    // JSON.stringify gives us correct JS string escaping for ids that might
    // contain quotes, backslashes, etc.
    return `  { id: ${JSON.stringify(m.id)}, label: ${JSON.stringify(label)}, provider: ${JSON.stringify(m.provider)} },`;
  });

  return `import { useAppStore } from '../store/appStore';

const MODELS = [
${entries.join('\n')}
];

export function ModelPicker() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  return (
    <div className="px-3 py-2 border-b border-slate-700">
      <label className="text-xs text-gray-500 block mb-1">Model</label>
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
`;
}

/**
 * Friendly labels + placeholder hints per provider, used by the generated
 * ApiKeyModal. Anything not in here falls back to {label: provider, placeholder: 'API key'}.
 *
 * `babyai` is in this registry as a key-storage-only entry: it has no chat
 * dispatch template in ai-service.ts (no `call_babyai` is emitted), but the
 * BabyAI HuggingFace endpoint still needs an API key, and the user's muscle
 * memory expects "BabyAI (HuggingFace)" as the dropdown label. The ROUTER
 * tier consults this key at routing time.
 */
const PROVIDER_REGISTRY: Record<string, { label: string; placeholder: string }> = {
  anthropic:   { label: 'Anthropic (Claude)',   placeholder: 'sk-ant-...' },
  openai:      { label: 'OpenAI',               placeholder: 'sk-...' },
  google:      { label: 'Google (Gemini)',      placeholder: 'AIza...' },
  xai:         { label: 'xAI (Grok)',           placeholder: 'xai-...' },
  huggingface: { label: 'HuggingFace',          placeholder: 'hf_...' },
  babyai:      { label: 'BabyAI (HuggingFace)', placeholder: 'hf_...' },
};

/**
 * Emit `src/components/ApiKeyModal.tsx` — a small modal that lists every
 * provider declared in AI_SERVICE.providers, loads existing (masked) keys on
 * mount via `get_api_keys`, and saves changed entries via `set_api_key` on
 * click. Styling matches NovaSyn Chat's hand-written modal so the swap is a
 * visual no-op.
 */
function generateApiKeyModal(ast: AgiFile): string {
  const ai = ast.aiService;
  if (!ai) return '';

  const entries = ai.providers.map(p => {
    const entry = PROVIDER_REGISTRY[p] ?? { label: p, placeholder: 'API key' };
    return `  { id: ${JSON.stringify(p)}, label: ${JSON.stringify(entry.label)}, placeholder: ${JSON.stringify(entry.placeholder)} },`;
  });

  return `import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const PROVIDERS = [
${entries.join('\n')}
];

export function ApiKeyModal({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    // Existing keys come back masked from the Rust side (round-1 AI_SERVICE
    // codegen). We surface the masked form as the placeholder hint rather
    // than the input value so the user can tell which providers are already
    // configured without ever rendering the raw key.
    invoke<Record<string, string>>('get_api_keys')
      .then((existing) => setKeys((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(existing)) {
          if (!(k in next)) next[k] = '';
          (next as Record<string, string>)['__existing_' + k] = v;
        }
        return next;
      }))
      .catch(() => { /* command may not exist yet — silent fail */ });
  }, []);

  async function handleSave() {
    for (const p of PROVIDERS) {
      const value = keys[p.id];
      if (value && value.trim()) {
        try {
          await invoke('set_api_key', { provider: p.id, key: value.trim() });
        } catch {
          // silent fail — keep the modal open if individual saves fail? for
          // now match the hand-written behavior and continue.
        }
      }
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">API Keys</h2>
        <p className="text-xs text-gray-400 mb-4">Stored locally via the AI_SERVICE keys file.</p>
        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const existing = (keys as Record<string, string>)['__existing_' + p.id];
            return (
              <div key={p.id}>
                <label className="text-sm text-gray-300 mb-1 block">
                  {p.label}
                  {existing ? <span className="text-xs text-gray-500 ml-2">(current: {existing})</span> : null}
                </label>
                <input
                  type="password"
                  className="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={p.placeholder}
                  value={keys[p.id] ?? ''}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition">Save Keys</button>
        </div>
      </div>
    </div>
  );
}
`;
}

function generateTitleBar(ast: AgiFile): string {
  return `export function TitleBar() {
  return (
    <div
      className="h-9 bg-[var(--bg-titlebar)] flex items-center px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="text-sm font-medium">${ast.app.title}</span>
    </div>
  );
}
`;
}

export function generateComponents(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  for (const view of ast.views) {
    const entity = view.entity
      ? ast.entities.find(e => e.name === view.entity)
      : undefined;
    files.set(`src/components/${view.name}.tsx`, generateViewComponent(view, entity, ast));
  }

  files.set('src/components/App.tsx', generateAppTsx(ast));
  files.set('src/components/Sidebar.tsx', generateSidebar(ast));
  files.set('src/components/TitleBar.tsx', generateTitleBar(ast));

  // Emit ModelPicker.tsx only when AI_SERVICE is declared — apps without an
  // AI service have no `selectedModel` slot in the store for the picker to
  // bind to, so emitting the file would be a type error in the user's app.
  // ApiKeyModal.tsx is also AI_SERVICE-gated: the Rust commands it invokes
  // (get_api_keys, set_api_key) only exist when ai_service.rs is generated.
  if (ast.aiService) {
    files.set('src/components/ModelPicker.tsx', generateModelPicker(ast));
    files.set('src/components/ApiKeyModal.tsx', generateApiKeyModal(ast));
  }

  return files;
}
