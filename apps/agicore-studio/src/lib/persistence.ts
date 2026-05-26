// Workflow ↔ disk plumbing. Bridges the workflow store to the Rust
// commands that handle .agi + sidecar I/O. Coordinates with the
// project store so that opening any file adopts its containing
// directory as the project (multi-file aware as of Alpha sprint 4).

import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { useWorkflowStore } from '../store/workflowStore';
import { useProjectStore } from '../store/projectStore';
import { emitAgi, emitLayoutSidecar } from './agi-emitter';
import { parseAgiToWorkflow } from './agi-parser';

export async function saveCurrentWorkflow(): Promise<void> {
  const state = useWorkflowStore.getState();
  let path = state.filePath;

  if (!path) {
    // If a project is open, default the new file inside it.
    const project = useProjectStore.getState().project;
    const defaultPath = project
      ? `${project.rootPath}/${state.workflow.name}.agi`
      : `${state.workflow.name}.agi`;
    const chosen = await saveDialog({
      defaultPath,
      filters: [{ name: 'Agicore workflow', extensions: ['agi'] }],
    });
    if (!chosen) return; // user cancelled
    path = chosen as string;
  }

  const agiText = emitAgi(state.workflow);
  const layout = emitLayoutSidecar(state.workflow);

  const newMtime = await invoke<number>('save_workflow_to_disk', {
    path,
    agiSource: agiText,
    layoutJson: JSON.stringify(layout, null, 2),
  });

  state.markClean(path);
  useWorkflowStore.getState().setLoadedMtime(newMtime);

  // Save may have created a new file — refresh the explorer so it shows up.
  const project = useProjectStore.getState().project;
  if (project) {
    void useProjectStore.getState().refresh();
  } else {
    // No project yet — adopt the saved file's parent dir.
    void useProjectStore.getState().adoptForFile(path);
  }
}

export async function openWorkflowFromDisk(): Promise<void> {
  const chosen = await openDialog({
    multiple: false,
    filters: [{ name: 'Agicore workflow', extensions: ['agi'] }],
  });
  if (!chosen || Array.isArray(chosen)) return;
  await loadWorkflowByPath(chosen);
}

/** Load a specific file by path. Used by both the file dialog and the
 *  project explorer (click a file in the rail). */
export async function loadWorkflowByPath(path: string): Promise<void> {
  const loaded = await invoke<{
    agiSource: string;
    layoutJson: string | null;
    modifiedAt: number;
  }>('load_workflow_from_disk', { path });

  const wf = parseAgiToWorkflow(loaded.agiSource);
  if (loaded.layoutJson) {
    try {
      const layout = JSON.parse(loaded.layoutJson);
      const positions = layout.positions ?? {};
      for (const node of wf.nodes) {
        const p = positions[node.id];
        if (p) node.position = p;
      }
    } catch {
      // Bad sidecar — keep emitter-default positions
    }
  }

  useWorkflowStore.getState().resetTo(wf, path);
  useWorkflowStore.getState().setLoadedMtime(loaded.modifiedAt);
  // Adopt the file's directory as the project — single-file opens now
  // implicitly create a one-file project, which is the right mental
  // model now that the explorer rail expects one.
  void useProjectStore.getState().adoptForFile(path);
}

/** Reload the currently-active file from disk, discarding any in-memory
 *  edits. Wired to the toolbar's external-modification indicator. */
export async function reloadActiveWorkflow(): Promise<void> {
  const path = useWorkflowStore.getState().filePath;
  if (!path) return;
  await loadWorkflowByPath(path);
}
