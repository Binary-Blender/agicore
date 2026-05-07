// WorkflowEngine — BFS parallel execution engine for cross-app workflows
//
// Key difference from NovaSyn Chat's in-app OrchestrationEngine:
//   - Chat's engine runs steps SEQUENTIALLY (step 0, then step 1, then step 2...)
//   - This engine runs by LEVEL (row). All modules in a row execute in parallel
//     via Promise.all, then the next row starts. This is the BFS paradigm from
//     the original Binary Blender Orchestrator.
//   - This engine supports 'cross_app_action' modules that invoke macros in
//     other NovaSyn apps via the file-based queue system.

import { v4 as uuidv4 } from 'uuid';
import { BrowserWindow } from 'electron';
import { getDatabase } from '../database/db';
import { vaultStore, vaultGet } from '../vault/vaultService';
import { sendMacroRequest } from '../vault/queueWatcher';
import { chatService, AVAILABLE_MODELS } from '../services/ChatService';
import { loadApiKeys } from '../config/apiKeyStore';
import type {
  Workflow,
  WorkflowRow,
  WorkflowRun,
  ModuleConfig,
  StepResult,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

function mapWorkflow(row: any): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    rows: JSON.parse(row.rows || '[]'),
    isTemplate: !!row.is_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRun(row: any): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    currentLevel: row.current_level,
    stepResults: JSON.parse(row.step_results || '[]'),
    error: row.error || undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
  };
}

// ---------------------------------------------------------------------------
// CRUD — Workflows
// ---------------------------------------------------------------------------

export function listWorkflows(): Workflow[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC').all();
  return rows.map(mapWorkflow);
}

export function getWorkflow(id: string): Workflow | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id);
  return row ? mapWorkflow(row) : null;
}

export function createWorkflow(data: {
  name: string;
  description?: string;
  rows: WorkflowRow[];
}): Workflow {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO workflows (id, name, description, rows, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.name, data.description || '', JSON.stringify(data.rows), now, now);
  return getWorkflow(id)!;
}

export function updateWorkflow(id: string, updates: Partial<Workflow>): Workflow {
  const db = getDatabase();
  const now = new Date().toISOString();
  const current = getWorkflow(id);
  if (!current) throw new Error(`Workflow ${id} not found`);

  const name = updates.name ?? current.name;
  const description = updates.description ?? current.description;
  const rows = updates.rows ?? current.rows;
  const isTemplate = updates.isTemplate ?? current.isTemplate;

  db.prepare(
    'UPDATE workflows SET name=?, description=?, rows=?, is_template=?, updated_at=? WHERE id=?'
  ).run(name, description, JSON.stringify(rows), isTemplate ? 1 : 0, now, id);

  return getWorkflow(id)!;
}

export function deleteWorkflow(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// CRUD — Runs
// ---------------------------------------------------------------------------

export function listRuns(workflowId: string): WorkflowRun[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC'
  ).all(workflowId);
  return rows.map(mapRun);
}

export function getRun(runId: string): WorkflowRun | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(runId);
  return row ? mapRun(row) : null;
}

// ---------------------------------------------------------------------------
// Progress & persistence
// ---------------------------------------------------------------------------

function emitProgress(
  runId: string,
  level: number,
  moduleId: string,
  status: string,
  output?: any,
): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send('workflow-step-progress', {
      runId,
      level,
      moduleId,
      status,
      output,
    });
  }
}

function saveRunState(run: WorkflowRun): void {
  const db = getDatabase();
  db.prepare(
    `UPDATE workflow_runs SET status=?, current_level=?, step_results=?, error=?, completed_at=? WHERE id=?`
  ).run(
    run.status,
    run.currentLevel,
    JSON.stringify(run.stepResults),
    run.error || null,
    run.completedAt || null,
    run.id,
  );
}

// ---------------------------------------------------------------------------
// Module executors
// ---------------------------------------------------------------------------

/**
 * Resolve the input for a module based on its inputSource config.
 * - 'previous': use the aggregated output from the previous level
 * - 'manual': use the manualInput string from config
 * - 'vault': load content from a vault item by ID
 * Falls back to previousOutput if no inputSource is specified.
 */
