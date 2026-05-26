// Project-level state — which directory is open, what .agi files live
// inside it, refresh handle. Orthogonal to workflowStore (which holds
// the currently-active workflow in memory). One project, many files;
// one workflow loaded at a time.

import { create } from 'zustand';
import type { Project, ProjectFile } from '../types/project';
import {
  basenameOfDir,
  createProjectFile,
  deleteProjectFile,
  listProjectFiles,
  pickProjectDirectory,
} from '../lib/project-persistence';

interface ProjectStore {
  project: Project | null;
  files: ProjectFile[];
  loading: boolean;
  error: string | null;

  /** Open a directory as the active project. Returns the project on success. */
  openProject: (rootPath: string) => Promise<Project>;
  /** Pick a directory via dialog, then open it as a project. */
  pickAndOpen: () => Promise<Project | null>;
  /** Adopt a containing directory as the project (called when a single .agi
   *  is opened from a directory that wasn't already loaded as a project). */
  adoptForFile: (filePath: string) => Promise<void>;
  /** Re-read the file list from disk. */
  refresh: () => Promise<void>;
  /** Create a new .agi file in the project root. Returns the new file. */
  newFile: (fileName: string) => Promise<ProjectFile>;
  /** Delete a file (and its sidecar). */
  deleteFile: (path: string) => Promise<void>;
  /** Clear the project (no project open). */
  close: () => void;
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
    // If a different project is open and the file isn't inside it, switch.
    const current = get().project;
    if (current && current.rootPath === dir) {
      // Same project — just refresh.
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
      set({ files, error: null });
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

  close: () => set({ project: null, files: [], error: null }),
}));
