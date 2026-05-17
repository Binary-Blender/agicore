// NBVE codegen stub — emits a TypeScript config object with SPC thresholds

import type { NbveDecl } from '@agicore/parser';

export function generateNbve(decl: NbveDecl): string {
  const metricsList = decl.metrics.map(m => `'${m}'`).join(', ');

  return `// @agicore-generated — DO NOT EDIT

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
`;
}
