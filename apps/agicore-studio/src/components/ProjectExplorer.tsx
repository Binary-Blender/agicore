// Project explorer — leftmost rail. Lists the .agi files in the open
// project directory, marks the active one, surfaces a small + button
// for new files and a hover-delete on each row.
//
// Header grows a search input. When non-empty, the file list yields
// to a results panel — one row per matching line across all .agi
// files. Click a result to jump to that file. Clear the input to
// return to the file list.

import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useWorkflowStore } from '../store/workflowStore';
import { loadWorkflowByPath, saveCurrentWorkflow } from '../lib/persistence';
import { searchProjectFiles, type SearchHit } from '../lib/project-persistence';
import { colorForStatus, describeStatus } from '../lib/git-status';
import type { ProjectFile } from '../types/project';

const SEARCH_DEBOUNCE_MS = 200;

const ProjectExplorer: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const files = useProjectStore((s) => s.files);
  const refresh = useProjectStore((s) => s.refresh);
  const newFile = useProjectStore((s) => s.newFile);
  const deleteFile = useProjectStore((s) => s.deleteFile);
  const closeProject = useProjectStore((s) => s.close);
  const gitStatus = useProjectStore((s) => s.gitStatus);
  const gitStatusFor = useProjectStore((s) => s.gitStatusFor);

  const activeFilePath = useWorkflowStore((s) => s.filePath);
  const dirty = useWorkflowStore((s) => s.dirty);

  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<number | null>(null);

  // Refresh on mount so a fresh open is up-to-date even if the file
  // list changed externally between sessions.
  useEffect(() => {
    if (project) void refresh();
  }, [project, refresh]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (!query.trim() || !project) {
      setHits(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = window.setTimeout(async () => {
      try {
        const results = await searchProjectFiles(project.rootPath, query);
        setHits(results);
      } catch (e) {
        console.error('search failed:', e);
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, [query, project]);

  if (!project) return null;

  const ensureSavedThenLoad = async (path: string) => {
    if (dirty) {
      const choice = confirm(
        'You have unsaved changes. Save before switching files?\n\n' +
        'OK = Save and switch    Cancel = Stay on current file',
      );
      if (!choice) return;
      try { await saveCurrentWorkflow(); }
      catch (e) { console.error('save failed:', e); return; }
    }
    try { await loadWorkflowByPath(path); }
    catch (e) { console.error('load failed:', e); }
  };

  const onClickFile = async (file: ProjectFile) => {
    if (file.path === activeFilePath) return;
    await ensureSavedThenLoad(file.path);
  };

  const onClickHit = async (hit: SearchHit) => {
    if (hit.filePath !== activeFilePath) {
      await ensureSavedThenLoad(hit.filePath);
    }
    // Line jump is a future polish — for now landing on the file is enough.
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

  const inSearchMode = query.trim().length > 0;

  return (
    <aside className="w-56 h-full bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Project
            {gitStatus?.isRepo && gitStatus.branch && (
              <span className="ml-2 normal-case tracking-normal text-[var(--text-secondary)] font-mono" title="Current git branch">
                ⎇ {gitStatus.branch}
              </span>
            )}
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

      <div className="px-2 py-1.5 border-b border-[var(--border)]">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this project…"
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {!inSearchMode && (
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
      )}

      <div className="flex-1 overflow-y-auto">
        {inSearchMode ? (
          <SearchResults
            hits={hits}
            searching={searching}
            query={query.trim()}
            onClick={onClickHit}
          />
        ) : files.length === 0 ? (
          <p className="px-3 py-6 text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
            No .agi files yet. Click <span className="text-[var(--accent)]">+ new</span> to create one.
          </p>
        ) : (
          <ul>
            {files.map((file) => {
              const isActive = file.path === activeFilePath;
              const gitCode = gitStatusFor(file.path);
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
                    {gitCode && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorForStatus(gitCode) }}
                        title={`git: ${describeStatus(gitCode)} (${gitCode.trim()})`}
                      />
                    )}
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

const SearchResults: React.FC<{
  hits: SearchHit[] | null;
  searching: boolean;
  query: string;
  onClick: (hit: SearchHit) => void;
}> = ({ hits, searching, query, onClick }) => {
  if (searching && hits === null) {
    return <p className="px-3 py-4 text-[10px] text-[var(--text-muted)]">Searching…</p>;
  }
  if (!hits) return null;
  if (hits.length === 0) {
    return (
      <p className="px-3 py-4 text-[10px] text-[var(--text-muted)] leading-relaxed">
        No matches for <span className="text-[var(--text-primary)] font-mono">{query}</span>
      </p>
    );
  }
  return (
    <>
      <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
        {hits.length}{hits.length >= 200 ? '+' : ''} match{hits.length === 1 ? '' : 'es'}
      </p>
      <ul>
        {hits.map((hit, i) => (
          <li key={`${hit.filePath}-${hit.lineNumber}-${i}`}>
            <button
              onClick={() => onClick(hit)}
              className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-input)] border-l-2 border-l-transparent transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate" title={hit.fileName}>
                  {hit.fileName}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] font-mono">:{hit.lineNumber}</span>
              </div>
              <pre className="text-[10px] font-mono text-[var(--text-primary)] truncate mt-0.5">
                {highlightedSnippet(hit)}
              </pre>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};

function highlightedSnippet(hit: SearchHit): React.ReactNode {
  const before = hit.lineText.slice(0, hit.matchStart);
  const match = hit.lineText.slice(hit.matchStart, hit.matchEnd);
  const after = hit.lineText.slice(hit.matchEnd);
  return (
    <>
      <span className="text-[var(--text-muted)]">{before}</span>
      <span className="bg-[var(--accent)] text-black font-semibold">{match}</span>
      <span className="text-[var(--text-muted)]">{after}</span>
    </>
  );
}

export default ProjectExplorer;
