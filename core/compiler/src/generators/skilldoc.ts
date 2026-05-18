// SKILLDOC Code Generator
// Generates governed cognition infrastructure artifacts from SKILLDOC declarations.
//
// Three outputs per app with SKILLDOC declarations:
//   scaffold/skilldocs/<name>.md   — deployable skill doc as signed markdown
//   scaffold/skilldocs/<name>.json — machine-readable governance manifest
//   src/lib/skilldocs.ts           — TypeScript registry with governance metadata
//
// SKILLDOC governance model:
//   SIGNED_BY  — authority that signed this skill doc (cryptographic identity)
//   REQUIRE    — clearance levels required to use
//   EXECUTE_ONLY — constrain which operations are permitted
//   DISALLOW   — explicit operation deny list
//   AUDIT      — audit verbosity: none | errors | all_access | all_actions
//   compression — semantic density / intent preservation targets
//
// Activated when ast.skilldocs.length > 0.

import type { AgiFile, SkillDocDecl, SkillDocGovernance, SkillDocCompression } from '@agicore/parser';

// ── Markdown skill doc ────────────────────────────────────────────────────────

function generateSkillDocMarkdown(sd: SkillDocDecl): string {
  const gov = sd.governance;
  const comp = sd.compression;
  const now = new Date().toISOString().split('T')[0];

  const frontmatter: string[] = [
    '---',
    `name: ${sd.name}`,
    `version: ${sd.version ?? '1.0.0'}`,
    `domain: ${sd.domain ?? 'general'}`,
    `priority: ${sd.priority}`,
    `generated: ${now}`,
  ];

  if (gov?.signedBy) frontmatter.push(`signed_by: ${gov.signedBy}`);
  if (gov && gov.require.length > 0) frontmatter.push(`require: [${gov.require.join(', ')}]`);
  if (gov && gov.audit !== 'none') frontmatter.push(`audit: ${gov.audit}`);
  if (sd.keywords.length > 0) frontmatter.push(`keywords: [${sd.keywords.join(', ')}]`);

  frontmatter.push('---', '');

  const sections: string[] = [
    ...frontmatter,
    `# ${sd.name}`,
    '',
    `> ${sd.description}`,
    '',
  ];

  if (sd.content) {
    sections.push(sd.content, '');
  } else {
    sections.push(
      `<!-- Fill in the operational content for this skill doc. -->`,
      `<!-- This file is deployed with your application as a governed cognition artifact. -->`,
      '',
    );
  }

  if (gov) {
    sections.push('## Governance', '');
    if (gov.signedBy) sections.push(`**Signed by:** ${gov.signedBy}  `);
    if (gov.require.length > 0) sections.push(`**Requires clearance:** ${gov.require.join(', ')}  `);
    if (gov.executeOnly.length > 0) sections.push(`**Execute-only operations:** ${gov.executeOnly.join(', ')}  `);
    if (gov.disallow.length > 0) sections.push(`**Disallowed:** ${gov.disallow.join(', ')}  `);
    sections.push(`**Audit level:** ${gov.audit}`, '');
  }

  if (comp) {
    sections.push('## Compression Targets', '');
    if (comp.semanticDensity !== undefined) sections.push(`- Semantic density: ${comp.semanticDensity}`);
    if (comp.intentPreservation !== undefined) sections.push(`- Intent preservation: ${comp.intentPreservation}`);
    if (comp.tokenEfficiency !== undefined) sections.push(`- Token efficiency: ${comp.tokenEfficiency}`);
    sections.push('');
  }

  return sections.join('\n');
}

// ── Governance manifest JSON ──────────────────────────────────────────────────

function generateGovernanceManifest(sd: SkillDocDecl): string {
  const gov = sd.governance;
  const comp = sd.compression;

  const manifest: Record<string, unknown> = {
    name: sd.name,
    version: sd.version ?? '1.0.0',
    domain: sd.domain ?? 'general',
    description: sd.description,
    keywords: sd.keywords,
    priority: sd.priority,
    generated: new Date().toISOString().split('T')[0],
  };

  if (gov) {
    manifest.governance = {
      signedBy: gov.signedBy ?? null,
      require: gov.require,
      executeOnly: gov.executeOnly,
      disallow: gov.disallow,
      audit: gov.audit,
    };
  }

  if (comp) {
    manifest.compression = {
      semanticDensity: comp.semanticDensity ?? null,
      intentPreservation: comp.intentPreservation ?? null,
      tokenEfficiency: comp.tokenEfficiency ?? null,
    };
  }

  return JSON.stringify(manifest, null, 2);
}

// ── TypeScript registry ────────────────────────────────────────────────────────

function govToTs(gov: SkillDocGovernance | undefined): string {
  if (!gov) return 'undefined';
  return `{
    signedBy: ${gov.signedBy ? `'${gov.signedBy}'` : 'undefined'},
    require: ${JSON.stringify(gov.require)},
    executeOnly: ${JSON.stringify(gov.executeOnly)},
    disallow: ${JSON.stringify(gov.disallow)},
    audit: '${gov.audit}',
  }`;
}

