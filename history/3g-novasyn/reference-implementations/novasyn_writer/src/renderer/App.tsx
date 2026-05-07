import React, { useState, useEffect, useCallback } from 'react';
import { useWriterStore } from './store/writerStore';
import Sidebar from './components/Sidebar';
import { VaultBrowser } from './components/VaultBrowser';
import Editor from './components/Editor';
import EditorToolbar from './components/EditorToolbar';
import AIPanel from './components/AIPanel';
import SettingsPanel from './components/SettingsPanel';
import ExportModal from './components/ExportModal';
import EncyclopediaEditor from './components/EncyclopediaEditor';
import OutlineEditor from './components/OutlineEditor';
import OnboardingScreen from './components/OnboardingScreen';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import AiOperationLog from './components/AiOperationLog';
import SessionPanel from './components/SessionPanel';
import DiscoveryLog from './components/DiscoveryLog';
import ContinuityPanel from './components/ContinuityPanel';
import KnowledgeBasePanel from './components/KnowledgeBasePanel';
import ModelComparisonPanel from './components/ModelComparisonPanel';
import BrainDumpPanel from './components/BrainDumpPanel';
import PipelinePanel from './components/PipelinePanel';
import AnalysisPanel from './components/AnalysisPanel';
import AmbientSoundsPanel from './components/AmbientSoundsPanel';
import RelationshipMapPanel from './components/RelationshipMapPanel';
import SubmissionPackagePanel from './components/SubmissionPackagePanel';
import WritingDashboardPanel from './components/WritingDashboardPanel';
import CoverDesignerPanel from './components/CoverDesignerPanel';
import PublishingPresetsPanel from './components/PublishingPresetsPanel';
import TrackedChangesPanel from './components/TrackedChangesPanel';
import WritingSprintPanel from './components/WritingSprintPanel';
import PageSetupPanel from './components/PageSetupPanel';
import FeedbackDashboardPanel from './components/FeedbackDashboardPanel';
import PluginsPanel from './components/PluginsPanel';
import ExchangePanel from './components/ExchangePanel';
import WritingGuidePanel from './components/WritingGuidePanel';
import GlobalSearchPanel from './components/GlobalSearchPanel';
import TimelinePanel from './components/TimelinePanel';
import StoryboardPanel from './components/StoryboardPanel';
import { OrchestrationBuilder } from './components/OrchestrationBuilder';
import { OrchestrationRunner } from './components/OrchestrationRunner';
import type { Orchestration } from '../shared/types';

