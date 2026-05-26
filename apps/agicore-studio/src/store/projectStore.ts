// Project-level state — which directory is open, what .agi files live
// inside it, refresh handle. Orthogonal to workflowStore (which holds
// the currently-active workflow in memory). One project, many files;
// one workflow loaded at a time.
//
// Hot-reload polling: while a project is open the store polls
// list_project_files every POLL_INTERVAL_MS. The result is
// shallow-diffed so unchanged polls don't churn React. New, deleted,
// or modified-externally files all flow into the explorer rail
// without manual refresh; the workflow toolbar uses the per-file
// mtime to surface a "modified on disk" indicator on the active file.

import { create } from 'zustand';
import type { Project, ProjectFile } from '../types/project';
import {
  basenameOfDir,
  createProjectFile,
  deleteProjectFile,
  listProjectFiles,
  pickProjectDirectory,
} from '../lib/project-persistence';
import { fetchGitStatus, type GitStatusReport } from '../lib/git-status';

const POLL_INTERVAL_MS = 2000;

interface ProjectStore {
  project: Project | null;
  files: ProjectFile[];
  loading: boolean;
  error: string | null;
  /** Latest git status snapshot for the project, or null when not a repo. */
  gitStatus: GitStatusReport | null;

  /** Open a directory as the active project. Returns the project on success. */
  openProject: (rootPath: string) => Promise<Project>;
  /** Pick a directory via dialog, then open it as a project. */
  pickAndOpen: () => Promise<Project | null>;
  /** Adopt a containing directory as the project. */
  adoptForFile: (filePath: string) => Promise<void>;
  /** Re-read the file list from disk. */
  refresh: () => Promise<void>;
  /** Create a new .agi file in the project root. Returns the new file. */
  newFile: (fileName: string) => Promise<ProjectFile>;
  /** Delete a file (and its sidecar). */
  deleteFile: (path: string) => Promise<void>;
  /** Clear the project (no project open). */
  close: () => void;
  /** Look up a file by absolute path. */
  fileByPath: (path: string) => ProjectFile | undefined;
  /** Get the git porcelain status for a file, or null/undefined when
   *  the project isn't a git repo or the file is unchanged. */
  gitStatusFor: (path: string) => string | undefined;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling(get: () => ProjectStore) {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => {
    void get().refresh();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Cheap shallow comparator — equal iff same length, same paths in
 *  order, same mtime per path. Avoids React re-renders on no-op polls. */
function filesEqual(a: ProjectFile[], b: ProjectFile[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].path !== b[i].path) return false;
    if (a[i].modifiedAt !== b[i].modifiedAt) return false;
  }
  return true;
}

function gitStatusEqual(a: GitStatusReport | null, b: GitStatusReport | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.isRepo !== b.isRepo) return false;
  if (a.branch !== b.branch) return false;
  const aKeys = Object.keys(a.statuses);
  const bKeys = Object.keys(b.statuses);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a.statuses[k] !== b.statuses[k]) return false;
  }
  return true;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  files: [],
  loading: false,
  error: null,
  gitStatus: null,

  openProject: async (rootPath) => {
    set({ loading: true, error: null, gitStatus: null });
    try {
      const files = await listProjectFiles(rootPath);
      const project: Project = { rootPath, name: basenameOfDir(rootPath) };
      set({ project, files, loading: false });
      startPolling(get);
      // Fire-and-forget initial git status fetch.
      void fetchGitStatus(rootPath)
        .then((s) => set({ gitStatus: s }))
        .catch(() => set({ gitStatus: null }));
      // Fire-and-forget — recent-projects bookkeeping shouldn't block
      // the open flow if the user-config dir is temporarily unwriteable.
      void import('../lib/recent-projects').then((m) =>
        m.pushRecentProject(rootPath).catch(() => { /* best-effort */ }),
      );
      return project;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ loading: false, error: message });
      throw e;
    }
  },

  pickAndOpen: async () => {
    const chosen = await pickProjectDirectory();
    if (!chosen) return null;
    return get().openProject(chosen);
  },

  adoptForFile: async (filePath) => {
    const sep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    const dir = sep === -1 ? '.' : filePath.slice(0, sep);
    const current = get().project;
    if (current && current.rootPath === dir) {
      await get().refresh();
      return;
    }
    await get().openProject(dir);
  },

  refresh: async () => {
    const project = get().project;
    if (!project) return;
    try {
      const files = await listProjectFiles(project.rootPath);
      // Only update state when something materially changed — keeps the
      // polling cycle from invalidating downstream selectors every 2s.
      if (!filesEqual(get().files, files)) {
        set({ files, error: null });
      } else if (get().error) {
        set({ error: null });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({ error: message });
    }
    // Refresh git status alongside the file list. Independent failure mode —
    // a missing git binary or a non-repo directory just clears the badges.
    try {
      const status = await fetchGitStatus(project.rootPath);
      const prev = get().gitStatus;
      if (!gitStatusEqual(prev, status)) {
        set({ gitStatus: status });
      }
    } catch {
      // best-effort; leave previous status in place rather than blanking
    }
  },

  newFile: async (fileName) => {
    const project = get().project;
    if (!project) throw new Error('no project open');
    const file = await createProjectFile(project.rootPath, fileName);
    await get().refresh();
    return file;
  },

  deleteFile: async (path) => {
    await deleteProjectFile(path);
    await get().refresh();
  },

  close: () => {
    stopPolling();
    set({ project: null, files: [], error: null, gitStatus: null });
  },

  fileByPath: (path) => get().files.find((f) => f.path === path),
  gitStatusFor: (path) => get().gitStatus?.statuses[path],
}));
