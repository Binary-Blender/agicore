import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

export default function OnboardingScreen() {
  const { createProject } = useWriterStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await createProject(name.trim(), description.trim() || undefined);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-[440px] text-center">
        {/* Logo / Title */}
        <h1 className="text-3xl font-bold text-primary-400 mb-2">NovaSyn Writer</h1>
        <p className="text-surface-400 text-sm mb-8">
          AI-powered writing for storytellers, novelists, and creative minds.
        </p>

        {/* Create project form */}
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] p-6 text-left">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Create Your First Project</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-surface-500 block mb-1">Project Name</label>
              <input
                autoFocus
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                placeholder="My Novel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>

            <div>
              <label className="text-xs text-surface-500 block mb-1">Description (optional)</label>
              <textarea
                className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-3 py-2 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-16"
                placeholder="A brief description of your project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm rounded transition-colors font-medium"
            >
              {creating ? 'Creating...' : 'Start Writing'}
            </button>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-primary-400 text-lg mb-1">Rich Editor</div>
            <p className="text-xs text-surface-500">Full formatting with TipTap</p>
          </div>
          <div>
            <div className="text-primary-400 text-lg mb-1">AI Assistant</div>
            <p className="text-xs text-surface-500">Continue, expand, rewrite</p>
          </div>
          <div>
            <div className="text-primary-400 text-lg mb-1">Encyclopedia</div>
            <p className="text-xs text-surface-500">Track characters & lore</p>
          </div>
        </div>
      </div>
    </div>
  );
}
