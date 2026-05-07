import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-yellow-600/30 text-yellow-300' },
  { value: 'writing', label: 'Writing', color: 'bg-blue-600/30 text-blue-300' },
  { value: 'revision', label: 'Revision', color: 'bg-orange-600/30 text-orange-300' },
  { value: 'done', label: 'Done', color: 'bg-green-600/30 text-green-300' },
  { value: 'outline', label: 'Outline', color: 'bg-purple-600/30 text-purple-300' },
];

export default function StoryboardPanel() {
  const {
    chapters,
    currentChapter,
    chapterTargets,
    encyclopediaEntries,
    setShowStoryboard,
    selectChapter,
    reorderChapters,
  } = useWriterStore();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [cardStatuses, setCardStatuses] = useState<Record<string, string>>(() => {
    // Initialize from localStorage
    try {
      return JSON.parse(localStorage.getItem('storyboard-statuses') || '{}');
    } catch { return {}; }
  });
  const [cardSynopses, setCardSynopses] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('storyboard-synopses') || '{}');
    } catch { return {}; }
  });
  const [cardPovs, setCardPovs] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('storyboard-povs') || '{}');
    } catch { return {}; }
  });
  const [editingCard, setEditingCard] = useState<string | null>(null);

  const characters = encyclopediaEntries.filter(e => e.category === 'Character');

  const saveStatuses = (data: Record<string, string>) => {
    setCardStatuses(data);
    localStorage.setItem('storyboard-statuses', JSON.stringify(data));
  };

  const saveSynopses = (data: Record<string, string>) => {
    setCardSynopses(data);
    localStorage.setItem('storyboard-synopses', JSON.stringify(data));
  };

  const savePovs = (data: Record<string, string>) => {
    setCardPovs(data);
    localStorage.setItem('storyboard-povs', JSON.stringify(data));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    const ids = chapters.map(c => c.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) { setDraggedId(null); setDragOverId(null); return; }
    const newIds = [...ids];
    newIds.splice(from, 1);
    newIds.splice(to, 0, draggedId);
    await reorderChapters(newIds);
    setDraggedId(null);
    setDragOverId(null);
  };

  const filteredChapters = filterStatus === 'all'
    ? chapters
    : chapters.filter(ch => (cardStatuses[ch.id] || 'draft') === filterStatus);

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-[900px] max-h-[85vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-surface-200">Storyboard</h2>
            <span className="text-xs text-surface-500">{chapters.length} chapters &middot; {totalWords.toLocaleString()} words</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1a1a2e] text-surface-300 text-xs rounded px-2 py-1 border border-white/10 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowStoryboard(false)}
              className="text-surface-500 hover:text-surface-300 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <div className="grid grid-cols-3 gap-3">
            {filteredChapters.map((chapter, idx) => {
              const status = cardStatuses[chapter.id] || 'draft';
              const statusCfg = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
              const synopsis = cardSynopses[chapter.id] || '';
              const pov = cardPovs[chapter.id] || '';
              const target = chapterTargets.find(t => t.chapterId === chapter.id);
              const progress = target ? Math.min(100, Math.round(((chapter.wordCount || 0) / target.targetWords) * 100)) : null;
              const isEditing = editingCard === chapter.id;
              const isCurrent = currentChapter?.id === chapter.id;

              return (
                <div
                  key={chapter.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, chapter.id)}
                  onDragOver={(e) => handleDragOver(e, chapter.id)}
                  onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                  onDrop={(e) => handleDrop(e, chapter.id)}
                  className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all ${
                    isCurrent ? 'border-primary-500/40 bg-primary-600/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                  } ${draggedId === chapter.id ? 'opacity-40' : ''} ${dragOverId === chapter.id ? 'border-primary-500 border-2' : ''}`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-surface-600">#{idx + 1}</span>
                        <span className="text-xs font-medium text-surface-200 truncate">{chapter.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusCfg.color}`}>{statusCfg.label}</span>
                        {pov && <span className="text-[10px] text-surface-500">POV: {pov}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCard(isEditing ? null : chapter.id); }}
                      className="text-[10px] text-surface-500 hover:text-surface-300 shrink-0 ml-1"
                    >
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  {/* Synopsis */}
                  {isEditing ? (
                    <div className="space-y-1.5 mb-2">
                      <textarea
                        value={synopsis}
                        onChange={(e) => saveSynopses({ ...cardSynopses, [chapter.id]: e.target.value })}
                        placeholder="Synopsis..."
                        rows={3}
                        className="w-full bg-[#1a1a2e] text-surface-300 text-[11px] rounded px-2 py-1 border border-white/10 focus:border-primary-500 focus:outline-none resize-none"
                      />
                      <div className="flex gap-1.5">
                        <select
                          value={status}
                          onChange={(e) => saveStatuses({ ...cardStatuses, [chapter.id]: e.target.value })}
                          className="flex-1 bg-[#1a1a2e] text-surface-300 text-[11px] rounded px-1.5 py-1 border border-white/10 focus:outline-none"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <select
                          value={pov}
                          onChange={(e) => savePovs({ ...cardPovs, [chapter.id]: e.target.value })}
                          className="flex-1 bg-[#1a1a2e] text-surface-300 text-[11px] rounded px-1.5 py-1 border border-white/10 focus:outline-none"
                        >
                          <option value="">No POV</option>
                          {characters.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : synopsis ? (
                    <p className="text-[11px] text-surface-400 mb-2 line-clamp-3">{synopsis}</p>
                  ) : (
                    <p className="text-[11px] text-surface-600 italic mb-2">No synopsis</p>
                  )}

                  {/* Word count + target */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-surface-500">{(chapter.wordCount || 0).toLocaleString()} words</span>
                    {progress !== null && (
                      <span className={`text-[10px] ${progress >= 100 ? 'text-green-400' : progress >= 50 ? 'text-yellow-400' : 'text-surface-500'}`}>
                        {progress}%
                      </span>
                    )}
                  </div>
                  {progress !== null && (
                    <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-primary-500'}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  )}

                  {/* Click to navigate */}
                  <button
                    onClick={() => { selectChapter(chapter); setShowStoryboard(false); }}
                    className="w-full mt-2 text-[10px] text-primary-400/60 hover:text-primary-400 transition-colors"
                  >
                    Go to chapter
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
