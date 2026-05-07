import React, { useEffect, useState } from 'react';
import { useTeamsStore } from './store/teamsStore';
import { TitleBar } from './components/TitleBar';
import { TeamSidebar } from './components/TeamSidebar';
import { ChannelView } from './components/ChannelView';
import { ThreadPanel } from './components/ThreadPanel';
import { MemberList } from './components/MemberList';
import { OnboardingScreen } from './components/OnboardingScreen';
import { VaultBrowser } from './components/VaultBrowser';
import { OrchestrationBuilder } from './components/OrchestrationBuilder';
import { OrchestrationRunner } from './components/OrchestrationRunner';
import { SettingsPanel } from './components/SettingsPanel';

interface VaultItem {
  id: string;
  itemType: string;
  sourceApp: string;
  title: string;
  content: string | null;
  [key: string]: any;
}

interface Orchestration {
  id: string;
  name: string;
  description: string;
  steps: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  const loadInitialData = useTeamsStore((s) => s.loadInitialData);
  const teams = useTeamsStore((s) => s.teams);
  const currentTeamId = useTeamsStore((s) => s.currentTeamId);
  const isLoading = useTeamsStore((s) => s.isLoading);
  const showThreadPanel = useTeamsStore((s) => s.showThreadPanel);
  const showMemberList = useTeamsStore((s) => s.showMemberList);
  const showVaultBrowser = useTeamsStore((s) => s.showVaultBrowser);
  const showOrchestrationBuilder = useTeamsStore((s) => s.showOrchestrationBuilder);
  const showOrchestrationRunner = useTeamsStore((s) => s.showOrchestrationRunner);
  const showSettings = useTeamsStore((s) => s.showSettings);
  const activeRunId = useTeamsStore((s) => s.activeRunId);
  const activeOrchName = useTeamsStore((s) => s.activeOrchName);
  const sendMessage = useTeamsStore((s) => s.sendMessage);

  const setShowVaultBrowser = useTeamsStore((s) => s.setShowVaultBrowser);
  const setShowOrchestrationBuilder = useTeamsStore((s) => s.setShowOrchestrationBuilder);
  const setShowOrchestrationRunner = useTeamsStore((s) => s.setShowOrchestrationRunner);
  const setShowSettings = useTeamsStore((s) => s.setShowSettings);

  // Orchestration state for builder
  const [editingOrchestration, setEditingOrchestration] = useState<Orchestration | undefined>(undefined);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Show loading spinner while initial data loads
  if (isLoading && teams.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-slate-900">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <span className="text-sm text-gray-400">Loading NovaSyn Teams...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding if no team exists
  const hasTeam = teams.length > 0 && currentTeamId;

  if (!hasTeam) {
    return (
      <div className="h-screen flex flex-col bg-slate-900">
        <TitleBar />
        <OnboardingScreen />

        {/* Settings modal available even during onboarding */}
        {showSettings && <SettingsPanel />}
      </div>
    );
  }

  // Handle vault import (share a vault item as a message)
  const handleVaultImport = (item: VaultItem) => {
    if (item) {
      sendMessage(item.title || item.content?.slice(0, 100) || 'Vault item', 'vault_share', item.id);
    }
  };

  // Handle orchestration saved
  const handleOrchSaved = (orch: Orchestration) => {
    setEditingOrchestration(orch);
  };

  // Handle orchestration run
  const handleOrchRun = async (orchId: string) => {
    try {
      const run = await window.electronAPI.orchRun(orchId);
      setShowOrchestrationBuilder(false);
      setShowOrchestrationRunner(true, run.id, editingOrchestration?.name || 'Orchestration');
    } catch (err) {
      console.error('Failed to start orchestration run:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Title bar */}
      <TitleBar />

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Team sidebar (260px) */}
        <TeamSidebar />

        {/* Center: Channel view (flex-1) */}
        <ChannelView />

        {/* Right: Thread panel or Member list (300px, togglable) */}
        {showThreadPanel && <ThreadPanel />}
        {showMemberList && !showThreadPanel && <MemberList />}
      </div>

      {/* ===== Modal overlays ===== */}

      {/* Vault Browser */}
      <VaultBrowser
        isOpen={showVaultBrowser}
        onClose={() => setShowVaultBrowser(false)}
        onImport={handleVaultImport}
      />

      {/* Orchestration Builder */}
      {showOrchestrationBuilder && (
        <OrchestrationBuilder
          orchestration={editingOrchestration}
          onClose={() => {
            setShowOrchestrationBuilder(false);
            setEditingOrchestration(undefined);
          }}
          onSaved={handleOrchSaved}
          onRun={handleOrchRun}
        />
      )}

      {/* Orchestration Runner */}
      {showOrchestrationRunner && activeRunId && (
        <OrchestrationRunner
          runId={activeRunId}
          orchestrationName={activeOrchName}
          onClose={() => setShowOrchestrationRunner(false)}
        />
      )}

      {/* Settings Panel */}
      {showSettings && <SettingsPanel />}
    </div>
  );
}
