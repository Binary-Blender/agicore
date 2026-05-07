import React, { useEffect, useState } from 'react';
import { useCouncilStore } from './store/councilStore';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PersonaDetail from './components/PersonaDetail';
import MeetingRoom from './components/MeetingRoom';
import PersonaBuilder from './components/PersonaBuilder';
import SettingsPanel from './components/SettingsPanel';
import SkillDocEditor from './components/SkillDocEditor';
import MemoryEditor from './components/MemoryEditor';
import MemoryReviewPanel from './components/MemoryReviewPanel';
import MeetingCreator from './components/MeetingCreator';
import RelationshipPanel from './components/RelationshipPanel';
import SearchPanel from './components/SearchPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import { VaultBrowser } from './components/VaultBrowser';
import { OrchestrationBuilder } from './components/OrchestrationBuilder';
import { OrchestrationRunner } from './components/OrchestrationRunner';
import type { Orchestration } from '../shared/types';

export default function App() {
  const {
    currentView,
    showPersonaBuilder,
    showSettings,
    showSkillDocEditor,
    showMemoryEditor,
    showMemoryReview,
    showMeetingCreator,
    showRelationshipPanel,
    showSearchPanel,
    showAnalytics,
    settings,
    loadSettings,
    loadApiKeys,
    loadModels,
    loadPersonas,
    setShowSearchPanel,
  } = useCouncilStore();

  const [showVault, setShowVault] = useState(false);
  const [showOrchBuilder, setShowOrchBuilder] = useState(false);
  const [editingOrch, setEditingOrch] = useState<Orchestration | undefined>(undefined);
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([]);
  const [runningOrchId, setRunningOrchId] = useState<string | null>(null);
  const [runningOrchName, setRunningOrchName] = useState('');

  // Load initial data
  useEffect(() => {
    loadSettings();
    loadApiKeys();
    loadModels();
    loadPersonas();
    window.electronAPI.orchList().then(setOrchestrations).catch(console.error);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  // Global Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchPanel(!useCouncilStore.getState().showSearchPanel);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)]">
      <TitleBar onOpenVault={() => setShowVault(true)} onOpenOrchestrations={() => setShowOrchBuilder(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content */}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'persona' && <PersonaDetail />}
        {currentView === 'meeting' && <MeetingRoom />}
      </div>

      {/* Modals */}
      {showPersonaBuilder && <PersonaBuilder />}
      {showSkillDocEditor && <SkillDocEditor />}
      {showMemoryEditor && <MemoryEditor />}
      {showMemoryReview && <MemoryReviewPanel />}
      {showMeetingCreator && <MeetingCreator />}
      {showRelationshipPanel && <RelationshipPanel />}
      {showSearchPanel && <SearchPanel />}
      {showAnalytics && <AnalyticsPanel />}
      {showSettings && <SettingsPanel />}
      <VaultBrowser isOpen={showVault} onClose={() => setShowVault(false)} />
      {showOrchBuilder && (
        <OrchestrationBuilder
          orchestration={editingOrch}
          onClose={() => { setShowOrchBuilder(false); setEditingOrch(undefined); }}
          onSaved={(orch) => {
            setOrchestrations((prev) => {
              const idx = prev.findIndex((o) => o.id === orch.id);
              if (idx >= 0) { const updated = [...prev]; updated[idx] = orch; return updated; }
              return [orch, ...prev];
            });
          }}
          onRun={async (orchId) => {
            setShowOrchBuilder(false);
            setEditingOrch(undefined);
            const orch = orchestrations.find((o) => o.id === orchId);
            const run = await window.electronAPI.orchRun(orchId);
            setRunningOrchId(run.id);
            setRunningOrchName(orch?.name || 'Orchestration');
          }}
        />
      )}
      {runningOrchId && (
        <OrchestrationRunner
          runId={runningOrchId}
          orchestrationName={runningOrchName}
          onClose={() => setRunningOrchId(null)}
        />
      )}
    </div>
  );
}
