// Git-status wrapper. Calls into the Rust git_status_for_project
// command which shells out to git in the project root.

import { invoke } from '@tauri-apps/api/core';

export interface GitStatusReport {
  isRepo: boolean;
  /** Absolute path → two-char porcelain status code. */
  statuses: Record<string, string>;
  branch: string | null;
}

export const fetchGitStatus = (rootPath: string) =>
  invoke<GitStatusReport>('git_status_for_project', { rootPath });

/** Human-readable label for a porcelain status code. */
export function describeStatus(code: string): string {
  const c = code.trim();
  switch (c) {
    case 'M':
    case 'MM':
    case ' M':  return 'modified';
    case 'A':
    case 'AM':  return 'added';
    case 'D':
    case ' D':  return 'deleted';
    case 'R':
    case 'RM':  return 'renamed';
    case 'C':   return 'copied';
    case 'U':
    case 'UU':  return 'conflicted';
    case '??':  return 'untracked';
    case '!!':  return 'ignored';
    default:    return c;
  }
}

/** Color for the badge dot. */
export function colorForStatus(code: string): string {
  const c = code.trim();
  if (c === '??') return '#52525b';                   // untracked — muted
  if (c.startsWith('D') || c === ' D') return '#ef4444'; // deleted — red
  if (c.startsWith('A')) return '#10b981';            // added — green
  if (c.startsWith('U')) return '#f97316';            // conflicted — orange
  return '#fbbf24';                                   // modified default — amber
}
