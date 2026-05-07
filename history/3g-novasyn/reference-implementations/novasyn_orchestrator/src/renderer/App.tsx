import React, { useEffect, useState } from 'react';
import { useOrchestratorStore } from './store/orchestratorStore';
import TitleBar from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { WorkflowRunner } from './components/WorkflowRunner';
import { VaultBrowser } from './components/VaultBrowser';
import type { Workflow } from '../shared/types';

// ---------- Settings Panel ----------

const API_KEY_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'google', label: 'Google' },
  { key: 'xai', label: 'xAI' },
];

function SettingsPanel({ onBack }: { onBack: () => void }) {
  const apiKeys = useOrchestratorStore((s) => s.apiKeys);
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  const handleSave = async () => {
    for (const provider of API_KEY_PROVIDERS) {
      const newVal = localKeys[provider.key];
      if (newVal !== undefined && newVal !== apiKeys[provider.key]) {
        await window.electronAPI.setApiKey(provider.key, newVal);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* API Keys */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white mb-3">API Keys</h2>
          <p className="text-xs text-gray-400 mb-4">
            Shared across all NovaSyn apps via the NS Core key store.
          </p>
          <div className="space-y-3">
            {API_KEY_PROVIDERS.map((provider) => (
              <div key={provider.key}>
                <label className="block text-xs text-gray-400 mb-1">
                  {provider.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showKeys[provider.key] ? 'text' : 'password'}
                    value={
                      showKeys[provider.key]
                        ? localKeys[provider.key] || ''
                        : localKeys[provider.key]
                          ? maskKey(localKeys[provider.key])
                          : ''
                    }
                    onChange={(e) =>
                      setLocalKeys((prev) => ({ ...prev, [provider.key]: e.target.value }))
                    }
                    onFocus={() => setShowKeys((prev) => ({ ...prev, [provider.key]: true }))}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    placeholder={`${provider.label} API key`}
                  />
                  <button
                    onClick={() =>
                      setShowKeys((prev) => ({
                        ...prev,
                        [provider.key]: !prev[provider.key],
                      }))
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
                    title={showKeys[provider.key] ? 'Hide' : 'Show'}
                  >
                    {showKeys[provider.key] ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-sm text-green-400">Settings saved</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Welcome Screen ----------

function WelcomeScreen({ onNewWorkflow }: { onNewWorkflow: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-800">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-purple-500/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          NovaSyn Orchestrator
        </h2>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Build multi-step AI workflows that span across NovaSyn apps.
          Each level runs in parallel, and levels execute sequentially --
          like a production pipeline for AI tasks.
        </p>
        <div className="space-y-3">
          <button
            onClick={onNewWorkflow}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Workflow
          </button>
          <p className="text-xs text-gray-500">
            Or select a workflow from the sidebar to edit it
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- App Root ----------

const App: React.FC = () => {
  const workflows = useOrchestratorStore((s) => s.workflows);
  const currentWorkflowId = useOrchestratorStore((s) => s.currentWorkflowId);
  const selectWorkflow = useOrchestratorStore((s) => s.selectWorkflow);
  const loadInitialData = useOrchestratorStore((s) => s.loadInitialData);
  const isLoading = useOrchestratorStore((s) => s.isLoading);

  const [showVault, setShowVault] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [runningRunId, setRunningRunId] = useState<string | null>(null);
  const [runningWorkflowName, setRunningWorkflowName] = useState('');

  // Load initial data
  useEffect(() => {
    loadInitialData();

    // Listen for tray "New Workflow" action
    const unsub = window.electronAPI.onTrayNewWorkflow(() => {
      handleNewWorkflow();
    });
    return unsub;
  }, []);

  // Get current workflow for builder
  const currentWorkflow = currentWorkflowId
    ? workflows.find((w) => w.id === currentWorkflowId) ?? null
    : null;

  function handleNewWorkflow() {
    setShowSettings(false);
    selectWorkflow(null);
    // Force a new empty builder by using a sentinel value
    selectWorkflow('__new__');
  }

  function handleSelectWorkflow(_id: string) {
    setShowSettings(false);
  }

  async function handleRunWorkflow(workflowId: string) {
    try {
      const wf = workflows.find((w) => w.id === workflowId);
      const run = await window.electronAPI.workflowRun(workflowId);
      setRunningRunId(run.id);
      setRunningWorkflowName(wf?.name || 'Workflow');
    } catch (err) {
      console.error('Failed to run workflow:', err);
    }
  }

  function handleWorkflowSaved(saved: Workflow) {
    // If this was a "new" workflow, select the real ID
    if (currentWorkflowId === '__new__') {
      selectWorkflow(saved.id);
    }
  }

  async function handleBuilderRun(wfId: string) {
    const wf = workflows.find((w) => w.id === wfId);
    const run = await window.electronAPI.workflowRun(wfId);
    setRunningRunId(run.id);
    setRunningWorkflowName(wf?.name || 'Workflow');
  }

  // Determine main content
  const renderMainContent = () => {
    if (showSettings) {
      return <SettingsPanel onBack={() => setShowSettings(false)} />;
    }

    if (currentWorkflowId === '__new__') {
      return (
        <WorkflowBuilder
          onClose={() => selectWorkflow(null)}
          onSaved={handleWorkflowSaved}
          onRun={handleBuilderRun}
        />
      );
    }

    if (currentWorkflow) {
      return (
        <WorkflowBuilder
          key={currentWorkflow.id}
          workflow={currentWorkflow}
          onClose={() => selectWorkflow(null)}
          onSaved={handleWorkflowSaved}
          onRun={handleBuilderRun}
        />
      );
    }

    return <WelcomeScreen onNewWorkflow={handleNewWorkflow} />;
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
      <TitleBar onOpenVault={() => setShowVault(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onNewWorkflow={handleNewWorkflow}
          onSelectWorkflow={handleSelectWorkflow}
          onRunWorkflow={handleRunWorkflow}
          onSettings={() => {
            setShowSettings(true);
            selectWorkflow(null);
          }}
        />
        {renderMainContent()}
      </div>

      {/* Vault Browser modal */}
      <VaultBrowser isOpen={showVault} onClose={() => setShowVault(false)} />

      {/* Workflow Runner modal */}
      {runningRunId && (
        <WorkflowRunner
          runId={runningRunId}
          workflowName={runningWorkflowName}
          onClose={() => setRunningRunId(null)}
        />
      )}
    </div>
  );
};

export default App;