function compToTs(comp: SkillDocCompression | undefined): string {
  if (!comp) return 'undefined';
  return `{
    semanticDensity: ${comp.semanticDensity ?? 'undefined'},
    intentPreservation: ${comp.intentPreservation ?? 'undefined'},
    tokenEfficiency: ${comp.tokenEfficiency ?? 'undefined'},
  }`;
}

function generateSkillDocTs(skilldocs: SkillDocDecl[]): string {
  const entries = skilldocs.map(sd => `  {
    name: '${sd.name}',
    version: '${sd.version ?? '1.0.0'}',
    domain: '${sd.domain ?? 'general'}',
    description: ${JSON.stringify(sd.description)},
    keywords: ${JSON.stringify(sd.keywords)},
    priority: ${sd.priority},
    governance: ${govToTs(sd.governance)},
    compression: ${compToTs(sd.compression)},
  },`).join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Governed skill doc registry: deployable cognition infrastructure artifacts.
// Each entry corresponds to a SKILLDOC declaration and a scaffold/skilldocs/<name>.md file.

export type AuditLevel = 'none' | 'errors' | 'all_access' | 'all_actions';

export interface SkillDocGovernance {
  signedBy?: string;
  require: string[];
  executeOnly: string[];
  disallow: string[];
  audit: AuditLevel;
}

export interface SkillDocCompression {
  semanticDensity?: number;
  intentPreservation?: number;
  tokenEfficiency?: number;
}

export interface SkillDocDef {
  name: string;
  version: string;
  domain: string;
  description: string;
  keywords: string[];
  priority: number;
  governance?: SkillDocGovernance;
  compression?: SkillDocCompression;
}

export const SKILLDOC_REGISTRY: SkillDocDef[] = [
${entries}
];

/** All declared skill doc names as a union type */
export type SkillDocName = ${skilldocs.map(sd => `'${sd.name}'`).join(' | ') || 'never'};

/**
 * Return skill docs whose keywords appear in the user message.
 * Governance-aware: filters out docs whose require[] clearance is not granted.
 */
export function matchSkillDocs(
  userMessage: string,
  grantedClearance: string[] = [],
): SkillDocDef[] {
  const lower = userMessage.toLowerCase();
  return SKILLDOC_REGISTRY
    .filter(sd => {
      const keywordMatch = sd.keywords.some(kw => lower.includes(kw.toLowerCase()));
      if (!keywordMatch) return false;
      if (!sd.governance?.require || sd.governance.require.length === 0) return true;
      return sd.governance.require.every(req => grantedClearance.includes(req));
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Build a governance-aware context prefix for injection into a system prompt.
 * Respects executeOnly and disallow constraints in the returned context string.
 */
export function buildSkillDocContext(
  userMessage: string,
  grantedClearance: string[] = [],
): string {
  const matched = matchSkillDocs(userMessage, grantedClearance);
  if (matched.length === 0) return '';

  const lines = matched.map(sd => {
    const parts = [\`[SKILL DOC: \${sd.name} v\${sd.version} | \${sd.domain.toUpperCase()}]\`];
    parts.push(\`  \${sd.description}\`);
    if (sd.governance?.executeOnly && sd.governance.executeOnly.length > 0) {
      parts.push(\`  Permitted operations: \${sd.governance.executeOnly.join(', ')}\`);
    }
    if (sd.governance?.disallow && sd.governance.disallow.length > 0) {
      parts.push(\`  Disallowed: \${sd.governance.disallow.join(', ')}\`);
    }
    return parts.join('\\n');
  });

  return lines.join('\\n\\n') + '\\n\\n';
}

/**
 * Check whether a given operation is permitted under a skill doc's governance.
 * Returns true if allowed (no constraints, or in executeOnly), false if disallowed.
 */
export function isOperationPermitted(
  skillDocName: SkillDocName,
  operation: string,
): boolean {
  const sd = SKILLDOC_REGISTRY.find(s => s.name === skillDocName);
  if (!sd?.governance) return true;
  if (sd.governance.disallow.includes(operation)) return false;
  if (sd.governance.executeOnly.length > 0) {
    return sd.governance.executeOnly.includes(operation);
  }
  return true;
}

/** Return all distinct domains covered by declared skill docs */
export function skillDocDomains(): string[] {
  return [...new Set(SKILLDOC_REGISTRY.map(sd => sd.domain))];
}
`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function generateSkillDoc(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.skilldocs.length === 0) return files;

  // Per-SKILLDOC markdown + governance manifest
  for (const sd of ast.skilldocs) {
    files.set(`scaffold/skilldocs/${sd.name}.md`, generateSkillDocMarkdown(sd));
    files.set(`scaffold/skilldocs/${sd.name}.json`, generateGovernanceManifest(sd));
  }

  // Shared TypeScript registry
  files.set('src/lib/skilldocs.ts', generateSkillDocTs(ast.skilldocs));

  return files;
}
