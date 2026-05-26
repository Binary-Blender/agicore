// Invoke wrappers for the project-directory Rust commands plus the
// dir-picker dialog. Companion to lib/persistence.ts (which handles
// individual .agi file I/O).

import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { ProjectFile } from '../types/project';

export const listProjectFiles = (rootPath: string) =>
  invoke<ProjectFile[]>('list_project_files', { rootPath });

export const createProjectFile = (rootPath: string, fileName: string) =>
  invoke<ProjectFile>('create_project_file', { rootPath, fileName });

export const deleteProjectFile = (path: string) =>
  invoke<void>('delete_project_file', { path });

export interface SearchHit {
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
}

export const searchProjectFiles = (rootPath: string, query: string) =>
  invoke<SearchHit[]>('search_project_files', { rootPath, query });

export async function pickProjectDirectory(): Promise<string | null> {
  const chosen = await openDialog({
    directory: true,
    multiple: false,
  });
  if (!chosen || Array.isArray(chosen)) return null;
  return chosen;
}

/** Last path segment as the display name. Cross-platform — handles
 *  both / and \ separators. */
export function basenameOfDir(p: string): string {
  const cleaned = p.replace(/[/\\]+$/, '');
  const sep = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
  return sep === -1 ? cleaned : cleaned.slice(sep + 1);
}

/** Containing directory of a file path. */
export function dirnameOf(filePath: string): string {
  const sep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return sep === -1 ? '.' : filePath.slice(0, sep);
}
