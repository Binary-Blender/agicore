import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { CustomTemplate } from '../../shared/types';

const CHAPTER_TEMPLATES = [
  {
    id: 'blank', name: 'Blank', description: 'Empty chapter',
    content: null,
  },
  {
    id: 'scene', name: 'Scene', description: 'Setting, action, dialogue structure',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Scene Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Setting: Describe the time, place, and atmosphere]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Action: What happens when the scene opens]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Dialogue and interaction between characters]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Scene resolution or transition to next scene]' }] },
      ],
    },
  },
  {
    id: 'flashback', name: 'Flashback', description: 'Past event with transitions',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Flashback: [Event]' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Present moment — trigger that initiates the memory]' }] },
        { type: 'horizontalRule' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Past — the memory unfolds here. Describe the event vividly.]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Key moment — the emotional core of the flashback]' }] },
        { type: 'horizontalRule' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Return to present — how the memory affects the character now]' }] },
      ],
    },
  },
  {
    id: 'action', name: 'Action Sequence', description: 'Fast-paced conflict scene',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action: [Conflict]' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Setup — the calm before. Establish stakes and tension.]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Inciting moment — the conflict erupts. Short sentences. Visceral detail.]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Escalation — things get worse. Raise the stakes.]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Climax — the decisive moment]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Aftermath — immediate consequences and emotional fallout]' }] },
      ],
    },
  },
  {
    id: 'dialogue', name: 'Dialogue Heavy', description: 'Conversation-focused chapter',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Conversation: [Topic]' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Brief setting — where and when this conversation takes place]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '"Opening line of dialogue," Character A said.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '"Response," Character B replied. [Include beats — small actions between dialogue.]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Build tension or reveal information through the exchange]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Closing — how the conversation ends and what changes]' }] },
      ],
    },
  },
  {
    id: 'opening', name: 'Opening Chapter', description: 'Hook, world-building, protagonist intro',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter One' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Hook — a compelling opening line or image that grabs the reader]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Introduce the protagonist — name, defining trait, immediate situation]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[World-building — weave in the setting naturally through action and observation]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Establish the status quo — what is normal life for this character?]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Inciting incident — something disrupts the status quo]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Closing hook — a question or tension that compels the reader forward]' }] },
      ],
    },
  },
];

