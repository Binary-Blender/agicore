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

const POLL_INTERVAL_MS = 2000;

interface ProjectStore {
  project: Project | null;
  files: ProjectFile[];
  loading: boolean;
  error: string | null;

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
  /** Look up a file by absolute path. Useful for the toolbar's
   *  external-modification indicator. */
  fileByPath: (path: string) => ProjectFile | undefined;
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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  files: [],
  loading: false,
  error: null,

  openProject: async (rootPath) => {
    set({ loading: true, error: null });
    try {
      const files = await listProjectFiles(rootPath);
      const project: Project = { rootPath, name: basenameOfDir(rootPath) };
      set({ project, files, loading: false });
      startPolling(get);
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
    set({ project: null, files: [], error: null });
  },

  fileByPath: (path) => get().files.find((f) => f.path === path),
}));
