import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

type Tab = 'plants' | 'threads' | 'knowledge';

export default function ContinuityPanel() {
  const {
    plants,
    threads,
    characterKnowledge,
    chapters,
    encyclopediaEntries,
    continuityScanning,
    continuityScanResults,
    knowledgeVerifyResults,
    setShowContinuityPanel,
    createPlant,
    updatePlant,
    deletePlant,
    createThread,
    updateThread,
    deleteThread,
    createCharacterKnowledge,
    updateCharacterKnowledge,
    deleteCharacterKnowledge,
    scanForPlants,
    scanForThreads,
    verifyKnowledge,
    clearScanResults,
  } = useWriterStore();

  const [activeTab, setActiveTab] = useState<Tab>('plants');
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [addingPlant, setAddingPlant] = useState(false);
  const [addingThread, setAddingThread] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [addingKnowledge, setAddingKnowledge] = useState(false);

  // Form state for plants
  const [plantForm, setPlantForm] = useState({
    name: '', setupChapterId: '', setupContent: '', payoffChapterId: '', payoffContent: '', status: 'planned', notes: '',
  });

  // Form state for threads
  const [threadForm, setThreadForm] = useState({
    question: '', raisedChapterId: '', targetChapterId: '', status: 'open', notes: '',
  });

  // Form state for knowledge
  const [knowledgeForm, setKnowledgeForm] = useState({
    chapterId: '', knows: '', doesNotKnow: '',
  });

  const characters = encyclopediaEntries.filter((e) => e.category === 'Character');

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    clearScanResults();
  };

  // ── Plant helpers ──

  const startEditPlant = (plant: any) => {
    setEditingPlantId(plant.id);
    setPlantForm({
      name: plant.name,
      setupChapterId: plant.setupChapterId || '',
      setupContent: plant.setupContent || '',
      payoffChapterId: plant.payoffChapterId || '',
      payoffContent: plant.payoffContent || '',
      status: plant.status,
      notes: plant.notes || '',
    });
  };

  const savePlant = async () => {
    if (editingPlantId) {
      await updatePlant(editingPlantId, {
        name: plantForm.name,
        setupChapterId: plantForm.setupChapterId || null,
        setupContent: plantForm.setupContent,
        payoffChapterId: plantForm.payoffChapterId || null,
        payoffContent: plantForm.payoffContent || null,
        status: plantForm.status as any,
        notes: plantForm.notes,
      });
      setEditingPlantId(null);
    } else if (addingPlant) {
      if (!plantForm.name.trim()) return;
      await createPlant({
        name: plantForm.name,
        setupChapterId: plantForm.setupChapterId || undefined,
        setupContent: plantForm.setupContent || undefined,
        payoffChapterId: plantForm.payoffChapterId || undefined,
        payoffContent: plantForm.payoffContent || undefined,
        status: plantForm.status,
        notes: plantForm.notes || undefined,
      });
      setAddingPlant(false);
    }
    setPlantForm({ name: '', setupChapterId: '', setupContent: '', payoffChapterId: '', payoffContent: '', status: 'planned', notes: '' });
  };

  const acceptPlantSuggestion = async (suggestion: any) => {
    await createPlant({
      name: suggestion.name,
      setupContent: suggestion.setupContent,
      status: suggestion.resolved ? 'resolved' : 'setup',
    });
  };

  // ── Thread helpers ──

  const startEditThread = (thread: any) => {
    setEditingThreadId(thread.id);
    setThreadForm({
      question: thread.question,
      raisedChapterId: thread.raisedChapterId || '',
      targetChapterId: thread.targetChapterId || '',
      status: thread.status,
      notes: thread.notes || '',
    });
  };

  const saveThread = async () => {
    if (editingThreadId) {
      await updateThread(editingThreadId, {
        question: threadForm.question,
        raisedChapterId: threadForm.raisedChapterId || null,
        targetChapterId: threadForm.targetChapterId || null,
        status: threadForm.status as any,
        notes: threadForm.notes,
      });
      setEditingThreadId(null);
    } else if (addingThread) {
      if (!threadForm.question.trim()) return;
      await createThread({
        question: threadForm.question,
        raisedChapterId: threadForm.raisedChapterId || undefined,
        targetChapterId: threadForm.targetChapterId || undefined,
        status: threadForm.status,
        notes: threadForm.notes || undefined,
      });
      setAddingThread(false);
    }
    setThreadForm({ question: '', raisedChapterId: '', targetChapterId: '', status: 'open', notes: '' });
  };

  const acceptThreadSuggestion = async (suggestion: any) => {
    await createThread({
      question: suggestion.question,
      status: suggestion.status || 'open',
    });
  };

  // ── Knowledge helpers ──

  const selectedCharKnowledge = characterKnowledge.filter((k) => k.characterId === selectedCharacterId);

  const saveKnowledge = async () => {
    if (!knowledgeForm.chapterId || !selectedCharacterId) return;
    await createCharacterKnowledge({
      characterId: selectedCharacterId,
      chapterId: knowledgeForm.chapterId,
      knows: knowledgeForm.knows,
      doesNotKnow: knowledgeForm.doesNotKnow,
    });
    setAddingKnowledge(false);
    setKnowledgeForm({ chapterId: '', knows: '', doesNotKnow: '' });
  };

  const getChapterTitle = (id: string | null) => {
    if (!id) return '—';
    return chapters.find((c) => c.id === id)?.title || '—';
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-surface-600 text-surface-300',
      setup: 'bg-yellow-600/30 text-yellow-300',
      resolved: 'bg-green-600/30 text-green-300',
      open: 'bg-orange-600/30 text-orange-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-surface-600 text-surface-300'}`}>
        {status}
      </span>
    );
  };

  const inputClass = 'w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none';
  const selectClass = 'w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none';
  const labelClass = 'text-xs text-surface-500 block mb-1';

  const renderPlantForm = () => (
    <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)] space-y-3">
      <div>
        <label className={labelClass}>Name</label>
        <input className={inputClass} value={plantForm.name} onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })} placeholder="e.g. The mysterious letter" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Setup Chapter</label>
          <select className={selectClass} value={plantForm.setupChapterId} onChange={(e) => setPlantForm({ ...plantForm, setupChapterId: e.target.value })}>
            <option value="">— None —</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Payoff Chapter</label>
          <select className={selectClass} value={plantForm.payoffChapterId} onChange={(e) => setPlantForm({ ...plantForm, payoffChapterId: e.target.value })}>
            <option value="">— None —</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Setup Content</label>
        <textarea className={inputClass} rows={2} value={plantForm.setupContent} onChange={(e) => setPlantForm({ ...plantForm, setupContent: e.target.value })} placeholder="Describe the foreshadowing setup..." />
      </div>
      <div>
        <label className={labelClass}>Payoff Content</label>
        <textarea className={inputClass} rows={2} value={plantForm.payoffContent} onChange={(e) => setPlantForm({ ...plantForm, payoffContent: e.target.value })} placeholder="Describe how it pays off..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select className={selectClass} value={plantForm.status} onChange={(e) => setPlantForm({ ...plantForm, status: e.target.value })}>
            <option value="planned">Planned</option>
            <option value="setup">Setup</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input className={inputClass} value={plantForm.notes} onChange={(e) => setPlantForm({ ...plantForm, notes: e.target.value })} placeholder="Optional notes..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setEditingPlantId(null); setAddingPlant(false); setPlantForm({ name: '', setupChapterId: '', setupContent: '', payoffChapterId: '', payoffContent: '', status: 'planned', notes: '' }); }} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded">Cancel</button>
        <button onClick={savePlant} className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded">Save</button>
      </div>
    </div>
  );

  const renderThreadForm = () => (
    <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)] space-y-3">
      <div>
        <label className={labelClass}>Question / Thread</label>
        <textarea className={inputClass} rows={2} value={threadForm.question} onChange={(e) => setThreadForm({ ...threadForm, question: e.target.value })} placeholder="e.g. Who sent the mysterious letter?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Raised In</label>
          <select className={selectClass} value={threadForm.raisedChapterId} onChange={(e) => setThreadForm({ ...threadForm, raisedChapterId: e.target.value })}>
            <option value="">— None —</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Target Chapter</label>
          <select className={selectClass} value={threadForm.targetChapterId} onChange={(e) => setThreadForm({ ...threadForm, targetChapterId: e.target.value })}>
            <option value="">— None —</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select className={selectClass} value={threadForm.status} onChange={(e) => setThreadForm({ ...threadForm, status: e.target.value })}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input className={inputClass} value={threadForm.notes} onChange={(e) => setThreadForm({ ...threadForm, notes: e.target.value })} placeholder="Optional notes..." />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setEditingThreadId(null); setAddingThread(false); setThreadForm({ question: '', raisedChapterId: '', targetChapterId: '', status: 'open', notes: '' }); }} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded">Cancel</button>
        <button onClick={saveThread} className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded">Save</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowContinuityPanel(false)}>
      <div className="w-[680px] max-h-[80vh] flex flex-col bg-[var(--bg-panel)] rounded-lg border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-surface-200 font-semibold">Continuity Tracking</h2>
          <button onClick={() => setShowContinuityPanel(false)} className="text-surface-500 hover:text-surface-200 text-lg">x</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(['plants', 'threads', 'knowledge'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm capitalize ${activeTab === tab ? 'border-b-2 border-primary-400 text-primary-400' : 'text-surface-400 hover:text-surface-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ── Plants Tab ── */}
          {activeTab === 'plants' && (
            <>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setAddingPlant(true); setEditingPlantId(null); setPlantForm({ name: '', setupChapterId: '', setupContent: '', payoffChapterId: '', payoffContent: '', status: 'planned', notes: '' }); }}
                  className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded"
                >
                  Add Plant
                </button>
                <button
                  onClick={scanForPlants}
                  disabled={continuityScanning}
                  className="px-3 py-1.5 text-xs bg-accent-600 hover:bg-accent-500 text-white rounded disabled:opacity-50"
                >
                  {continuityScanning ? 'Scanning...' : 'AI Scan'}
                </button>
              </div>

              {addingPlant && renderPlantForm()}

              {/* AI Scan Results */}
              {continuityScanResults && continuityScanResults.length > 0 && !continuityScanResults[0]?.error && (
                <div className="space-y-2">
                  <span className="text-xs text-surface-500">AI Suggestions:</span>
                  {continuityScanResults.map((suggestion, i) => (
                    <div key={i} className="bg-[var(--bg-page)] border border-primary-500/30 rounded p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-surface-200 font-medium">{suggestion.name}</p>
                          {suggestion.setupContent && <p className="text-xs text-surface-400 mt-1">{suggestion.setupContent}</p>}
                          {suggestion.setupChapter && <p className="text-xs text-surface-500 mt-1">Chapter: {suggestion.setupChapter}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => acceptPlantSuggestion(suggestion)} className="px-2 py-1 text-xs bg-green-600/30 text-green-300 hover:bg-green-600/50 rounded">Accept</button>
                          <button onClick={() => { const results = continuityScanResults.filter((_, j) => j !== i); useWriterStore.setState({ continuityScanResults: results.length ? results : null }); }} className="px-2 py-1 text-xs text-surface-500 hover:text-surface-300 rounded">Dismiss</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Plant List */}
              {plants.map((plant) => (
                <div key={plant.id}>
                  {editingPlantId === plant.id ? renderPlantForm() : (
                    <div
                      className="bg-[var(--bg-page)] rounded-lg p-3 border border-[var(--border)] cursor-pointer hover:border-primary-500/30 group"
                      onClick={() => startEditPlant(plant)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-surface-200">{plant.name}</span>
                          {statusBadge(plant.status)}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete plant "${plant.name}"?`)) deletePlant(plant.id); }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
                        >
                          x
                        </button>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-surface-500">
                        <span>Setup: {getChapterTitle(plant.setupChapterId)}</span>
                        <span>Payoff: {getChapterTitle(plant.payoffChapterId)}</span>
                      </div>
                      {plant.setupContent && <p className="text-xs text-surface-400 mt-1 truncate">{plant.setupContent}</p>}
                    </div>
                  )}
                </div>
              ))}

              {plants.length === 0 && !addingPlant && (
                <p className="text-sm text-surface-500 text-center py-4">No plants tracked yet. Add one manually or use AI Scan to detect them.</p>
              )}
            </>
          )}

          {/* ── Threads Tab ── */}
          {activeTab === 'threads' && (
            <>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setAddingThread(true); setEditingThreadId(null); setThreadForm({ question: '', raisedChapterId: '', targetChapterId: '', status: 'open', notes: '' }); }}
                  className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded"
                >
                  Add Thread
                </button>
                <button
                  onClick={scanForThreads}
                  disabled={continuityScanning}
                  className="px-3 py-1.5 text-xs bg-accent-600 hover:bg-accent-500 text-white rounded disabled:opacity-50"
                >
                  {continuityScanning ? 'Scanning...' : 'AI Scan'}
                </button>
              </div>

              {addingThread && renderThreadForm()}

              {/* AI Scan Results */}
              {continuityScanResults && continuityScanResults.length > 0 && !continuityScanResults[0]?.error && (
                <div className="space-y-2">
                  <span className="text-xs text-surface-500">AI Suggestions:</span>
                  {continuityScanResults.map((suggestion, i) => (
                    <div key={i} className="bg-[var(--bg-page)] border border-primary-500/30 rounded p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-surface-200">{suggestion.question}</p>
                          {suggestion.raisedChapter && <p className="text-xs text-surface-500 mt-1">Raised in: {suggestion.raisedChapter}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => acceptThreadSuggestion(suggestion)} className="px-2 py-1 text-xs bg-green-600/30 text-green-300 hover:bg-green-600/50 rounded">Accept</button>
                          <button onClick={() => { const results = continuityScanResults.filter((_, j) => j !== i); useWriterStore.setState({ continuityScanResults: results.length ? results : null }); }} className="px-2 py-1 text-xs text-surface-500 hover:text-surface-300 rounded">Dismiss</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Thread List */}
              {threads.map((thread) => (
                <div key={thread.id}>
                  {editingThreadId === thread.id ? renderThreadForm() : (
                    <div
                      className="bg-[var(--bg-page)] rounded-lg p-3 border border-[var(--border)] cursor-pointer hover:border-primary-500/30 group"
                      onClick={() => startEditThread(thread)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm text-surface-200 truncate">{thread.question}</span>
                          {statusBadge(thread.status)}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this thread?')) deleteThread(thread.id); }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs ml-2 shrink-0"
                        >
                          x
                        </button>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-surface-500">
                        <span>Raised: {getChapterTitle(thread.raisedChapterId)}</span>
                        <span>Target: {getChapterTitle(thread.targetChapterId)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {threads.length === 0 && !addingThread && (
                <p className="text-sm text-surface-500 text-center py-4">No threads tracked yet. Add one manually or use AI Scan to detect them.</p>
              )}
            </>
          )}

          {/* ── Knowledge Tab ── */}
          {activeTab === 'knowledge' && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <select
                  className={selectClass + ' max-w-[250px]'}
                  value={selectedCharacterId}
                  onChange={(e) => { setSelectedCharacterId(e.target.value); clearScanResults(); }}
                >
                  <option value="">— Select Character —</option>
                  {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {selectedCharacterId && (
                  <>
                    <button
                      onClick={() => { setAddingKnowledge(true); setKnowledgeForm({ chapterId: '', knows: '', doesNotKnow: '' }); }}
                      className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded"
                    >
                      Add Entry
                    </button>
                    <button
                      onClick={() => verifyKnowledge(selectedCharacterId)}
                      disabled={continuityScanning}
                      className="px-3 py-1.5 text-xs bg-accent-600 hover:bg-accent-500 text-white rounded disabled:opacity-50"
                    >
                      {continuityScanning ? 'Verifying...' : 'AI Verify'}
                    </button>
                  </>
                )}
              </div>

              {/* AI Verify Results */}
              {knowledgeVerifyResults && knowledgeVerifyResults.length > 0 && !knowledgeVerifyResults[0]?.error && (
                <div className="space-y-2 mb-3">
                  <span className="text-xs text-surface-500">Verification Results:</span>
                  {knowledgeVerifyResults.map((issue, i) => (
                    <div key={i} className={`bg-[var(--bg-page)] border rounded p-3 ${issue.severity === 'error' ? 'border-red-500/30' : 'border-yellow-500/30'}`}>
                      <div className="flex items-start gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${issue.severity === 'error' ? 'bg-red-600/30 text-red-300' : 'bg-yellow-600/30 text-yellow-300'}`}>
                          {issue.severity}
                        </span>
                        <div>
                          <p className="text-sm text-surface-200">{issue.issue}</p>
                          {issue.chapter && <p className="text-xs text-surface-500 mt-1">Chapter: {issue.chapter}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {knowledgeVerifyResults && knowledgeVerifyResults.length === 0 && (
                <div className="bg-green-600/10 border border-green-500/30 rounded p-3 mb-3">
                  <p className="text-sm text-green-300">No inconsistencies found. Character knowledge appears consistent.</p>
                </div>
              )}

              {/* Add Knowledge Form */}
              {addingKnowledge && selectedCharacterId && (
                <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)] space-y-3">
                  <div>
                    <label className={labelClass}>Chapter</label>
                    <select className={selectClass} value={knowledgeForm.chapterId} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, chapterId: e.target.value })}>
                      <option value="">— Select Chapter —</option>
                      {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Knows (one item per line)</label>
                    <textarea className={inputClass} rows={3} value={knowledgeForm.knows} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, knows: e.target.value })} placeholder="What this character knows at this point..." />
                  </div>
                  <div>
                    <label className={labelClass}>Does Not Know (one item per line)</label>
                    <textarea className={inputClass} rows={3} value={knowledgeForm.doesNotKnow} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, doesNotKnow: e.target.value })} placeholder="What this character doesn't know..." />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setAddingKnowledge(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded">Cancel</button>
                    <button onClick={saveKnowledge} className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded">Save</button>
                  </div>
                </div>
              )}

              {/* Knowledge Grid */}
              {selectedCharacterId && selectedCharKnowledge.length > 0 && (
                <div className="space-y-2">
                  {chapters.map((chapter) => {
                    const entry = selectedCharKnowledge.find((k) => k.chapterId === chapter.id);
                    if (!entry) return null;
                    return (
                      <div key={entry.id} className="bg-[var(--bg-page)] rounded-lg p-3 border border-[var(--border)] group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-surface-200 font-medium">{chapter.title}</span>
                          <button
                            onClick={() => { if (confirm('Delete this knowledge entry?')) deleteCharacterKnowledge(entry.id); }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
                          >
                            x
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Knows</label>
                            <textarea
                              className={inputClass}
                              rows={3}
                              value={entry.knows}
                              onChange={(e) => updateCharacterKnowledge(entry.id, { knows: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Does Not Know</label>
                            <textarea
                              className={inputClass}
                              rows={3}
                              value={entry.doesNotKnow}
                              onChange={(e) => updateCharacterKnowledge(entry.id, { doesNotKnow: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!selectedCharacterId && (
                <p className="text-sm text-surface-500 text-center py-4">Select a character to view and manage their knowledge states.</p>
              )}
              {selectedCharacterId && selectedCharKnowledge.length === 0 && !addingKnowledge && (
                <p className="text-sm text-surface-500 text-center py-4">No knowledge entries for this character yet. Add one to start tracking.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
