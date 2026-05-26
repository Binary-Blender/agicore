// Crash recovery — autosave + on-launch detection.
//
// Strategy: every AUTOSAVE_INTERVAL_MS, if the workflow is dirty, we
// write a recovery draft to disk. A clean save (or successful load)
// drops the matching draft. On app startup, any orphan drafts are
// surfaced to the user as recoverable.
//
// The recovery id is derived from the file path when one exists, so
// repeated autosaves overwrite a single file per workflow rather than
// accumulating. For unsaved workflows we use a stable per-session uuid.

import { invoke } from '@tauri-apps/api/core';
import { useWorkflowStore } from '../store/workflowStore';
import { emitAgi, emitLayoutSidecar } from './agi-emitter';

const AUTOSAVE_INTERVAL_MS = 30_000;

export interface RecoveryDraft {
  id: string;
  sourcePath: string | null;
  agiSource: string;
  layoutJson: string;
  savedAt: number;
}

let autosaveTimer: ReturnType<typeof setInterval> | null = null;
let sessionRecoveryId: string | null = null;

function ensureSessionId(): string {
  if (sessionRecoveryId) return sessionRecoveryId;
  sessionRecoveryId = `unsaved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return sessionRecoveryId;
}

function recoveryIdFor(filePath: string | null): string {
  if (!filePath) return ensureSessionId();
  // Deterministic per-path id so repeat autosaves overwrite the same file.
  return `path-${btoa(filePath).replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

async function writeRecoveryNow(): Promise<void> {
  const state = useWorkflowStore.getState();
  if (!state.dirty) return;
  if (state.workflow.nodes.length === 0) return; // nothing worth saving

  const draft: RecoveryDraft = {
    id:         recoveryIdFor(state.filePath),
    sourcePath: state.filePath,
    agiSource:  emitAgi(state.workflow),
    layoutJson: JSON.stringify(emitLayoutSidecar(state.workflow)),
    savedAt:    Math.floor(Date.now() / 1000),
  };
  try {
    await invoke<void>('write_recovery', { draft });
  } catch (e) {
    // Best-effort — recovery should never break the app.
    console.warn('recovery write failed:', e);
  }
}

export function startAutosave(): void {
  if (autosaveTimer !== null) return;
  autosaveTimer = setInterval(() => {
    void writeRecoveryNow();
  }, AUTOSAVE_INTERVAL_MS);
}

export function stopAutosave(): void {
  if (autosaveTimer !== null) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
}

/** Called after a clean save / load so the matching recovery file dies
 *  with its origin (rather than haunting the next startup). */
export async function dropRecoveryFor(filePath: string | null): Promise<void> {
  const id = recoveryIdFor(filePath);
  try { await invoke<void>('drop_recovery', { id }); }
  catch { /* best-effort */ }
}

export async function listRecoveryDrafts(): Promise<RecoveryDraft[]> {
  try { return await invoke<RecoveryDraft[]>('list_recovery'); }
  catch { return []; }
}

export async function dropRecoveryById(id: string): Promise<void> {
  try { await invoke<void>('drop_recovery', { id }); }
  catch { /* best-effort */ }
}
