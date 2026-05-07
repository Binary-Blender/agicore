// Orchestration Engine — executes orchestration steps top-to-bottom
// Supports: AI actions, QC checkpoints (pause/resume), transforms, vault operations
// NOTE: AI action step is stubbed — wire Social's own AI service later.

import { v4 as uuidv4 } from 'uuid';
import { BrowserWindow } from 'electron';
import { getDb } from '../database/db';
import { vaultStore, vaultGet } from './vaultService';
import type {
  Orchestration,
  OrchestrationStep,
  OrchestrationRun,
  StepResult,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

function getDatabase() {
  return getDb();
}

function mapOrchestration(row: any): Orchestration {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    steps: JSON.parse(row.steps || '[]'),
    isTemplate: !!row.is_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: any): OrchestrationRun {
  return {
    id: row.id,
    orchestrationId: row.orchestration_id,
    status: row.status,
    currentStepIndex: row.current_step_index,
    stepResults: JSON.parse(row.step_results || '[]'),
    error: row.error || undefined,
    startedAt: row.started_at,
    pausedAt: row.paused_at || undefined,
    completedAt: row.completed_at || undefined,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function listOrchestrations(): Orchestration[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM orchestrations ORDER BY updated_at DESC').all();
  return rows.map(mapOrchestration);
}

export function getOrchestration(id: string): Orchestration | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM orchestrations WHERE id = ?').get(id);
  return row ? mapOrchestration(row) : null;
}

export function createOrchestration(data: { name: string; description?: string; steps: OrchestrationStep[] }): Orchestration {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO orchestrations (id, name, description, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.name, data.description || '', JSON.stringify(data.steps), now, now);
  return getOrchestration(id)!;
}

export function updateOrchestration(id: string, updates: Partial<Orchestration>): Orchestration {
  const db = getDatabase();
  const now = new Date().toISOString();
  const current = getOrchestration(id);
  if (!current) throw new Error(`Orchestration ${id} not found`);

  const name = updates.name ?? current.name;
  const description = updates.description ?? current.description;
  const steps = updates.steps ?? current.steps;
  const isTemplate = updates.isTemplate ?? current.isTemplate;

  db.prepare(
    'UPDATE orchestrations SET name=?, description=?, steps=?, is_template=?, updated_at=? WHERE id=?'
  ).run(name, description, JSON.stringify(steps), isTemplate ? 1 : 0, now, id);

  return getOrchestration(id)!;
}

export function deleteOrchestration(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM orchestrations WHERE id = ?').run(id);
}

export function listRuns(orchestrationId: string): OrchestrationRun[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM orchestration_runs WHERE orchestration_id = ? ORDER BY started_at DESC'
  ).all(orchestrationId);
  return rows.map(mapRun);
}

export function getRun(runId: string): OrchestrationRun | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM orchestration_runs WHERE id = ?').get(runId);
  return row ? mapRun(row) : null;
}

// ---------------------------------------------------------------------------
// Execution engine
// ---------------------------------------------------------------------------

function emitProgress(runId: string, stepIndex: number, status: string, output?: any) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send('orch-step-progress', { runId, stepIndex, status, output });
  }
}

function saveRunState(run: OrchestrationRun): void {
  const db = getDatabase();
  db.prepare(
    `UPDATE orchestration_runs SET status=?, current_step_index=?, step_results=?, error=?, paused_at=?, completed_at=? WHERE id=?`
  ).run(
    run.status,
    run.currentStepIndex,
    JSON.stringify(run.stepResults),
    run.error || null,
    run.pausedAt || null,
    run.completedAt || null,
    run.id,
  );
}

async function executeAiAction(_step: OrchestrationStep, _input: string): Promise<string> {
  // Stub: AI execution not yet wired for this app.
  // Wire Social's own AI service here when ready.
  return 'AI execution not yet wired for this app — use NovaSyn Chat orchestrations for AI actions';
}

function executeTransform(step: OrchestrationStep, input: string): string {
  const transformType = step.config.transformType || 'format_text';

  if (transformType === 'extract_json') {
    try {
      const parsed = JSON.parse(input);
      const field = step.config.transformPattern || '';
      return field ? String(parsed[field] ?? '') : input;
    } catch {
      return input;
    }
  }

  if (transformType === 'regex') {
    try {
      const pattern = step.config.transformPattern || '(.*)';
      const match = input.match(new RegExp(pattern, 's'));
      return match ? (match[1] || match[0]) : input;
    } catch {
      return input;
    }
  }

  // format_text — just pass through (could add formatting later)
  return input;
}