function resolveInput(module: ModuleConfig, previousOutput: string): string {
  if (module.config.inputSource === 'manual' && module.config.manualInput) {
    return module.config.manualInput;
  }
  if (module.config.inputSource === 'vault' && module.config.vaultItemId) {
    const item = vaultGet(module.config.vaultItemId);
    return item?.content || '';
  }
  return previousOutput;
}

async function executeAiAction(module: ModuleConfig, input: string): Promise<string> {
  const prompt = module.config.promptTemplate
    ? module.config.promptTemplate.replace(/\{\{input\}\}/g, input)
    : input;

  const modelId = module.config.model || AVAILABLE_MODELS[0]?.id || 'claude-haiku-4-5-20251001';
  const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKeys = loadApiKeys();
  const apiKey = apiKeys[modelConfig.provider] || '';
  if (!apiKey) throw new Error(`No API key configured for provider: ${modelConfig.provider}`);

  const messages: any[] = [{ role: 'user' as const, content: prompt }];

  let fullText = '';
  await chatService.completeStream(
    messages, modelId, undefined, apiKey, undefined,
    (delta: string) => { fullText += delta; },
    apiKeys,
  );
  return fullText;
}

function executeTransform(module: ModuleConfig, input: string): string {
  const transformType = module.config.transformType || 'format_text';

  if (transformType === 'extract_json') {
    try {
      const parsed = JSON.parse(input);
      const field = module.config.transformPattern || '';
      return field ? String(parsed[field] ?? '') : input;
    } catch {
      return input;
    }
  }

  if (transformType === 'regex') {
    try {
      const pattern = module.config.transformPattern || '(.*)';
      const match = input.match(new RegExp(pattern, 's'));
      return match ? (match[1] || match[0]) : input;
    } catch {
      return input;
    }
  }

  // format_text — pass through
  return input;
}

async function executeCrossAppAction(module: ModuleConfig, input: string): Promise<any> {
  const targetApp = module.targetApp;
  const macro = module.macro;
  if (!targetApp || !macro) {
    throw new Error(`cross_app_action module "${module.name}" is missing targetApp or macro`);
  }

  const response = await sendMacroRequest(targetApp, macro, { input });

  if (response.status === 'failed') {
    throw new Error(`Cross-app macro "${macro}" on ${targetApp} failed: ${response.error || 'unknown error'}`);
  }

  return response.output;
}

// ---------------------------------------------------------------------------
// Single module executor — dispatches by type
// ---------------------------------------------------------------------------

async function executeModule(
  module: ModuleConfig,
  previousOutput: string,
  run: WorkflowRun,
  resultIndex: number,
): Promise<{ output: any; pauseForQc: boolean }> {
  const input = resolveInput(module, previousOutput);
  const stepStart = Date.now();

  switch (module.type) {
    case 'ai_action': {
      const output = await executeAiAction(module, input);
      run.stepResults[resultIndex].latencyMs = Date.now() - stepStart;
      return { output, pauseForQc: false };
    }

    case 'cross_app_action': {
      const output = await executeCrossAppAction(module, input);
      run.stepResults[resultIndex].latencyMs = Date.now() - stepStart;
      return { output, pauseForQc: false };
    }

    case 'qc_checkpoint': {
      // Return the previous output for review; signal the engine to pause
      return { output: previousOutput, pauseForQc: true };
    }

    case 'transform': {
      const output = executeTransform(module, input);
      run.stepResults[resultIndex].latencyMs = Date.now() - stepStart;
      return { output, pauseForQc: false };
    }

    case 'vault_save': {
      const item = vaultStore({
        itemType: 'orchestration_output',
        title: module.name || 'Workflow output',
        content: typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput),
        outputTypeHint: module.config.outputType || 'text',
        tags: module.config.tags || [],
        metadata: {
          workflowId: run.workflowId,
          runId: run.id,
          moduleId: module.id,
        },
      });
      run.stepResults[resultIndex].vaultItemId = item.id;
      run.stepResults[resultIndex].latencyMs = Date.now() - stepStart;
      return { output: item.id, pauseForQc: false };
    }

    case 'vault_load': {
      if (module.config.vaultItemId) {
        const loaded = vaultGet(module.config.vaultItemId);
        run.stepResults[resultIndex].latencyMs = Date.now() - stepStart;
        return { output: loaded?.content || '', pauseForQc: false };
      }
      run.stepResults[resultIndex].latencyMs = Date.now() - stepStart;
      return { output: '', pauseForQc: false };
    }

    default:
      return { output: input, pauseForQc: false };
  }
}

