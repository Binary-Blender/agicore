import React, { useState } from 'react';
import { useForgeStore } from '../store/forgeStore';

function toPackageName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-app';
}

function toAppId(packageName: string): string {
  return `com.novasyn.${packageName.replace(/-/g, '')}`;
}

function toDbName(packageName: string): string {
  return `${packageName.replace(/-/g, '_')}.db`;
}

export function NewProjectWizard() {
  const { projects, addProject, setCurrentView } = useForgeStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [port, setPort] = useState(5177 + projects.length);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packageName = toPackageName(name);
  const displayName = name || 'My App';
  const appId = toAppId(packageName);
  const dbName = toDbName(packageName);

  async function handleSelectDir() {
    const dir = await window.electronAPI.selectProjectDir();
    if (dir) setProjectPath(dir);
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!projectPath.trim()) { setError('Project directory is required'); return; }

    // Check port not already used
    const usedPorts = projects.map((p) => p.port);
    if (usedPorts.includes(port)) {
      setError(`Port ${port} is already used by another project`);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const project = await window.electronAPI.createProject({
        name: name.trim(),
        description: description.trim(),
        path: projectPath.trim(),
        packageName,
        displayName,
        port,
        dbName,
        appId,
      });
      addProject(project);
      setCurrentView('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-xs text-gray-400 hover:text-white mb-4 transition"
        >
          &larr; Back to Dashboard
        </button>

        <h1 className="text-xl font-bold text-white mb-1">New Project</h1>
        <p className="text-sm text-gray-400 mb-6">Register a new NovaSyn app project.</p>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Cool App"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this app do?"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Path */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Project Directory *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="C:\Users\...\my-app"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
              <button
                onClick={handleSelectDir}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs transition"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Port */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Dev Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value, 10) || 5177)}
              className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Derived fields (read-only) */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-1">
            <p className="text-xs text-gray-500">
              <span className="text-gray-400">Package:</span>{' '}
              <span className="font-mono text-amber-300">{packageName}</span>
            </p>
            <p className="text-xs text-gray-500">
              <span className="text-gray-400">Display:</span>{' '}
              <span className="text-white">{displayName}</span>
            </p>
            <p className="text-xs text-gray-500">
              <span className="text-gray-400">App ID:</span>{' '}
              <span className="font-mono text-gray-300">{appId}</span>
            </p>
            <p className="text-xs text-gray-500">
              <span className="text-gray-400">Database:</span>{' '}
              <span className="font-mono text-gray-300">{dbName}</span>
            </p>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="text-xs text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="text-xs text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-4 py-2 rounded-lg transition"
            >
              {isSaving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