export async function runOrchestration(orchestrationId: string, manualInput?: string): Promise<OrchestrationRun> {
  const orch = getOrchestration(orchestrationId);
  if (!orch) throw new Error(`Orchestration ${orchestrationId} not found`);

  const db = getDatabase();
  const runId = uuidv4();
  const now = new Date().toISOString();

  // Initialize step results
  const stepResults: StepResult[] = orch.steps.map((step, i) => ({
    stepId: step.id,
    stepIndex: i,
    status: 'pending' as const,
    output: null,
  }));

  db.prepare(
    'INSERT INTO orchestration_runs (id, orchestration_id, status, current_step_index, step_results, started_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(runId, orchestrationId, 'running', 0, JSON.stringify(stepResults), now);

  const run: OrchestrationRun = {
    id: runId,
    orchestrationId,
    status: 'running',
    currentStepIndex: 0,
    stepResults,
    startedAt: now,
  };

  // Execute steps sequentially
  await executeSteps(orch, run, 0, manualInput || '');
  return getRun(runId)!;
}

async function executeSteps(orch: Orchestration, run: OrchestrationRun, startIndex: number, initialInput: string): Promise<void> {
  let previousOutput = initialInput;

  for (let i = startIndex; i < orch.steps.length; i++) {
    const step = orch.steps[i];
    run.currentStepIndex = i;
    run.stepResults[i].status = 'running';
    run.stepResults[i].startedAt = new Date().toISOString();
    saveRunState(run);
    emitProgress(run.id, i, 'running');

    try {
      // Determine input for this step
      let input = previousOutput;
      if (step.config.inputSource === 'manual' && step.config.manualInput) {
        input = step.config.manualInput;
      } else if (step.config.inputSource === 'vault' && step.config.vaultItemId) {
        const vaultItem = vaultGet(step.config.vaultItemId);
        input = vaultItem?.content || '';
      }

      let output: any = null;
      const stepStart = Date.now();

      switch (step.type) {
        case 'ai_action':
          output = await executeAiAction(step, input);
          break;

        case 'qc_checkpoint':
          // Pause for human review
          run.stepResults[i].status = 'awaiting_qc';
          run.stepResults[i].output = previousOutput; // Show the previous output for review
          run.status = 'paused_for_qc';
          run.pausedAt = new Date().toISOString();
          saveRunState(run);
          emitProgress(run.id, i, 'awaiting_qc', previousOutput);
          return; // Stop execution — will be resumed via orchResume

        case 'transform':
          output = executeTransform(step, input);
          break;

        case 'vault_save':
          const vaultItem = vaultStore({
            itemType: 'orchestration_output',
            title: step.name || `Orchestration step ${i + 1}`,
            content: typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput),
            outputTypeHint: step.config.outputType || 'text',
            tags: step.config.tags || [],
            metadata: {
              orchestrationId: run.orchestrationId,
              runId: run.id,
              stepIndex: i,
            },
          });
          output = vaultItem.id;
          run.stepResults[i].vaultItemId = vaultItem.id;
          break;

        case 'vault_load':
          if (step.config.vaultItemId) {
            const loaded = vaultGet(step.config.vaultItemId);
            output = loaded?.content || '';
          } else {
            output = '';
          }
          break;

        default:
          output = input;
      }

      const latencyMs = Date.now() - stepStart;
      run.stepResults[i].status = 'completed';
      run.stepResults[i].output = output;
      run.stepResults[i].completedAt = new Date().toISOString();
      run.stepResults[i].latencyMs = latencyMs;

      // Auto-save to vault if configured
      if (step.config.saveToVault && step.type !== 'vault_save' && output) {
        const saved = vaultStore({
          itemType: 'orchestration_output',
          title: `${step.name} output`,
          content: typeof output === 'string' ? output : JSON.stringify(output),
          outputTypeHint: step.config.outputType || 'text',
          tags: step.config.tags || [],
          metadata: {
            orchestrationId: run.orchestrationId,
            runId: run.id,
            stepIndex: i,
          },
        });
        run.stepResults[i].vaultItemId = saved.id;
      }

      saveRunState(run);
      emitProgress(run.id, i, 'completed', output);
      previousOutput = typeof output === 'string' ? output : JSON.stringify(output);

    } catch (err: any) {
      run.stepResults[i].status = 'failed';
      run.stepResults[i].error = err.message;
      run.stepResults[i].completedAt = new Date().toISOString();
      run.status = 'failed';
      run.error = `Step ${i + 1} (${step.name}) failed: ${err.message}`;
      run.completedAt = new Date().toISOString();
      saveRunState(run);
      emitProgress(run.id, i, 'failed', err.message);
      return;
    }
  }

  // All steps completed
  run.status = 'completed';
  run.completedAt = new Date().toISOString();
  saveRunState(run);
}

export async function resumeOrchestration(runId: string, decision: 'approved' | 'rejected'): Promise<OrchestrationRun> {
  const run = getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'paused_for_qc') throw new Error(`Run ${runId} is not paused for QC`);

  const orch = getOrchestration(run.orchestrationId);
  if (!orch) throw new Error(`Orchestration ${run.orchestrationId} not found`);

  const qcStepIndex = run.currentStepIndex;
  run.stepResults[qcStepIndex].qcDecision = decision;
  run.stepResults[qcStepIndex].completedAt = new Date().toISOString();

  if (decision === 'rejected') {
    run.stepResults[qcStepIndex].status = 'failed';
    run.status = 'failed';
    run.error = `QC checkpoint rejected at step ${qcStepIndex + 1}`;
    run.completedAt = new Date().toISOString();
    saveRunState(run);
    emitProgress(run.id, qcStepIndex, 'failed', 'QC rejected');
    return getRun(runId)!;
  }

  // Approved — continue from next step
  run.stepResults[qcStepIndex].status = 'completed';
  run.status = 'running';
  run.pausedAt = undefined;
  saveRunState(run);
  emitProgress(run.id, qcStepIndex, 'completed');

  // Gather previous output for continuation
  let previousOutput = '';
  for (let i = qcStepIndex - 1; i >= 0; i--) {
    if (run.stepResults[i].output) {
      previousOutput = typeof run.stepResults[i].output === 'string'
        ? run.stepResults[i].output
        : JSON.stringify(run.stepResults[i].output);
      break;
    }
  }

  await executeSteps(orch, run, qcStepIndex + 1, previousOutput);
  return getRun(runId)!;
}
