import type { DisputeDecl } from '../../../parser/src/types.js';

export function generateDispute(decl: DisputeDecl): string {
  const lines: string[] = [];

  lines.push(`// DISPUTE: ${decl.name}`);
  if (decl.description) lines.push(`// ${decl.description}`);
  lines.push('');

  // State union type
  const stateUnion = decl.states.map(s => `'${s}'`).join(' | ');
  lines.push(`export type ${decl.name}State = ${stateUnion};`);
  lines.push('');

  // Resolution union type
  const resolutionUnion = decl.resolutions.map(r => `'${r}'`).join(' | ');
  lines.push(`export type ${decl.name}Resolution = ${resolutionUnion};`);
  lines.push('');

  // Dispute record
  lines.push(`export interface ${decl.name}Record {`);
  lines.push(`  id: string;`);
  lines.push(`  contractId: string;`);
  lines.push(`  state: ${decl.name}State;`);
  lines.push(`  resolution: ${decl.name}Resolution | null;`);
  lines.push(`  openedAt: string;`);
  lines.push(`  resolvedAt: string | null;`);
  lines.push(`  notes: string;`);
  lines.push('}');
  lines.push('');

  // State machine transitions (allowed progression)
  lines.push(`export const ${decl.name}Transitions: Record<${decl.name}State, ${decl.name}State[]> = {`);
  for (let i = 0; i < decl.states.length; i++) {
    const state = decl.states[i]!;
    const next = decl.states.slice(i + 1, i + 2);
    lines.push(`  ${state}: [${next.map(s => `'${s}'`).join(', ')}],`);
  }
  // Last state has no transitions
  lines.push(`};`);
  lines.push('');

  // Contract reference
  lines.push(`// Linked contract: ${decl.contract}`);
  lines.push(`export const ${decl.name}ContractRef = '${decl.contract}';`);

  return lines.join('\n');
}
