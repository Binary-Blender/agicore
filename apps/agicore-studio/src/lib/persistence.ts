// Workflow ↔ disk plumbing. Bridges the workflow store to the Rust
// commands that handle .agi + sidecar I/O.
//
// MVP scope: open one file at a time. Multi-file projects are Alpha.

import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { useWorkflowStore } from '../store/workflowStore';
import { emitAgi, emitLayoutSidecar } from './agi-emitter';
import { parseAgiToWorkflow } from './agi-parser';

export async function saveCurrentWorkflow(): Promise<void> {
  const state = useWorkflowStore.getState();
  let path = state.filePath;

  if (!path) {
    const chosen = await saveDialog({
      defaultPath: `${state.workflow.name}.agi`,
      filters: [{ name: 'Agicore workflow', extensions: ['agi'] }],
    });
    if (!chosen) return; // user cancelled
    path = chosen as string;
  }

  const agiText = emitAgi(state.workflow);
  const layout = emitLayoutSidecar(state.workflow);

  await invoke<void>('save_workflow_to_disk', {
    path,
    agiSource: agiText,
    layoutJson: JSON.stringify(layout, null, 2),
  });

  state.markClean(path);
}

export async function openWorkflowFromDisk(): Promise<void> {
  const chosen = await openDialog({
    multiple: false,
    filters: [{ name: 'Agicore workflow', extensions: ['agi'] }],
  });
  if (!chosen || Array.isArray(chosen)) return;

  const loaded = await invoke<{ agiSource: string; layoutJson: string | null }>(
    'load_workflow_from_disk',
    { path: chosen },
  );

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

  useWorkflowStore.getState().resetTo(wf, chosen);
}
