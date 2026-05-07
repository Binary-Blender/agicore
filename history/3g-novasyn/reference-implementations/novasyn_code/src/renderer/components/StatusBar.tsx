import React from 'react';
import { useCodeStore } from '../store/codeStore';
import MacroIndicator from './MacroIndicator';

export default function StatusBar() {
  const {
    currentProjectId, projects, selectedModels, models, messages,
    currentSessionId, showTerminal, setShowTerminal, showSidebar, setShowSidebar,
  } = useCodeStore();

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentModel = models.find((m) => m.id === selectedModels[0]);
  const sessionMessages = messages.filter((m) => m.sessionId === currentSessionId);
  const totalTokens = sessionMessages.reduce((sum, m) => sum + m.totalTokens, 0);

  return (
    <div className="h-6 flex items-center justify-between bg-slate-900 border-t border-slate-700 px-3 text-[10px] text-slate-500 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="hover:text-slate-300 transition-colors"
          title="Toggle sidebar"
        >
          ☰
        </button>
        {currentProject && (
          <span className="text-slate-400">{currentProject.name}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>{currentModel?.name || selectedModels[0] || 'No model'}</span>
        <span>{totalTokens.toLocaleString()} tokens</span>
        <MacroIndicator />
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className={`hover:text-slate-300 transition-colors ${showTerminal ? 'text-blue-400' : ''}`}
          title="Toggle terminal"
        >
          &gt;_
        </button>
      </div>
    </div>
  );
}