export default function Sidebar() {
  const {
    projects,
    currentProject,
    chapters,
    currentChapter,
    sections,
    currentSection,
    encyclopediaEntries,
    sidebarWidth,
    selectProject,
    createChapter,
    selectChapter,
    deleteChapter,
    updateChapter,
    createSection,
    selectSection,
    deleteSection,
    setSidebarWidth,
    setShowSettings,
    setShowExport,
    setShowEncyclopediaEditor,
    setShowOutlineEditor,
    setShowVersionHistory,
    setShowAiLog,
    setShowSessionPanel,
    setShowContinuityPanel,
    setShowKnowledgeBase,
    setShowModelComparison,
    setShowBrainDump,
    setShowPipelines,
    setShowAnalysis,
    setShowAmbientSounds,
    setShowRelationshipMap,
    setShowSubmissionPackage,
    setShowDashboard,
    setShowCoverDesigner,
    setShowPublishingPresets,
    setShowTrackedChanges,
    setShowWritingSprint,
    setShowPageSetup,
    setShowFeedbackDashboard,
    setShowPlugins,
    setShowExchange,
    setShowWritingGuide,
    setShowGlobalSearch,
    setShowTimeline,
    setShowStoryboard,
    chapterTargets,
    setChapterTarget,
    deleteChapterTarget,
    importFiles,
    loadProjects,
    reorderChapters,
    goals,
    sessionStats,
    sessionActive,
    currentSession,
  } = useWriterStore();

  const [renamingChapterId, setRenamingChapterId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const isResizing = useRef(false);

  // Load custom templates
  useEffect(() => {
    window.electronAPI.getCustomTemplates().then(setCustomTemplates);
  }, []);

  // Resizable sidebar
  const handleMouseDown = useCallback(() => {
    isResizing.current = true;
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current) {
        setSidebarWidth(e.clientX);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleRenameSubmit = async (id: string) => {
    if (renameValue.trim()) {
      await updateChapter(id, { title: renameValue.trim() });
    }
    setRenamingChapterId(null);
  };

  const toggleSectionExpanded = (chapterId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    setDraggedChapterId(chapterId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (chapterId !== draggedChapterId) {
      setDragOverChapterId(chapterId);
    }
  };

  const handleDragEnd = () => {
    setDraggedChapterId(null);
    setDragOverChapterId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetChapterId: string) => {
    e.preventDefault();
    if (!draggedChapterId || draggedChapterId === targetChapterId) {
      handleDragEnd();
      return;
    }
    const currentIds = chapters.map(ch => ch.id);
    const fromIdx = currentIds.indexOf(draggedChapterId);
    const toIdx = currentIds.indexOf(targetChapterId);
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return; }

    const newIds = [...currentIds];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, draggedChapterId);
    await reorderChapters(newIds);
    handleDragEnd();
  };

  return (
    <div
      className="bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col relative shrink-0"
      style={{ width: sidebarWidth }}
    >
      {/* Project selector */}
      <div className="p-3 border-b border-[var(--border)]">
        <select
          className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
          value={currentProject?.id || ''}
          onChange={(e) => {
            const p = projects.find((p) => p.id === e.target.value);
            if (p) selectProject(p);
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chapters */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              Chapters
            </span>
            <div className="flex items-center gap-1 relative">
              <button
                onClick={() => createChapter(`Chapter ${chapters.length + 1}`)}
                className="text-primary-400 hover:text-primary-300 text-xs"
                title="New Blank Chapter"
              >
                + New
              </button>
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="text-surface-500 hover:text-surface-300 text-xs"
                title="New from Template"
              >
                T
              </button>
              {showTemplateMenu && (
                <div className="absolute top-full right-0 mt-1 w-52 bg-[var(--bg-panel)] border border-[var(--border)] rounded shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
                  {CHAPTER_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={async () => {
                        const title = t.id === 'blank' ? `Chapter ${chapters.length + 1}` : t.name;
                        await createChapter(title);
                        // Apply template content after creation
                        const state = useWriterStore.getState();
                        const newChapter = state.chapters[state.chapters.length - 1];
                        if (newChapter && t.content) {
                          await updateChapter(newChapter.id, { content: JSON.stringify(t.content) });
                        }
                        setShowTemplateMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-surface-300 hover:bg-white/5 hover:text-surface-100"
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] text-surface-500">{t.description}</div>
                    </button>
                  ))}
                  {customTemplates.length > 0 && (
                    <>
                      <div className="border-t border-[var(--border)] my-1" />
                      <div className="px-3 py-1 text-[10px] text-surface-600 uppercase tracking-wider">Custom</div>
                      {customTemplates.map(ct => (
                        <div key={ct.id} className="flex items-center group">
                          <button
                            onClick={async () => {
                              await createChapter(ct.name);
                              const state = useWriterStore.getState();
                              const newChapter = state.chapters[state.chapters.length - 1];
                              if (newChapter && ct.content) {
                                await updateChapter(newChapter.id, { content: ct.content });
                              }
                              setShowTemplateMenu(false);
                            }}
                            className="flex-1 text-left px-3 py-1.5 text-xs text-surface-300 hover:bg-white/5 hover:text-surface-100"
                          >
                            <div className="font-medium">{ct.name}</div>
                            {ct.description && <div className="text-[10px] text-surface-500">{ct.description}</div>}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await window.electronAPI.deleteCustomTemplate(ct.id);
                              const updated = await window.electronAPI.getCustomTemplates();
                              setCustomTemplates(updated);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 px-2 text-xs"
                            title="Delete template"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                  {currentChapter && (
                    <>
                      <div className="border-t border-[var(--border)] my-1" />
                      <button
                        onClick={async () => {
                          const name = prompt('Template name:');
                          if (!name) return;
                          const desc = prompt('Description (optional):') || '';
                          await window.electronAPI.createCustomTemplate({ name, description: desc, content: currentChapter.content || '' });
                          const updated = await window.electronAPI.getCustomTemplates();
                          setCustomTemplates(updated);
                          setShowTemplateMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-primary-400 hover:bg-white/5 hover:text-primary-300"
                      >
                        Save Current as Template
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {chapters.map((chapter) => (
            <div key={chapter.id}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, chapter.id)}
                onDragOver={(e) => handleDragOver(e, chapter.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, chapter.id)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-sm mb-0.5 group transition-all ${
                  currentChapter?.id === chapter.id
                    ? 'bg-primary-600/20 text-primary-300'
                    : 'text-surface-300 hover:bg-white/5'
                } ${draggedChapterId === chapter.id ? 'opacity-40' : ''} ${dragOverChapterId === chapter.id && draggedChapterId !== chapter.id ? 'border-t-2 border-primary-500' : ''}`}
              >
                {/* Expand/collapse sections toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSectionExpanded(chapter.id);
                  }}
                  className="text-surface-500 hover:text-surface-300 w-4 shrink-0"
                >
                  {expandedSections.has(chapter.id) ? '▼' : '▶'}
                </button>

                {renamingChapterId === chapter.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-[var(--bg-page)] text-surface-200 rounded px-1 py-0.5 text-sm border border-primary-500 focus:outline-none"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(chapter.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(chapter.id);
                      if (e.key === 'Escape') setRenamingChapterId(null);
                    }}
                  />
                ) : (
                  <span
                    className="flex-1 truncate"
                    onClick={() => selectChapter(chapter)}
                    onDoubleClick={() => {
                      setRenamingChapterId(chapter.id);
                      setRenameValue(chapter.title);
                    }}
                  >
                    {chapter.title}
                  </span>
                )}

                <span
                  className="text-xs text-surface-600 shrink-0 cursor-pointer hover:text-surface-400"
                  title="Click to set word count target"
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = chapterTargets.find(t => t.chapterId === chapter.id);
                    const input = prompt(`Word count target for "${chapter.title}":`, target ? String(target.targetWords) : '3000');
                    if (input === null) return;
                    const num = parseInt(input, 10);
                    if (num > 0) {
                      setChapterTarget(chapter.id, num);
                    } else if (input === '0' || input === '') {
                      deleteChapterTarget(chapter.id);
                    }
                  }}
                >
                  {chapter.wordCount ?? 0}w
                  {(() => {
                    const target = chapterTargets.find(t => t.chapterId === chapter.id);
                    if (!target) return null;
                    const pct = Math.min(100, Math.round(((chapter.wordCount || 0) / target.targetWords) * 100));
                    return <span className={`ml-1 ${pct >= 100 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-surface-600'}`}>({pct}%)</span>;
                  })()}
                </span>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${chapter.title}"?`)) {
                      deleteChapter(chapter.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-1 shrink-0"
                  title="Delete chapter"
                >
                  x
                </button>
              </div>

              {/* Sections under this chapter */}
              {expandedSections.has(chapter.id) && currentChapter?.id === chapter.id && (
                <div className="ml-6 mb-1">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      onClick={() => selectSection(section)}
                      className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs mb-0.5 group ${
                        currentSection?.id === section.id
                          ? 'bg-primary-600/10 text-primary-300'
                          : 'text-surface-400 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex-1 truncate">{section.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${section.title}"?`)) deleteSection(section.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => createSection(`Section ${sections.length + 1}`)}
                    className="text-primary-400/60 hover:text-primary-400 text-xs px-2 py-1"
                  >
                    + Section
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Encyclopedia */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowEncyclopedia(!showEncyclopedia)}
              className="text-xs font-semibold text-surface-500 uppercase tracking-wider hover:text-surface-300"
            >
              {showEncyclopedia ? '▼' : '▶'} Encyclopedia ({encyclopediaEntries.length})
            </button>
            <button
              onClick={() => setShowEncyclopediaEditor(true)}
              className="text-primary-400 hover:text-primary-300 text-xs"
              title="New Entry"
            >
              + New
            </button>
          </div>

          {showEncyclopedia &&
            encyclopediaEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setShowEncyclopediaEditor(true, entry)}
                className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs text-surface-400 hover:bg-white/5 mb-0.5"
              >
                <span className="text-accent-400 shrink-0">
                  {entry.category === 'Character' ? '👤' :
                   entry.category === 'Location' ? '📍' :
                   entry.category === 'Item' ? '🔮' :
                   entry.category === 'Lore' ? '📜' : '📝'}
                </span>
                <span className="truncate">{entry.name}</span>
                <span className="text-surface-600 shrink-0">{entry.tokens}t</span>
              </div>
            ))}
        </div>
      </div>

      {/* Daily goal mini-indicator */}
      {(() => {
        const dailyGoal = goals.find((g) => g.goalType === 'daily');
        if (!dailyGoal) return null;
        const currentWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        const liveWordsAdded = sessionActive && currentSession
          ? Math.max(0, currentWordCount - currentSession.startWordCount)
          : 0;
        const todayWords = (sessionStats?.todayWords || 0) + (sessionActive ? liveWordsAdded : 0);
        const progress = Math.min(100, Math.round((todayWords / dailyGoal.targetWords) * 100));
        return (
          <div
            className="px-3 py-2 border-t border-[var(--border)] cursor-pointer hover:bg-white/5"
            onClick={() => setShowSessionPanel(true)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-surface-500">{todayWords}/{dailyGoal.targetWords}w</span>
              <div className="flex items-center gap-1">
                {dailyGoal.currentStreak > 0 && (
                  <span className="text-xs text-orange-400">{dailyGoal.currentStreak}d</span>
                )}
                {sessionActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </div>
            </div>
            <div className="w-full h-1.5 bg-[var(--bg-page)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-primary-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Bottom toolbar */}
      <div className="p-2 border-t border-[var(--border)] flex flex-wrap items-center gap-1">
        <button
          onClick={() => setShowSessionPanel(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Session Tracking"
        >
          Sessions
        </button>
        <button
          onClick={() => setShowContinuityPanel(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Continuity Tracking"
        >
          Continuity
        </button>
        <button
          onClick={() => setShowKnowledgeBase(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Knowledge Base"
        >
          Knowledge
        </button>
        <button
          onClick={() => setShowBrainDump(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Brain Dump"
        >
          Dump
        </button>
        <button
          onClick={() => setShowModelComparison(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Model Comparison"
        >
          Compare
        </button>
        <button
          onClick={() => setShowPipelines(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Transformation Pipelines"
        >
          Pipelines
        </button>
        <button
          onClick={() => setShowAnalysis(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Manuscript Analysis"
        >
          Analyze
        </button>
        <button
          onClick={() => setShowRelationshipMap(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Character Relationship Map"
        >
          Relations
        </button>
        <button
          onClick={() => setShowSubmissionPackage(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Submission Package Generator"
        >
          Submit
        </button>
        <button
          onClick={() => setShowOutlineEditor(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Chapter Outline"
        >
          Outline
        </button>
        <button
          onClick={() => setShowVersionHistory(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Version History"
        >
          History
        </button>
        <button
          onClick={() => setShowAiLog(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="AI Operation Log"
        >
          AI Log
        </button>
        <button
          onClick={() => setShowAmbientSounds(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Ambient Sounds"
        >
          Sounds
        </button>
        <button
          onClick={() => setShowCoverDesigner(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Cover Designer"
        >
          Cover
        </button>
        <button
          onClick={() => setShowDashboard(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Writing Dashboard"
        >
          Dashboard
        </button>
        <button
          onClick={() => setShowPublishingPresets(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Publishing Presets (KDP, IngramSpark, etc.)"
        >
          Publish
        </button>
        <button
          onClick={() => setShowWritingSprint(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Writing Sprint — Timed writing sessions"
        >
          Sprint
        </button>
        <button
          onClick={() => setShowTrackedChanges(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Tracked Changes — Accept/reject edits"
        >
          Changes
        </button>
        <button
          onClick={() => setShowPageSetup(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Page Setup — Size, margins, headers/footers"
        >
          Page
        </button>
        <button
          onClick={() => setShowFeedbackDashboard(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Feedback Dashboard — AI revision plan from comments"
        >
          Feedback
        </button>
        <button
          onClick={async () => {
            if (!currentProject) return;
            const authorName = prompt('Author name for review copy:') || '';
            const result = await window.electronAPI.exportReviewCopy(currentProject.id, {
              authorName,
              includeComments: true,
              includeQuestions: true,
            });
            if (result.success) alert(`Review copy saved to ${result.filePath}`);
          }}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Export review copy for beta readers"
        >
          Review
        </button>
        <button
          onClick={() => importFiles()}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Import text/markdown files as chapters"
        >
          Import
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Export"
        >
          Export
        </button>
        <button
          onClick={async () => {
            if (!currentProject) return;
            const result = await window.electronAPI.backupProject(currentProject.id);
            if (result.success) alert(`Backup saved to ${result.filePath}`);
          }}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Backup project as JSON"
        >
          Backup
        </button>
        <button
          onClick={async () => {
            const result = await window.electronAPI.restoreProject();
            if (result.success) {
              await loadProjects();
              alert(`Restored: ${result.projectName}`);
            }
          }}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Restore project from JSON backup"
        >
          Restore
        </button>
        <button
          onClick={() => setShowPlugins(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Plugins — Word frequency, reading time, text stats"
        >
          Plugins
        </button>
        <button
          onClick={() => setShowExchange(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="NovaSyn Exchange — Send/receive content between NovaSyn apps"
        >
          Exchange
        </button>
        <button
          onClick={() => setShowWritingGuide(true)}
          className="flex-1 px-2 py-1.5 text-xs text-primary-400/80 hover:text-primary-300 hover:bg-primary-600/10 rounded"
          title="AI Writing Guide — Writing coach, app guide, and mentor"
        >
          Guide
        </button>
        <button
          onClick={() => setShowGlobalSearch(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Global Search — Search across all content (Ctrl+Shift+F)"
        >
          Search
        </button>
        <button
          onClick={() => setShowTimeline(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Timeline — Visual story chronology"
        >
          Timeline
        </button>
        <button
          onClick={() => setShowStoryboard(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Storyboard — Visual chapter cards with status tracking"
        >
          Board
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 px-2 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-white/5 rounded"
          title="Settings"
        >
          Settings
        </button>
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-500/50 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
