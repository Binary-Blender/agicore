// Recent-projects wrapper. Reads from / writes to the shared
// %APPDATA%/Agicore/recent-projects.json file via the Rust commands.
// Capped at 8 entries server-side; non-existent directories are
// pruned on each read so old paths don't haunt the Welcome panel.

import { invoke } from '@tauri-apps/api/core';

export interface RecentProject {
  rootPath: string;
  name: string;
  lastOpenedAt: number;
}

export const readRecentProjects = () =>
  invoke<RecentProject[]>('read_recent_projects');

export const pushRecentProject = (rootPath: string) =>
  invoke<RecentProject[]>('push_recent_project', { rootPath });

export const removeRecentProject = (rootPath: string) =>
  invoke<RecentProject[]>('remove_recent_project', { rootPath });
