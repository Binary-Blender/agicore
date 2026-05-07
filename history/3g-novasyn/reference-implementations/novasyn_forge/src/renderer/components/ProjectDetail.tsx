import React, { useEffect, useState } from 'react';
import { useForgeStore } from '../store/forgeStore';
import { ChatPanel } from './ChatPanel';
import { DecisionLog } from './DecisionLog';
import { FeaturePipeline } from './FeaturePipeline';

type ProjectTab = 'chat' | 'decisions' | 'features';

export function ProjectDetail() {
  const {
    projects,
    currentProjectId,
    setCurrentView,
    setConversations,
    setDecisions,
    setFeatures,
    setCurrentConversationId,
    updateProject,
  } = useForgeStore();
  const [activeTab, setActiveTab] = useState<ProjectTab>('chat');
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldResult, setScaffoldResult] = useState<{ success: boolean; filesCreated: number; error?: string } | null>(null);
  const [showScaffoldConfirm, setShowScaffoldConfirm] = useState(false);

  const project = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    if (!currentProjectId) return;
    loadProjectData();
    return () => {
      setCurrentConversationId(null);
    };
  }, [currentProjectId]);

  async function loadProjectData() {
    const [convos, decs, feats] = await Promise.all([
      window.electronAPI.getConversations(currentProjectId!),
      window.electronAPI.getDecisions(currentProjectId!),
      window.electronAPI.getFeatures(currentProjectId!),
    ]);
    setConversations(convos);
    setDecisions(decs);
    setFeatures(feats);
  }

  async function handleScaffold() {
    setIsScaffolding(true);
    setScaffoldResult(null);
    try {
      const result = await window.electronAPI.scaffoldProject(project!.id);
      setScaffoldResult(result);
      if (result.success) {
        updateProject(project!.id, { status: 'scaffolded' });
      }
    } catch (err) {
      setScaffoldResult({ success: false, filesCreated: 0, error: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setIsScaffolding(false);
      setShowScaffoldConfirm(false);
    }
  }

  function handleBack() {
    setCurrentView('dashboard');
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Project not found
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-xs text-gray-400 hover:text-white transition"
            >
              &larr; Back to Dashboard
            </button>
          </div>
          <button
            onClick={() => window.electronAPI.openProjectDir(project.path)}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition"
          >
            Open Folder
          </button>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">{project.displayName}</h1>
          <span className="text-xs text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            :{project.port}
          </span>
        </div>
      </div>

      {/* Scaffold Section */}
      <div className="flex-shrink-0 border-b border-slate-700 px-6 py-3">
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Scaffold</span>
              {project.status === 'scaffolded' ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Scaffolded
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500 bg-slate-700/50 px-2 py-0.5 rounded">
                  Not Scaffolded
                </span>
              )}
              {scaffoldResult && scaffoldResult.success && (
                <span className="text-xs text-green-400 animate-pulse">
                  {scaffoldResult.filesCreated} files created
                </span>
              )}
              {scaffoldResult && !scaffoldResult.success && scaffoldResult.error && (
                <span className="text-xs text-red-400">
                  {scaffoldResult.error}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {project.status === 'scaffolded' ? (
                <>
                  <button
                    onClick={() => window.electronAPI.openProjectDir(project.path)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-1.5 rounded transition"
                  >
                    Open Folder
                  </button>
                  {!showScaffoldConfirm && (
                    <button
                      onClick={() => setShowScaffoldConfirm(true)}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded transition"
                    >
                      Re-scaffold
                    </button>
                  )}
                </>
              ) : (
                !showScaffoldConfirm && (
                  <button
                    onClick={() => setShowScaffoldConfirm(true)}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-1.5 rounded transition"
                  >
                    Scaffold Project
                  </button>
                )
              )}
            </div>
          </div>

          {showScaffoldConfirm && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-gray-300 mb-2">
                {project.status === 'scaffolded'
                  ? 'This will overwrite existing scaffold files. Continue?'
                  : `This will create 22 files in ${project.path}. Continue?`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleScaffold}
                  disabled={isScaffolding}
                  className="text-xs bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white font-medium px-4 py-1.5 rounded transition flex items-center gap-2"
                >
                  {isScaffolding && (
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  )}
                  {isScaffolding ? 'Scaffolding...' : 'Scaffold'}
                </button>
                <button
                  onClick={() => { setShowScaffoldConfirm(false); setScaffoldResult(null); }}
                  disabled={isScaffolding}
                  className="text-xs text-gray-400 hover:text-white disabled:cursor-not-allowed px-3 py-1.5 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-slate-700 px-6 pt-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('chat')}
            className={`text-sm pb-1.5 border-b-2 transition ${
              activeTab === 'chat'
                ? 'text-amber-400 border-amber-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`text-sm pb-1.5 border-b-2 transition ${
              activeTab === 'features'
                ? 'text-amber-400 border-amber-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            Features
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`text-sm pb-1.5 border-b-2 transition ${
              activeTab === 'decisions'
                ? 'text-amber-400 border-amber-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            Decisions
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'features' && <FeaturePipeline />}
        {activeTab === 'decisions' && <DecisionLog />}
      </div>
    </div>
  );
}
