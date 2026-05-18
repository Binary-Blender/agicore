// NBVE codegen — emits TypeScript shadow runner with SPC-gated model promotion

import type { AgiFile, NbveDecl } from '@agicore/parser';

export function generateNbve(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.nbves.length === 0) return files;

  files.set('src/lib/nbve.ts', buildNbveTs(ast.nbves));

  return files;
}

// ─── TypeScript NBVE library ──────────────────────────────────────────────────

function buildNbveTs(nbves: NbveDecl[]): string {
  const blocks = nbves.map(decl => {
    const metricsList = decl.metrics.map(m => `'${m}'`).join(', ');

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export const ${decl.name}Config = {
  production: '${decl.production}',
  shadow: '${decl.shadow}',
  spc: {
    window: ${decl.spc.window},
    confidence: ${decl.spc.confidence},
    accuracyThreshold: ${decl.spc.accuracyThreshold},
    stabilityThreshold: ${decl.spc.stabilityThreshold},
    defectRateMax: ${decl.spc.defectRateMax},
  },
  metrics: [${metricsList}],
  promotion: '${decl.promotion}',
  fallback: '${decl.fallback}',
} as const;

export type ${decl.name}Config = typeof ${decl.name}Config;

export class ${decl.name}ShadowRunner {
  private window: ShadowMetrics[] = [];
  private promoted = false;

  constructor(
    private readonly invokeAi: (model: string, messages: any[]) => Promise<string>
  ) {}

  async run(messages: any[]): Promise<{ production: string; shadow: string; metrics: ShadowMetrics }> {
    const t0 = Date.now();
    const [production, shadow] = await Promise.all([
      this.invokeAi(${decl.name}Config.production, messages),
      this.invokeAi(${decl.name}Config.shadow, messages),
    ]);
    const latencyMs = Date.now() - t0;
    const metrics: ShadowMetrics = {
      semanticAccuracy: 0,
      workflowStability: 0,
      humanAcceptanceRate: 0,
      tokenCost: 0,
      latencyMs,
    };
    this.recordResult(metrics);
    return { production, shadow, metrics };
  }

  recordResult(metrics: ShadowMetrics): void {
    this.window.push(metrics);
    if (this.window.length > ${decl.name}Config.spc.window) {
      this.window.shift();
    }
  }

  isReadyForPromotion(): boolean {
    if (this.window.length < ${decl.name}Config.spc.window) return false;
    const n = this.window.length;
    const avgAccuracy = this.window.reduce((s, m) => s + m.semanticAccuracy, 0) / n;
    const avgStability = this.window.reduce((s, m) => s + m.workflowStability, 0) / n;
    const defectRate = this.window.filter(m => m.humanAcceptanceRate < 0.5).length / n;
    if (
      avgAccuracy >= ${decl.name}Config.spc.accuracyThreshold &&
      avgStability >= ${decl.name}Config.spc.stabilityThreshold &&
      defectRate <= ${decl.name}Config.spc.defectRateMax
    ) {
      if ('${decl.promotion}' === 'auto') this.promoted = true;
      return true;
    }
    return false;
  }

  getActiveModel(): string {
    return this.promoted
      ? ${decl.name}Config.shadow
      : ${decl.name}Config.production;
  }
}`;
  }).join('\n\n');

  return `// NBVE — shadow runner classes with SPC-gated model promotion
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

export interface ShadowMetrics {
  semanticAccuracy: number;
  workflowStability: number;
  humanAcceptanceRate: number;
  tokenCost: number;
  latencyMs: number;
}

${blocks}
`;
}