// ---------------------------------------------------------------------------
// Auto-save helper
// ---------------------------------------------------------------------------

function autoSaveToVault(module: ModuleConfig, run: WorkflowRun, resultIndex: number, output: any): void {
  if (!module.config.saveToVault || module.type === 'vault_save' || !output) return;

  const saved = vaultStore({
    itemType: 'orchestration_output',
    title: `${module.name} output`,
    content: typeof output === 'string' ? output : JSON.stringify(output),
    outputTypeHint: module.config.outputType || 'text',
    tags: module.config.tags || [],
    metadata: {
      workflowId: run.workflowId,
      runId: run.id,
      moduleId: module.id,
    },
  });
  run.stepResults[resultIndex].vaultItemId = saved.id;
}

// ---------------------------------------------------------------------------
// BFS Level Execution — the core differentiator
// ---------------------------------------------------------------------------

/**
 * Execute all levels starting from startLevel.
 * For each level, all modules run in parallel via Promise.all.
 * If any module in a level is a qc_checkpoint, the entire run pauses
 * after that level completes.
 */
async function executeLevels(
  workflow: Workflow,
  run: WorkflowRun,
  startLevel: number,
  previousOutput: string,
): Promise<void> {
  let levelOutput = previousOutput;

  for (let levelIdx = startLevel; levelIdx < workflow.rows.length; levelIdx++) {
    const row = workflow.rows[levelIdx];
    run.currentLevel = levelIdx;

    // Find result indices for modules in this row
    const moduleResultPairs: { module: ModuleConfig; resultIndex: number }[] = [];
    for (const mod of row.modules) {
      const idx = run.stepResults.findIndex((r) => r.moduleId === mod.id);
      if (idx !== -1) moduleResultPairs.push({ module: mod, resultIndex: idx });
    }

    // Mark all modules in this row as running
    for (const { module, resultIndex } of moduleResultPairs) {
      run.stepResults[resultIndex].status = 'running';
      run.stepResults[resultIndex].startedAt = new Date().toISOString();
      emitProgress(run.id, levelIdx, module.id, 'running');
    }
    saveRunState(run);

    // Execute all modules in this row in parallel
    let pauseAfterLevel = false;
    const results = await Promise.allSettled(
      moduleResultPairs.map(async ({ module, resultIndex }) => {
        try {
          const { output, pauseForQc } = await executeModule(
            module, levelOutput, run, resultIndex,
          );

          if (pauseForQc) {
            run.stepResults[resultIndex].status = 'awaiting_qc';
            run.stepResults[resultIndex].output = output;
            emitProgress(run.id, levelIdx, module.id, 'awaiting_qc', output);
            pauseAfterLevel = true;
          } else {
            run.stepResults[resultIndex].status = 'completed';
            run.stepResults[resultIndex].output = output;
            run.stepResults[resultIndex].completedAt = new Date().toISOString();
            autoSaveToVault(module, run, resultIndex, output);
            emitProgress(run.id, levelIdx, module.id, 'completed', output);
          }

          return { moduleId: module.id, output };
        } catch (err: any) {
          run.stepResults[resultIndex].status = 'failed';
          run.stepResults[resultIndex].error = err.message;
          run.stepResults[resultIndex].completedAt = new Date().toISOString();
          emitProgress(run.id, levelIdx, module.id, 'failed', err.message);
          throw err;
        }
      }),
    );

    saveRunState(run);

    // Check if any module in this level failed
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      const firstError = (failures[0] as PromiseRejectedResult).reason;
      run.status = 'failed';
      run.error = `Level ${levelIdx} failed: ${firstError.message || firstError}`;
      run.completedAt = new Date().toISOString();
      saveRunState(run);
      return;
    }

    // Aggregate outputs from this level for the next level.
    // If only one module produced output, pass it as a string.
    // If multiple modules ran, aggregate as JSON array.
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{
      moduleId: string;
      output: any;
    }>[];

    if (fulfilled.length === 1) {
      const out = fulfilled[0].value.output;
      levelOutput = typeof out === 'string' ? out : JSON.stringify(out);
    } else if (fulfilled.length > 1) {
      const aggregated = fulfilled.map((r) => ({
        moduleId: r.value.moduleId,
        output: r.value.output,
      }));
      levelOutput = JSON.stringify(aggregated);
    }

    // Pause the run if a QC checkpoint was hit
    if (pauseAfterLevel) {
      run.status = 'paused_for_qc';
      saveRunState(run);
      return; // Execution stops; will be resumed via resumeWorkflow()
    }
  }

  // All levels completed
  run.status = 'completed';
  run.completedAt = new Date().toISOString();
  saveRunState(run);
}

