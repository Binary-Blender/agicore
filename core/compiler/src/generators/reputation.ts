// REPUTATION codegen — emits SQL migration and TypeScript tracker classes

import type { AgiFile, ReputationDecl } from '@agicore/parser';

export function generateReputation(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.reputations.length === 0) return files;

  files.set('migrations/reputation.sql', buildReputationSql());
  files.set('src/lib/reputation.ts', buildReputationTs(ast.reputations));

  return files;
}

// ─── SQL migration ────────────────────────────────────────────────────────────

function buildReputationSql(): string {
  return `-- REPUTATION SCORES: SPC-gated identity reputation tracking
-- @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
CREATE TABLE IF NOT EXISTS reputation_scores (
  id TEXT PRIMARY KEY,
  reputation_name TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'new',
  sample_count INTEGER NOT NULL DEFAULT 0,
  metrics TEXT NOT NULL DEFAULT '{}',
  last_updated TEXT DEFAULT (datetime('now')),
  UNIQUE(reputation_name, identity_id)
);
CREATE INDEX IF NOT EXISTS idx_reputation_name ON reputation_scores(reputation_name);
CREATE INDEX IF NOT EXISTS idx_reputation_identity ON reputation_scores(identity_id);
CREATE INDEX IF NOT EXISTS idx_reputation_state ON reputation_scores(state);
`;
}

// ─── TypeScript tracker ───────────────────────────────────────────────────────

function buildReputationTs(reputations: ReputationDecl[]): string {
  const blocks = reputations.map(decl => {
    const metricFields = decl.metrics
      .map(m => `  ${m.name}: ${m.type === 'float' ? 'number' : 'number'};`)
      .join('\n');

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export interface ${decl.name}Metrics {
${metricFields}
}

export const ${decl.name}Spc = {
  maturingThreshold: ${decl.spc.maturingThreshold},
  matureThreshold: ${decl.spc.matureThreshold},
  requiredConfidence: ${decl.spc.requiredConfidence},
} as const;

export const ${decl.name}Decay = {
  enabled: ${decl.decay.enabled},
  halfLife: '${decl.decay.halfLife}',
} as const;

export type ${decl.name}State = 'new' | 'maturing' | 'mature';

export interface ${decl.name}Record {
  identityId: string;
  state: ${decl.name}State;
  sampleCount: number;
  metrics: ${decl.name}Metrics;
  lastUpdated: string;
}

export class ${decl.name}Tracker {
  private samples: ${decl.name}Metrics[] = [];

  addSample(metrics: ${decl.name}Metrics): void {
    this.samples.push(metrics);
  }

  getState(): ${decl.name}State {
    const n = this.samples.length;
    if (n >= ${decl.spc.matureThreshold}) return 'mature';
    if (n >= ${decl.spc.maturingThreshold}) return 'maturing';
    return 'new';
  }

  isEligibleForDecay(lastUpdated: string): boolean {
    if (!${decl.name}Decay.enabled) return false;
    const halfLifeMs = parseHalfLife('${decl.decay.halfLife}');
    return Date.now() - new Date(lastUpdated).getTime() > halfLifeMs;
  }
}`;
  }).join('\n\n');

  return `// REPUTATION — SPC-gated identity reputation trackers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

function parseHalfLife(hl: string): number {
  const match = hl.match(/^(\\d+)(d|h|m)$/);
  if (!match) return Infinity;
  const n = parseInt(match[1]!, 10);
  const unit = match[2]!;
  if (unit === 'd') return n * 86_400_000;
  if (unit === 'h') return n * 3_600_000;
  return n * 60_000;
}

${blocks}
`;
}