export default function App() {
  const {
    projects,
    currentProject,
    currentChapter,
    aiPanelOpen,
    showSettings,
    showExport,
    showEncyclopediaEditor,
    showOutlineEditor,
    showVersionHistory,
    showAiLog,
    showSessionPanel,
    showDiscoveryLog,
    showContinuityPanel,
    showKnowledgeBase,
    showModelComparison,
    showBrainDump,
    showPipelines,
    showAnalysis,
    showAmbientSounds,
    showRelationshipMap,
    showSubmissionPackage,
    showDashboard,
    showCoverDesigner,
    showPublishingPresets,
    showTrackedChanges,
    showWritingSprint,
    showPageSetup,
    showFeedbackDashboard,
    showPlugins,
    showExchange,
    showWritingGuide,
    showGlobalSearch,
    showTimeline,
    showStoryboard,
    showOrchBuilder,
    orchestrations,
    setOrchestrations,
    addOrchestration,
    updateOrchestrationInStore,
    setShowOrchBuilder,
    settings,
    distractionFree,
    loadProjects,
    loadSettings,
    loadModels,
    loadApiKeys,
    toggleAiPanel,
    toggleDistractionFree,
    createChapter,
  } = useWriterStore();

  const [showVault, setShowVault] = useState(false);
  const [editingOrchestration, setEditingOrchestration] = useState<Orchestration | undefined>(undefined);
  const [showOrchRunner, setShowOrchRunner] = useState(false);
  const [runningRunId, setRunningRunId] = useState<string | null>(null);
  const [runningOrchName, setRunningOrchName] = useState('');

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadSettings();
    loadModels();
    loadApiKeys();
    window.electronAPI.orchList().then((data) => setOrchestrations(data || [])).catch(console.error);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  // End session on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useWriterStore.getState();
      if (state.sessionActive) {
        state.endSession();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // AI tool shortcut helper
  const triggerAiTool = useCallback((prompt: string) => {
    const state = useWriterStore.getState();
    if (!state.aiPanelOpen) {
      state.toggleAiPanel();
    }

    // Get selected text from editor
    const editor = (window as any).__tiptapEditor;
    let fullPrompt = prompt;
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        fullPrompt = `${prompt}\n\nSelected text:\n${selectedText}`;
      }
    }

    state.sendAiPrompt(fullPrompt, state.settings.selectedModel, []);
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleAiPanel();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        useWriterStore.getState().setShowGlobalSearch(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        triggerAiTool('Expand on the following text with more detail, description, and depth. Keep the same style and voice.');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        triggerAiTool('Rewrite the following text to improve clarity, flow, and engagement while preserving the original meaning and voice.');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        triggerAiTool('Continue writing from where the text left off. Maintain the same style, tone, and voice. Write 2-3 paragraphs.');
      }
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (currentProject) {
          const count = useWriterStore.getState().chapters.length;
          createChapter(`Chapter ${count + 1}`);
        }
      }
      if (e.key === 'F11') {
        e.preventDefault();
        toggleDistractionFree();
      }
      if (e.key === 'Escape' && useWriterStore.getState().distractionFree) {
        e.preventDefault();
        toggleDistractionFree();
      }
    },
    [currentProject, triggerAiTool, toggleDistractionFree],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Show onboarding if no projects
  if (projects.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-[var(--bg-page)]">
        <TitleBar onOpenVault={() => setShowVault(true)} onOpenOrchestrations={() => { setEditingOrchestration(undefined); setShowOrchBuilder(true); }} />
        <OnboardingScreen />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)]">
      {!distractionFree && <TitleBar onOpenVault={() => setShowVault(true)} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!distractionFree && <Sidebar />}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentChapter ? (
            <>
              {!distractionFree && <EditorToolbar />}
              <Editor />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-surface-500">
              <div className="text-center">
                <p className="text-lg mb-2">No chapter selected</p>
                <p className="text-sm">Select a chapter from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Panel */}
        {aiPanelOpen && !distractionFree && <AIPanel />}
      </div>

      {/* Distraction-free exit hint */}
      {distractionFree && (
        <div className="fixed top-3 right-3 z-50">
          <button
            onClick={toggleDistractionFree}
            className="px-3 py-1.5 text-xs text-surface-600 hover:text-surface-300 bg-[var(--bg-panel)] hover:bg-[var(--bg-panel)] rounded transition-all opacity-0 hover:opacity-100"
          >
            Exit (F11)
          </button>
        </div>
      )}

      {/* Modals */}
      {showSettings && <SettingsPanel />}
      {showExport && <ExportModal />}
      {showEncyclopediaEditor && <EncyclopediaEditor />}
      {showOutlineEditor && <OutlineEditor />}
      {showVersionHistory && <VersionHistoryPanel />}
      {showAiLog && <AiOperationLog />}
      {showSessionPanel && <SessionPanel />}
      {showDiscoveryLog && <DiscoveryLog />}
      {showContinuityPanel && <ContinuityPanel />}
      {showKnowledgeBase && <KnowledgeBasePanel />}
      {showModelComparison && <ModelComparisonPanel />}
      {showBrainDump && <BrainDumpPanel />}
      {showPipelines && <PipelinePanel />}
      {showAnalysis && <AnalysisPanel />}
      {showAmbientSounds && <AmbientSoundsPanel />}
      {showRelationshipMap && <RelationshipMapPanel />}
      {showSubmissionPackage && <SubmissionPackagePanel />}
      {showDashboard && <WritingDashboardPanel />}
      {showCoverDesigner && <CoverDesignerPanel />}
      {showPublishingPresets && <PublishingPresetsPanel />}
      {showTrackedChanges && <TrackedChangesPanel />}
      {showWritingSprint && <WritingSprintPanel />}
      {showPageSetup && <PageSetupPanel />}
      {showFeedbackDashboard && <FeedbackDashboardPanel />}
      {showPlugins && <PluginsPanel />}
      {showExchange && <ExchangePanel />}
      {showWritingGuide && <WritingGuidePanel />}
      {showGlobalSearch && <GlobalSearchPanel />}
      {showTimeline && <TimelinePanel />}
      {showStoryboard && <StoryboardPanel />}
      {showOrchBuilder && (
        <OrchestrationBuilder
          orchestration={editingOrchestration}
          onClose={() => { setShowOrchBuilder(false); setEditingOrchestration(undefined); }}
          onSaved={(orch) => {
            if (editingOrchestration) {
              updateOrchestrationInStore(orch.id, orch);
            } else {
              addOrchestration(orch);
            }
            setShowOrchBuilder(false);
            setEditingOrchestration(undefined);
          }}
          onRun={async (orchId) => {
            setShowOrchBuilder(false);
            const orch = orchestrations.find((o) => o.id === orchId);
            try {
              const run = await window.electronAPI.orchRun(orchId);
              setRunningRunId(run.id);
              setRunningOrchName(orch?.name || 'Orchestration');
              setShowOrchRunner(true);
            } catch (err) {
              console.error('Failed to start orchestration:', err);
            }
          }}
        />
      )}
      {showOrchRunner && runningRunId && (
        <OrchestrationRunner
          runId={runningRunId}
          orchestrationName={runningOrchName}
          onClose={() => { setShowOrchRunner(false); setRunningRunId(null); }}
        />
      )}
      <VaultBrowser isOpen={showVault} onClose={() => setShowVault(false)} />
    </div>
  );
}

function TitleBar({ onOpenVault, onOpenOrchestrations }: { onOpenVault: () => void; onOpenOrchestrations: () => void }) {
  return (
    <div
      className="h-10 bg-[var(--bg-panel)] flex items-center justify-between px-4 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary-400 font-bold text-sm">NovaSyn Writer</span>
      </div>

      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={onOpenOrchestrations}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-surface-400 hover:text-white transition-colors"
          title="Orchestrations"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </button>
        <button
          onClick={onOpenVault}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-surface-400 hover:text-white transition-colors"
          title="NS Vault"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-surface-400 hover:text-white transition-colors"
          title="Minimize"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-surface-400 hover:text-white transition-colors"
          title="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="10" height="10" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500/80 rounded text-surface-400 hover:text-white transition-colors"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
