import type { ReputationDecl } from '../../../parser/src/types.js';

export function generateReputation(decl: ReputationDecl): string {
  const lines: string[] = [];

  lines.push(`// REPUTATION: ${decl.name}`);
  if (decl.description) lines.push(`// ${decl.description}`);
  lines.push('');

  // TypeScript metric types
  lines.push(`export interface ${decl.name}Metrics {`);
  for (const m of decl.metrics) {
    lines.push(`  ${m.name}: ${m.type === 'float' ? 'number' : 'number'};`);
  }
  lines.push('}');
  lines.push('');

  // SPC configuration as const
  lines.push(`export const ${decl.name}Spc = {`);
  lines.push(`  maturingThreshold: ${decl.spc.maturingThreshold},`);
  lines.push(`  matureThreshold: ${decl.spc.matureThreshold},`);
  lines.push(`  requiredConfidence: ${decl.spc.requiredConfidence},`);
  lines.push(`} as const;`);
  lines.push('');

  // Decay configuration
  lines.push(`export const ${decl.name}Decay = {`);
  lines.push(`  enabled: ${decl.decay.enabled},`);
  lines.push(`  halfLife: "${decl.decay.halfLife}",`);
  lines.push(`} as const;`);
  lines.push('');

  // Score record type with lifecycle state
  lines.push(`export type ${decl.name}State = 'new' | 'maturing' | 'mature';`);
  lines.push('');
  lines.push(`export interface ${decl.name}Record {`);
  lines.push(`  identityId: string;`);
  lines.push(`  state: ${decl.name}State;`);
  lines.push(`  sampleCount: number;`);
  lines.push(`  metrics: ${decl.name}Metrics;`);
  lines.push(`  lastUpdated: string;`);
  lines.push(`}`);

  return lines.join('\n');
}
