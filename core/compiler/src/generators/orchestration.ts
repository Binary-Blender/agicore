// Orchestration Runtime Generator
// Generates: PipelineEngine (BFS row executor), SPCController (progressive sampling),
// QC checkpoint pause/resume, vault service integration

import type { AgiFile, PipelineDecl, QCDecl, VaultDecl } from '@agicore/parser';

// ---------------------------------------------------------------------------
// SPC Controller
// ---------------------------------------------------------------------------

function generateSPCController(qcs: QCDecl[]): string {
  if (qcs.length === 0) return '';

  const lines: string[] = [
    '// --- SPC Controller (Statistical Process Control) ---',
    '// Progressive sampling: 100% -> 50% -> 5% as AI proves reliable',
    '// Based on manufacturing quality control (TPS Jidoka principle)',
    '',
    'interface ProcessStats {',
    '  total: number;',
    '  approved: number;',
    '  rejected: number;',
    '  passRate: number;',
    '  samplingRate: number;',
    '  cpk: number;',
    '}',
    '',
    'interface SPCConfig {',
    '  youngThreshold: number;',
    '  maturingThreshold: number;',
    '  youngPassRate: number;',
    '  maturePassRate: number;',
    '  maturingSampleRate: number;',
    '  matureSampleRate: number;',
    '}',
    '',
    'export class SPCController {',
    '  private configs: Map<string, SPCConfig> = new Map();',
    '  private stats: Map<string, ProcessStats> = new Map();',
    '',
    '  constructor() {',
  ];

  for (const qc of qcs) {
    lines.push(`    this.configs.set('${qc.name}', {`);
    lines.push(`      youngThreshold: ${qc.youngThreshold},`);
    lines.push(`      maturingThreshold: ${qc.maturingThreshold},`);
    lines.push(`      youngPassRate: ${qc.youngPassRate},`);
    lines.push(`      maturePassRate: ${qc.maturePassRate},`);
    lines.push(`      maturingSampleRate: ${qc.maturingSample},`);
    lines.push(`      matureSampleRate: ${qc.matureSample},`);
    lines.push(`    });`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  shouldRequireQC(processName: string): boolean {');
  lines.push('    const config = this.configs.get(processName);');
  lines.push('    if (!config) return true;');
  lines.push('    const stats = this.stats.get(processName);');
  lines.push('    if (!stats) return true;');
  lines.push('');
  lines.push('    const { total, passRate } = stats;');
  lines.push('');
  lines.push('    // Phase 1: Young process — 100% inspection');
  lines.push('    if (total < config.youngThreshold) {');
  lines.push('      stats.samplingRate = 1.0;');
  lines.push('      return true;');
  lines.push('    }');
  lines.push('');
  lines.push('    // Phase 2: Maturing process');
  lines.push('    if (total < config.maturingThreshold) {');
  lines.push('      if (passRate >= config.youngPassRate) {');
  lines.push('        stats.samplingRate = config.maturingSampleRate;');
  lines.push('        return Math.random() < config.maturingSampleRate;');
  lines.push('      }');
  lines.push('      stats.samplingRate = 1.0;');
  lines.push('      return true;');
  lines.push('    }');
  lines.push('');
  lines.push('    // Phase 3: Mature process');
  lines.push('    if (passRate >= config.maturePassRate) {');
  lines.push('      stats.samplingRate = config.matureSampleRate;');
  lines.push('      return Math.random() < config.matureSampleRate;');
  lines.push('    }');
  lines.push('    if (passRate >= config.youngPassRate) {');
  lines.push('      stats.samplingRate = config.maturingSampleRate;');
  lines.push('      return Math.random() < config.maturingSampleRate;');
  lines.push('    }');
  lines.push('');
  lines.push('    // Quality degraded — back to 100%');
  lines.push('    stats.samplingRate = 1.0;');
  lines.push('    return true;');
  lines.push('  }');
  lines.push('');
  lines.push('  recordResult(processName: string, passed: boolean): void {');
  lines.push('    if (!this.stats.has(processName)) {');
  lines.push('      this.stats.set(processName, { total: 0, approved: 0, rejected: 0, passRate: 0, samplingRate: 1.0, cpk: 0 });');
  lines.push('    }');
  lines.push('    const stats = this.stats.get(processName)!;');
  lines.push('    stats.total++;');
  lines.push('    if (passed) stats.approved++; else stats.rejected++;');
  lines.push('    stats.passRate = stats.total > 0 ? stats.approved / stats.total : 0;');
  lines.push('    stats.cpk = this.calculateCpk(stats);');
  lines.push('  }');
  lines.push('');
  lines.push('  private calculateCpk(stats: ProcessStats): number {');
  lines.push('    if (stats.total < 30) return 0;');
  lines.push('    const defectRate = 1 - stats.passRate;');
  lines.push('    if (defectRate <= 0.001) return 2.0;');
  lines.push('    if (defectRate <= 0.005) return 1.67;');
  lines.push('    if (defectRate <= 0.01) return 1.33;');
  lines.push('    if (defectRate <= 0.05) return 1.0;');
  lines.push('    return 0.67;');
  lines.push('  }');
  lines.push('');
  lines.push('  getStats(processName: string): ProcessStats {');
  lines.push('    return this.stats.get(processName) ?? { total: 0, approved: 0, rejected: 0, passRate: 0, samplingRate: 1.0, cpk: 0 };');
  lines.push('  }');
  lines.push('');
  lines.push('  getCostSavings(processName: string, costPerQC: number = 0.50): { total: number; qcPerformed: number; savings: number; savingsPercent: number } {');
  lines.push('    const stats = this.getStats(processName);');
  lines.push('    const qcPerformed = Math.round(stats.total * stats.samplingRate);');
  lines.push('    const costWithout = stats.total * costPerQC;');
  lines.push('    const costWith = qcPerformed * costPerQC;');
  lines.push('    return { total: stats.total, qcPerformed, savings: costWithout - costWith, savingsPercent: costWithout > 0 ? ((costWithout - costWith) / costWithout) * 100 : 0 };');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Pipeline Engine
// ---------------------------------------------------------------------------

function generatePipelineEngine(pipelines: PipelineDecl[]): string {
  if (pipelines.length === 0) return '';

  const lines: string[] = [
    '// --- Pipeline Engine (BFS Row-Based Parallel Execution) ---',
    '',
    'export type ModuleStatus = "pending" | "running" | "completed" | "failed" | "awaiting_qc";',
    'export type RunStatus = "pending" | "running" | "paused_for_qc" | "completed" | "failed";',
    '',
    'export interface StepResult {',
    '  moduleId: string;',
    '  moduleName: string;',
    '  level: number;',
    '  status: ModuleStatus;',
    '  output: unknown;',
    '  error?: string;',
    '  latencyMs?: number;',
    '  qcDecision?: "approved" | "rejected";',
    '  startedAt?: string;',
    '  completedAt?: string;',
    '}',
    '',
    'export interface PipelineRun {',
    '  id: string;',
    '  pipelineName: string;',
    '  status: RunStatus;',
    '  currentLevel: number;',
    '  stepResults: StepResult[];',
    '  error?: string;',
    '  startedAt: string;',
    '  completedAt?: string;',
    '}',
    '',
    'export interface PipelineModuleDef {',
    '  name: string;',
    '  type: string;',
    '  config: Record<string, unknown>;',
    '}',
    '',
    'export interface PipelineRowDef {',
    '  name: string;',
    '  level: number;',
    '  modules: PipelineModuleDef[];',
    '}',
    '',
    'export interface ConnectionDef {',
    '  fromModule: string;',
    '  fromOutput: string;',
    '  toModule: string;',
    '  toInput: string;',
    '}',
    '',
    'export interface PipelineDef {',
    '  name: string;',
    '  description: string;',
    '  rows: PipelineRowDef[];',
    '  connections: ConnectionDef[];',
    '}',
    '',
    'export type ModuleExecutor = (input: Record<string, unknown>, config: Record<string, unknown>) => Promise<unknown>;',
    '',
    'export class PipelineEngine {',
    '  private pipelines: Map<string, PipelineDef> = new Map();',
    '  private executors: Map<string, ModuleExecutor> = new Map();',
    '  private runs: Map<string, PipelineRun> = new Map();',
    '  private spc: SPCController | null = null;',
    '  private listeners: Array<(event: string, data: unknown) => void> = [];',
    '',
    '  constructor(spc?: SPCController) {',
    '    this.spc = spc ?? null;',
    '    this.init();',
    '  }',
    '',
    '  private init(): void {',
  ];

  // Register pipeline definitions
  for (const pipeline of pipelines) {
    const rows = pipeline.rows.map((row, idx) => {
      const modules = row.modules.map(m =>
        `{ name: '${m.name}', type: '${m.type}', config: ${JSON.stringify(m.config)} }`
      ).join(', ');
      return `{ name: '${row.name}', level: ${idx}, modules: [${modules}] }`;
    }).join(',\n      ');

    const connections = pipeline.connections.map(c =>
      `{ fromModule: '${c.fromModule}', fromOutput: '${c.fromOutput}', toModule: '${c.toModule}', toInput: '${c.toInput}' }`
    ).join(', ');

    lines.push(`    this.pipelines.set('${pipeline.name}', {`);
    lines.push(`      name: '${pipeline.name}',`);
    lines.push(`      description: '${pipeline.description.replace(/'/g, "\\'")}',`);
    lines.push(`      rows: [${rows}],`);
    lines.push(`      connections: [${connections}],`);
    lines.push(`    });`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  registerExecutor(moduleType: string, executor: ModuleExecutor): void {');
  lines.push('    this.executors.set(moduleType, executor);');
  lines.push('  }');
  lines.push('');
  lines.push('  onEvent(fn: (event: string, data: unknown) => void): void {');
  lines.push('    this.listeners.push(fn);');
  lines.push('  }');
  lines.push('');
  lines.push('  private emit(event: string, data: unknown): void {');
  lines.push('    this.listeners.forEach(fn => fn(event, data));');
  lines.push('  }');
  lines.push('');

  // Run method
  lines.push('  async run(pipelineName: string, input?: string): Promise<PipelineRun> {');
  lines.push('    const pipeline = this.pipelines.get(pipelineName);');
  lines.push('    if (!pipeline) throw new Error(`Pipeline not found: ${pipelineName}`);');
  lines.push('');
  lines.push('    const run: PipelineRun = {');
  lines.push('      id: crypto.randomUUID(),');
  lines.push('      pipelineName,');
  lines.push('      status: "running",');
  lines.push('      currentLevel: 0,');
  lines.push('      stepResults: pipeline.rows.flatMap(row =>');
  lines.push('        row.modules.map(m => ({ moduleId: m.name, moduleName: m.name, level: row.level, status: "pending" as ModuleStatus, output: null }))');
  lines.push('      ),');
  lines.push('      startedAt: new Date().toISOString(),');
  lines.push('    };');
  lines.push('    this.runs.set(run.id, run);');
  lines.push('    this.emit("run:start", { runId: run.id, pipelineName });');
  lines.push('');
  lines.push('    await this.executeRows(pipeline, run, 0, { input: input ?? "" });');
  lines.push('    return run;');
  lines.push('  }');
  lines.push('');

  // Resume method
  lines.push('  async resume(runId: string, decision: "approved" | "rejected"): Promise<PipelineRun> {');
  lines.push('    const run = this.runs.get(runId);');
  lines.push('    if (!run || run.status !== "paused_for_qc") throw new Error(`Run ${runId} not paused`);');
  lines.push('    const pipeline = this.pipelines.get(run.pipelineName)!;');
  lines.push('');
  lines.push('    // Apply QC decision');
  lines.push('    for (const step of run.stepResults) {');
  lines.push('      if (step.level === run.currentLevel && step.status === "awaiting_qc") {');
  lines.push('        step.qcDecision = decision;');
  lines.push('        step.status = decision === "approved" ? "completed" : "failed";');
  lines.push('        step.completedAt = new Date().toISOString();');
  lines.push('');
  lines.push('        // Record SPC result');
  lines.push('        const modDef = pipeline.rows[step.level]?.modules.find(m => m.name === step.moduleName);');
  lines.push('        const spcName = modDef?.config?.SPC as string | undefined;');
  lines.push('        if (spcName && this.spc) this.spc.recordResult(spcName, decision === "approved");');
  lines.push('      }');
  lines.push('    }');
  lines.push('');
  lines.push('    if (decision === "rejected") {');
  lines.push('      run.status = "failed";');
  lines.push('      run.error = `QC rejected at level ${run.currentLevel}`;');
  lines.push('      run.completedAt = new Date().toISOString();');
  lines.push('      this.emit("run:failed", { runId, error: run.error });');
  lines.push('      return run;');
  lines.push('    }');
  lines.push('');
  lines.push('    run.status = "running";');
  lines.push('    const outputs = this.gatherLevelOutputs(run, run.currentLevel);');
  lines.push('    await this.executeRows(pipeline, run, run.currentLevel + 1, outputs);');
  lines.push('    return run;');
  lines.push('  }');
  lines.push('');

  // BFS row executor
  lines.push('  private async executeRows(pipeline: PipelineDef, run: PipelineRun, startLevel: number, previousOutputs: Record<string, unknown>): Promise<void> {');
  lines.push('    let levelOutputs = previousOutputs;');
  lines.push('');
  lines.push('    for (let level = startLevel; level < pipeline.rows.length; level++) {');
  lines.push('      const row = pipeline.rows[level]!;');
  lines.push('      run.currentLevel = level;');
  lines.push('');
  lines.push('      // Resolve inputs for each module via connections');
  lines.push('      const moduleInputs = new Map<string, Record<string, unknown>>();');
  lines.push('      for (const mod of row.modules) {');
  lines.push('        const inputs: Record<string, unknown> = { ...levelOutputs };');
  lines.push('        for (const conn of pipeline.connections) {');
  lines.push('          if (conn.toModule === mod.name) {');
  lines.push('            inputs[conn.toInput] = levelOutputs[`${conn.fromModule}.${conn.fromOutput}`] ?? levelOutputs[conn.fromModule] ?? "";');
  lines.push('          }');
  lines.push('        }');
  lines.push('        moduleInputs.set(mod.name, inputs);');
  lines.push('      }');
  lines.push('');
  lines.push('      // Execute all modules in this row in parallel');
  lines.push('      let pauseAfterLevel = false;');
  lines.push('      const results = await Promise.allSettled(');
  lines.push('        row.modules.map(async (mod) => {');
  lines.push('          const stepIdx = run.stepResults.findIndex(s => s.moduleId === mod.name && s.level === level);');
  lines.push('          if (stepIdx === -1) return;');
  lines.push('          const step = run.stepResults[stepIdx]!;');
  lines.push('          step.status = "running";');
  lines.push('          step.startedAt = new Date().toISOString();');
  lines.push('          this.emit("step:start", { runId: run.id, level, moduleId: mod.name });');
  lines.push('');
  lines.push('          const start = Date.now();');
  lines.push('          const inputs = moduleInputs.get(mod.name) ?? {};');
  lines.push('');
  lines.push('          // QC checkpoint handling');
  lines.push('          if (mod.type === "qc_checkpoint") {');
  lines.push('            const spcName = mod.config.SPC as string | undefined;');
  lines.push('            const needsQC = !spcName || !this.spc || this.spc.shouldRequireQC(spcName);');
  lines.push('            if (needsQC) {');
  lines.push('              step.status = "awaiting_qc";');
  lines.push('              step.output = inputs;');
  lines.push('              pauseAfterLevel = true;');
  lines.push('              this.emit("step:qc", { runId: run.id, level, moduleId: mod.name });');
  lines.push('              return { name: mod.name, output: inputs };');
  lines.push('            }');
  lines.push('            // Auto-approved by SPC');
  lines.push('            step.status = "completed";');
  lines.push('            step.output = inputs;');
  lines.push('            step.qcDecision = "approved";');
  lines.push('            step.latencyMs = Date.now() - start;');
  lines.push('            step.completedAt = new Date().toISOString();');
  lines.push('            if (spcName && this.spc) this.spc.recordResult(spcName, true);');
  lines.push('            return { name: mod.name, output: inputs };');
  lines.push('          }');
  lines.push('');
  lines.push('          // Standard module execution');
  lines.push('          const executor = this.executors.get(mod.type);');
  lines.push('          if (!executor) throw new Error(`No executor for module type: ${mod.type}`);');
  lines.push('          const output = await executor(inputs, mod.config);');
  lines.push('          step.status = "completed";');
  lines.push('          step.output = output;');
  lines.push('          step.latencyMs = Date.now() - start;');
  lines.push('          step.completedAt = new Date().toISOString();');
  lines.push('          this.emit("step:complete", { runId: run.id, level, moduleId: mod.name, output, latencyMs: step.latencyMs });');
  lines.push('          return { name: mod.name, output };');
  lines.push('        })');
  lines.push('      );');
  lines.push('');
  lines.push('      // Check for failures');
  lines.push('      const failures = results.filter(r => r.status === "rejected");');
  lines.push('      if (failures.length > 0) {');
  lines.push('        const err = (failures[0] as PromiseRejectedResult).reason;');
  lines.push('        run.status = "failed";');
  lines.push('        run.error = `Level ${level} failed: ${err.message ?? err}`;');
  lines.push('        run.completedAt = new Date().toISOString();');
  lines.push('        this.emit("run:failed", { runId: run.id, error: run.error });');
  lines.push('        return;');
  lines.push('      }');
  lines.push('');
  lines.push('      // Aggregate outputs for next level');
  lines.push('      const fulfilled = results.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<{ name: string; output: unknown } | undefined>[];');
  lines.push('      levelOutputs = {};');
  lines.push('      for (const r of fulfilled) {');
  lines.push('        if (r.value) {');
  lines.push('          levelOutputs[r.value.name] = r.value.output;');
  lines.push('          levelOutputs[`${r.value.name}.output`] = r.value.output;');
  lines.push('        }');
  lines.push('      }');
  lines.push('');
  lines.push('      // Pause if QC checkpoint hit');
  lines.push('      if (pauseAfterLevel) {');
  lines.push('        run.status = "paused_for_qc";');
  lines.push('        this.emit("run:paused", { runId: run.id, level });');
  lines.push('        return;');
  lines.push('      }');
  lines.push('    }');
  lines.push('');
  lines.push('    // All levels complete');
  lines.push('    run.status = "completed";');
  lines.push('    run.completedAt = new Date().toISOString();');
  lines.push('    this.emit("run:complete", { runId: run.id });');
  lines.push('  }');
  lines.push('');

  // Helper
  lines.push('  private gatherLevelOutputs(run: PipelineRun, level: number): Record<string, unknown> {');
  lines.push('    const outputs: Record<string, unknown> = {};');
  lines.push('    for (const step of run.stepResults) {');
  lines.push('      if (step.level === level) {');
  lines.push('        outputs[step.moduleName] = step.output;');
  lines.push('        outputs[`${step.moduleName}.output`] = step.output;');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return outputs;');
  lines.push('  }');
  lines.push('');
  lines.push('  getRun(runId: string): PipelineRun | undefined { return this.runs.get(runId); }');
  lines.push('  getPipelines(): string[] { return [...this.pipelines.keys()]; }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateOrchestration(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  const hasPipelines = ast.pipelines.length > 0;
  const hasQC = ast.qcs.length > 0;

  if (!hasPipelines && !hasQC) return files;

  const sections: string[] = [
    '// Agicore Generated Orchestration Runtime',
    `// App: ${ast.app.name}`,
    '// Pipeline engine with BFS parallel execution and SPC quality control',
    '',
  ];

  sections.push(generateSPCController(ast.qcs));
  sections.push(generatePipelineEngine(ast.pipelines));

  files.set('src/engine/orchestration-engine.ts', sections.filter(s => s).join('\n'));

  return files;
}