// ---------------------------------------------------------------------------
// Public API — Run & Resume
// ---------------------------------------------------------------------------

export async function runWorkflow(
  workflowId: string,
  manualInput?: string,
): Promise<WorkflowRun> {
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const db = getDatabase();
  const runId = uuidv4();
  const now = new Date().toISOString();

  // Build initial step results — one per module across all rows
  const stepResults: StepResult[] = [];
  for (const row of workflow.rows) {
    for (const mod of row.modules) {
      stepResults.push({
        moduleId: mod.id,
        level: row.level,
        status: 'pending',
        output: null,
      });
    }
  }

  db.prepare(
    'INSERT INTO workflow_runs (id, workflow_id, status, current_level, step_results, started_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(runId, workflowId, 'running', 0, JSON.stringify(stepResults), now);

  const run: WorkflowRun = {
    id: runId,
    workflowId,
    status: 'running',
    currentLevel: 0,
    stepResults,
    startedAt: now,
  };

  // Execute starting from level 0
  await executeLevels(workflow, run, 0, manualInput || '');
  return getRun(runId)!;
}

export async function resumeWorkflow(
  runId: string,
  decision: 'approved' | 'rejected',
): Promise<WorkflowRun> {
  const run = getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'paused_for_qc') throw new Error(`Run ${runId} is not paused for QC`);

  const workflow = getWorkflow(run.workflowId);
  if (!workflow) throw new Error(`Workflow ${run.workflowId} not found`);

  // Find all QC modules at the paused level and apply the decision
  const pausedLevel = run.currentLevel;
  for (const result of run.stepResults) {
    if (result.level === pausedLevel && result.status === 'awaiting_qc') {
      result.qcDecision = decision;
      result.completedAt = new Date().toISOString();

      if (decision === 'rejected') {
        result.status = 'failed';
      } else {
        result.status = 'completed';
      }
    }
  }

  if (decision === 'rejected') {
    run.status = 'failed';
    run.error = `QC checkpoint rejected at level ${pausedLevel}`;
    run.completedAt = new Date().toISOString();
    saveRunState(run);
    emitProgress(run.id, pausedLevel, '', 'failed', 'QC rejected');
    return getRun(runId)!;
  }

  // Approved — continue from the next level
  run.status = 'running';
  saveRunState(run);

  // Gather the output from the paused level to feed into the next level
  const levelResults = run.stepResults.filter((r) => r.level === pausedLevel);
  let previousOutput = '';
  if (levelResults.length === 1) {
    const out = levelResults[0].output;
    previousOutput = typeof out === 'string' ? out : JSON.stringify(out);
  } else if (levelResults.length > 1) {
    const aggregated = levelResults.map((r) => ({
      moduleId: r.moduleId,
      output: r.output,
    }));
    previousOutput = JSON.stringify(aggregated);
  }

  await executeLevels(workflow, run, pausedLevel + 1, previousOutput);
  return getRun(runId)!;
}
