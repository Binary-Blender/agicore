import React from 'react';
import { useCouncilStore } from '../store/councilStore';
import SoloChat from './SoloChat';

const MODEL_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-600/20 text-orange-300',
  openai: 'bg-green-600/20 text-green-300',
  google: 'bg-blue-600/20 text-blue-300',
  xai: 'bg-purple-600/20 text-purple-300',
};

const CATEGORY_COLORS: Record<string, string> = {
  domain: 'bg-blue-600/30 text-blue-300',
  technical: 'bg-green-600/30 text-green-300',
  business: 'bg-yellow-600/30 text-yellow-300',
  persona_specific: 'bg-purple-600/30 text-purple-300',
  meta: 'bg-cyan-600/30 text-cyan-300',
};

const LOADING_RULE_LABELS: Record<string, string> = {
  always: 'Always',
  available: 'Available',
  manual: 'Manual',
};

const TABS = [
  { key: 'overview' as const, label: 'Overview' },
  { key: 'chat' as const, label: 'Chat' },
  { key: 'skilldocs' as const, label: 'Skill Docs' },
  { key: 'memories' as const, label: 'Memories' },
];

export default function PersonaDetail() {
  const {
    currentPersona,
    models,
    skillDocs,
    memories,
    conversations,
    relationships,
    activePersonaTab,
    memorySearchQuery,
    setActivePersonaTab,
    setShowPersonaBuilder,
    setEditingPersona,
    setShowSkillDocEditor,
    setEditingSkillDoc,
    setShowMemoryEditor,
    setEditingMemory,
    setShowRelationshipPanel,
    deletePersona,
    deleteSkillDoc,
    deleteMemory,
    searchMemories,
    clearMemorySearch,
  } = useCouncilStore();

  if (!currentPersona) return null;

  const modelInfo = models.find(m => m.id === currentPersona.model);
  const providerColor = modelInfo ? MODEL_COLORS[modelInfo.provider] || 'bg-surface-600/20 text-surface-400' : 'bg-surface-600/20 text-surface-400';

  const handleDelete = () => {
    if (confirm(`Delete "${currentPersona.name}"? This will also delete all their skill docs and memories.`)) {
      deletePersona(currentPersona.id);
    }
  };

  const personaSkillDocs = skillDocs.filter(d => d.personaId === currentPersona.id);
  const globalSkillDocs = skillDocs.filter(d => !d.personaId);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{currentPersona.avatarEmoji}</div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-surface-200 mb-1">{currentPersona.name}</h1>
            <p className="text-sm text-surface-400 mb-3">{currentPersona.role}</p>

            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded ${providerColor}`}>
                {modelInfo?.name || currentPersona.model}
              </span>
              {currentPersona.department && (
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-surface-400">
                  {currentPersona.department}
                </span>
              )}
              <span className="text-xs text-surface-500">
                Temp: {currentPersona.temperature}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-surface-500">
              <span>{currentPersona.totalConversations} conversations</span>
              <span>{currentPersona.totalTokensUsed.toLocaleString()} tokens</span>
              <span>${currentPersona.totalCost.toFixed(4)} spent</span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowRelationshipPanel(true)}
              className="px-3 py-1.5 text-xs bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded transition-colors"
            >
              Relationships{relationships.length > 0 ? ` (${relationships.length})` : ''}
            </button>
            <button
              onClick={() => {
                setEditingPersona(currentPersona);
                setShowPersonaBuilder(true);
              }}
              className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-surface-300 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {currentPersona.bio && (
          <p className="text-sm text-surface-400 mt-4">{currentPersona.bio}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActivePersonaTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
              activePersonaTab === tab.key
                ? 'text-primary-400'
                : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            {tab.label}
            {tab.key === 'chat' && conversations.length > 0 && (
              <span className="ml-1.5 text-[10px] text-surface-500">({conversations.length})</span>
            )}
            {tab.key === 'skilldocs' && skillDocs.length > 0 && (
              <span className="ml-1.5 text-[10px] text-surface-500">({skillDocs.length})</span>
            )}
            {tab.key === 'memories' && memories.length > 0 && (
              <span className="ml-1.5 text-[10px] text-surface-500">({memories.length})</span>
            )}
            {activePersonaTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activePersonaTab === 'overview' && (
        <OverviewTab persona={currentPersona} />
      )}
      {activePersonaTab === 'chat' && (
        <SoloChat />
      )}
      {activePersonaTab === 'skilldocs' && (
        <SkillDocsTab
          personaDocs={personaSkillDocs}
          globalDocs={globalSkillDocs}
          personaName={currentPersona.name}
          onAdd={() => {
            setEditingSkillDoc(null);
            setShowSkillDocEditor(true);
          }}
          onEdit={(doc) => {
            setEditingSkillDoc(doc);
            setShowSkillDocEditor(true);
          }}
          onDelete={(id) => {
            if (confirm('Delete this skill doc?')) {
              deleteSkillDoc(id);
            }
          }}
        />
      )}
      {activePersonaTab === 'memories' && (
        <MemoriesTab
          memories={memories}
          personaName={currentPersona.name}
          searchQuery={memorySearchQuery}
          onSearch={searchMemories}
          onClearSearch={clearMemorySearch}
          onAdd={() => {
            setEditingMemory(null);
            setShowMemoryEditor(true);
          }}
          onEdit={(memory) => {
            setEditingMemory(memory);
            setShowMemoryEditor(true);
          }}
          onDelete={(id) => {
            if (confirm('Delete this memory?')) {
              deleteMemory(id);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ persona }: { persona: any }) {
  return (
    <>
      {/* System Prompt */}
      <div className="p-6 border-b border-white/5">
        <h2 className="text-sm font-semibold text-surface-300 mb-2">System Prompt</h2>
        <div className="bg-[var(--bg-input)] rounded-lg p-3 border border-white/5 max-h-40 overflow-y-auto">
          <pre className="text-xs text-surface-400 whitespace-pre-wrap font-sans">{persona.systemPrompt}</pre>
        </div>
      </div>

      {/* Behavior Rules */}
      {persona.behaviorRules.length > 0 && (
        <div className="p-6 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-300 mb-2">Behavior Rules</h2>
          <ul className="space-y-1">
            {persona.behaviorRules.map((rule: string, i: number) => (
              <li key={i} className="text-xs text-surface-400 flex items-start gap-2">
                <span className="text-surface-600 shrink-0">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Communication Style */}
      {persona.communicationStyle && (
        <div className="p-6 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-300 mb-2">Communication Style</h2>
          <p className="text-xs text-surface-400">{persona.communicationStyle}</p>
        </div>
      )}
    </>
  );
}

// ─── Skill Docs Tab ────────────────────────────────────────────────────────────

interface SkillDocsTabProps {
  personaDocs: any[];
  globalDocs: any[];
  personaName: string;
  onAdd: () => void;
  onEdit: (doc: any) => void;
  onDelete: (id: string) => void;
}

function SkillDocsTab({ personaDocs, globalDocs, personaName, onAdd, onEdit, onDelete }: SkillDocsTabProps) {
  const totalTokens = [...personaDocs, ...globalDocs].reduce((sum, d) => sum + d.tokenCount, 0);

  return (
    <div className="p-6">
      {/* Header + Add button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-300">Skill Documents</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            {personaDocs.length + globalDocs.length} docs · ~{totalTokens.toLocaleString()} tokens
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
        >
          + Add Skill Doc
        </button>
      </div>

      {/* Persona-specific docs */}
      {personaDocs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-surface-500 mb-2">{personaName}'s Documents</h3>
          <div className="space-y-2">
            {personaDocs.map(doc => (
              <SkillDocRow key={doc.id} doc={doc} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Global docs */}
      {globalDocs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-surface-500 mb-2">Global Documents</h3>
          <div className="space-y-2">
            {globalDocs.map(doc => (
              <SkillDocRow key={doc.id} doc={doc} onEdit={onEdit} onDelete={onDelete} isGlobal />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {personaDocs.length === 0 && globalDocs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">📄</p>
          <p className="text-sm text-surface-500 mb-1">No skill docs yet</p>
          <p className="text-xs text-surface-600 mb-4">
            Skill docs provide knowledge and expertise context to {personaName}
          </p>
          <button
            onClick={onAdd}
            className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            Create First Skill Doc
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Memories Tab ──────────────────────────────────────────────────────────────

const MEMORY_TYPE_COLORS: Record<string, string> = {
  decision: 'bg-blue-600/30 text-blue-300',
  lesson: 'bg-green-600/30 text-green-300',
  fact: 'bg-yellow-600/30 text-yellow-300',
  preference: 'bg-purple-600/30 text-purple-300',
  insight: 'bg-cyan-600/30 text-cyan-300',
  correction: 'bg-red-600/30 text-red-300',
};

interface MemoriesTabProps {
  memories: any[];
  personaName: string;
  searchQuery: string;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onAdd: () => void;
  onEdit: (memory: any) => void;
  onDelete: (id: string) => void;
}

function MemoriesTab({ memories, personaName, searchQuery, onSearch, onClearSearch, onAdd, onEdit, onDelete }: MemoriesTabProps) {
  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      onSearch(localSearch.trim());
    } else {
      onClearSearch();
    }
  };

  const personaMemories = memories.filter(m => m.personaId !== null);
  const sharedMemories = memories.filter(m => m.personaId === null);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-300">Memories</h2>
          <p className="text-xs text-surface-500 mt-0.5">
            {memories.length} memories
            {searchQuery && <span> matching "{searchQuery}"</span>}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
        >
          + Add Memory
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search memories..."
          className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50"
        />
        <button type="submit" className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-surface-300 rounded-lg transition-colors">
          Search
        </button>
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setLocalSearch(''); onClearSearch(); }}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Persona memories */}
      {personaMemories.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-surface-500 mb-2">{personaName}'s Memories</h3>
          <div className="space-y-2">
            {personaMemories.map(mem => (
              <MemoryRow key={mem.id} memory={mem} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Shared memories */}
      {sharedMemories.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-surface-500 mb-2">Shared Memories</h3>
          <div className="space-y-2">
            {sharedMemories.map(mem => (
              <MemoryRow key={mem.id} memory={mem} onEdit={onEdit} onDelete={onDelete} isShared />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {memories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">🧠</p>
          <p className="text-sm text-surface-500 mb-1">
            {searchQuery ? 'No matching memories' : 'No memories yet'}
          </p>
          <p className="text-xs text-surface-600 mb-4">
            {searchQuery
              ? 'Try a different search term'
              : `Memories help ${personaName} remember important context across conversations`
            }
          </p>
          {!searchQuery && (
            <button
              onClick={onAdd}
              className="px-4 py-2 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
            >
              Create First Memory
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MemoryRow({ memory, onEdit, onDelete, isShared }: { memory: any; onEdit: (m: any) => void; onDelete: (id: string) => void; isShared?: boolean }) {
  const typeColor = MEMORY_TYPE_COLORS[memory.memoryType] || 'bg-surface-600/30 text-surface-400';

  // Importance bar color
  const importanceColor = memory.importance >= 0.8
    ? 'bg-red-500'
    : memory.importance >= 0.5
      ? 'bg-yellow-500'
      : 'bg-surface-500';

  return (
    <div className="group flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/5 transition-colors">
      {/* Importance indicator */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <div className={`w-1.5 h-6 rounded-full ${importanceColor}`} title={`Importance: ${memory.importance}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColor}`}>
            {memory.memoryType}
          </span>
          {isShared && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-surface-400">🌐 Shared</span>
          )}
          <span className="text-[10px] text-surface-600">
            {memory.importance.toFixed(1)} importance
          </span>
        </div>
        <p className="text-sm text-surface-300 leading-relaxed">{memory.content}</p>
        <div className="flex items-center gap-3 text-[10px] text-surface-500 mt-1">
          {memory.relevanceTags.length > 0 && (
            <span className="truncate">{memory.relevanceTags.join(', ')}</span>
          )}
          {memory.timesReferenced > 0 && (
            <span>Referenced {memory.timesReferenced}x</span>
          )}
          <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(memory)}
          className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 text-surface-300 rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(memory.id)}
          className="px-2 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function SkillDocRow({ doc, onEdit, onDelete, isGlobal }: { doc: any; onEdit: (doc: any) => void; onDelete: (id: string) => void; isGlobal?: boolean }) {
  const categoryColor = CATEGORY_COLORS[doc.category] || 'bg-surface-600/30 text-surface-400';

  return (
    <div className="group flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-surface-200 font-medium truncate">{doc.title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColor}`}>
            {doc.category.replace('_', ' ')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-surface-400">
            {LOADING_RULE_LABELS[doc.loadingRule] || doc.loadingRule}
          </span>
          {isGlobal && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-surface-400">🌐 Global</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-surface-500">
          <span>~{doc.tokenCount.toLocaleString()} tokens</span>
          {doc.relevanceTags.length > 0 && (
            <span className="truncate">{doc.relevanceTags.join(', ')}</span>
          )}
          {doc.timesReferenced > 0 && (
            <span>Referenced {doc.timesReferenced}x</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(doc)}
          className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 text-surface-300 rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="px-2 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
