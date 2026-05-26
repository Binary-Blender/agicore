// Project explorer — leftmost rail. Lists the .agi files in the open
// project directory, marks the active one, surfaces a small + button
// for new files and a hover-delete on each row.
//
// When no project is open: hidden (App.tsx doesn't mount this rail).
// The Welcome panel offers the "Open project folder" action that
// brings us here.

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useWorkflowStore } from '../store/workflowStore';
import { loadWorkflowByPath, saveCurrentWorkflow } from '../lib/persistence';
import type { ProjectFile } from '../types/project';

const ProjectExplorer: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const files = useProjectStore((s) => s.files);
  const refresh = useProjectStore((s) => s.refresh);
  const newFile = useProjectStore((s) => s.newFile);
  const deleteFile = useProjectStore((s) => s.deleteFile);
  const closeProject = useProjectStore((s) => s.close);

  const activeFilePath = useWorkflowStore((s) => s.filePath);
  const dirty = useWorkflowStore((s) => s.dirty);

  const [busy, setBusy] = useState(false);

  // Refresh on mount so a fresh open is up-to-date even if the file
  // list changed externally between sessions.
  useEffect(() => {
    if (project) void refresh();
  }, [project, refresh]);

  if (!project) return null;

  const onClickFile = async (file: ProjectFile) => {
    if (file.path === activeFilePath) return;
    if (dirty) {
      const choice = confirm(
        'You have unsaved changes. Save before switching files?\n\n' +
        'OK = Save and switch    Cancel = Stay on current file',
      );
      if (!choice) return;
      try { await saveCurrentWorkflow(); }
      catch (e) { console.error('save failed:', e); return; }
    }
    try { await loadWorkflowByPath(file.path); }
    catch (e) { console.error('load failed:', e); }
  };

  const onNewFile = async () => {
    const name = prompt('Name the new workflow file:', 'new_workflow.agi');
    if (!name) return;
    setBusy(true);
    try {
      const file = await newFile(name);
      await loadWorkflowByPath(file.path);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteFile = async (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${file.name}?\n\nThe layout sidecar will be removed too. Cannot be undone from inside the Studio.`)) {
      return;
    }
    try { await deleteFile(file.path); }
    catch (e) { console.error('delete failed:', e); }
  };

  return (
    <aside className="w-56 h-full bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Project
          </p>
          <p
            className="text-xs font-semibold truncate text-[var(--text-primary)]"
            title={project.rootPath}
          >
            {project.name || project.rootPath}
          </p>
        </div>
        <button
          onClick={closeProject}
          title="Close project"
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={onNewFile}
          disabled={busy}
          title="New .agi file"
          className="text-xs px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 transition-colors"
        >
          + new
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <p className="px-3 py-6 text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
            No .agi files yet. Click <span className="text-[var(--accent)]">+ new</span> to create one.
          </p>
        ) : (
          <ul>
            {files.map((file) => {
              const isActive = file.path === activeFilePath;
              return (
                <li key={file.path}>
                  <div
                    onClick={() => onClickFile(file)}
                    className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs font-mono transition-colors ${
                      isActive
                        ? 'bg-[var(--bg-input)] text-[var(--text-primary)] border-l-2 border-l-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-input)] border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className="flex-1 truncate" title={file.name}>{file.name}</span>
                    {isActive && dirty && (
                      <span className="text-[var(--node-branch)] text-[9px]" title="Unsaved changes">●</span>
                    )}
                    <button
                      onClick={(e) => onDeleteFile(file, e)}
                      title="Delete"
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-opacity text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default ProjectExplorer;
