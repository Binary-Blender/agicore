import React, { useState } from 'react';
import { useCodeStore } from '../store/codeStore';
import FileTree from './FileTree';

export default function Sidebar() {
  const {
    projects, sessions, currentProjectId, currentSessionId,
    setCurrentProjectId, setCurrentSessionId, showSidebar, sidebarWidth,
  } = useCodeStore();
  const [activeTab, setActiveTab] = useState<'files' | 'sessions'>('files');

  if (!showSidebar) return null;

  const projectSessions = sessions.filter((s) =>
    currentProjectId ? s.projectId === currentProjectId : true
  );

  return (
    <div
      className="flex flex-col bg-slate-900 border-r border-slate-700 overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Tab switcher */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-1.5 text-xs font-medium ${
            activeTab === 'files' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-1.5 text-xs font-medium ${
            activeTab === 'sessions' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Sessions
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="flex-1 overflow-y-auto">
          {/* Project selector */}
          <div className="p-2 border-b border-slate-800">
            <select
              value={currentProjectId || ''}
              onChange={(e) => setCurrentProjectId(e.target.value || null)}
              className="w-full bg-slate-800 text-slate-300 text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <FileTree />
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={async () => {
              const session = await window.electronAPI.createSession('New Chat', currentProjectId || undefined);
              useCodeStore.getState().addSession(session);
              useCodeStore.getState().setCurrentSessionId(session.id);
            }}
            className="w-full text-left px-2 py-1.5 text-xs text-blue-400 hover:bg-slate-800 rounded flex items-center gap-1"
          >
            <span>+</span> New Session
          </button>
          {projectSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              className={`w-full text-left px-2 py-1.5 text-xs rounded truncate ${
                currentSessionId === s.id
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {s.name}
            </button>
          ))}
          {projectSessions.length === 0 && (
            <p className="text-xs text-slate-600 px-2 py-4 text-center">No sessions yet</p>
          )}
        </div>
      )}
    </div>
  );
}
