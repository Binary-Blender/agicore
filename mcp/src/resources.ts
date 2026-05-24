// MCP resources — documents the assistant can fetch by URI.
//
// Resolved at runtime via repo-relative paths. The mcp/ package lives at the
// repo root, so going up two dirs from dist/ lands at the repo root reliably.
//
// If you publish this package standalone (no agicore checkout alongside),
// override AGICORE_REPO_PATH to point at a clone.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

function repoRoot(): string {
  // Honour the env-var escape hatch first.
  const fromEnv = process.env.AGICORE_REPO_PATH;
  if (fromEnv && existsSync(resolve(fromEnv, 'README.md'))) return fromEnv;
  // Default: mcp/dist/<file>.js → ../../ from this file lands at repo root.
  return resolve(__dirname, '..', '..');
}

export interface ResourceRecord {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  /** Relative path from the repo root. */
  path: string;
}

export const RESOURCES: ResourceRecord[] = [
  {
    uri:         'agicore://readme',
    name:        'Agicore README',
    description: 'Main project README — pitch, principles, architecture, evolutionary lineage, project archetypes.',
    mimeType:    'text/markdown',
    path:        'README.md',
  },
  {
    uri:         'agicore://andon-loop',
    name:        'Andon Loop architecture',
    description: 'Full architecture document for the Andon Loop — the continual-harness inversion. Read this for the load-bearing claims and 17-phase capability map.',
    mimeType:    'text/markdown',
    path:        'ANDON_LOOP.md',
  },
  {
    uri:         'agicore://example/hoc-source',
    name:        'HOC (Home Operations Center) .agi source',
    description: '436-line .agi file showing the Andon Loop in production for home network monitoring. The reference example for what an Andon Loop application looks like end-to-end.',
    mimeType:    'text/plain',
    path:        'apps/hoc/hoc.agi',
  },
  {
    uri:         'agicore://example/hoc-readme',
    name:        'HOC README',
    description: 'HOC project documentation — what it does, how to compile, how to fill in action stubs.',
    mimeType:    'text/markdown',
    path:        'apps/hoc/README.md',
  },
  {
    uri:         'agicore://example/hoc-ha-integration',
    name:        'HOC Home Assistant integration guide',
    description: 'MQTT setup, broker config, HA automation YAML, the canonical publish_andon_mqtt implementation — the integration playbook for the andon-light pattern.',
    mimeType:    'text/markdown',
    path:        'apps/hoc/HA_INTEGRATION.md',
  },
  {
    uri:         'agicore://philosophy',
    name:        'Agicore philosophy',
    description: 'Architectural philosophy doc — the design principles behind the platform.',
    mimeType:    'text/markdown',
    path:        'PHILOSOPHY.md',
  },
  {
    uri:         'agicore://build-with-ai',
    name:        'Builder\'s guide',
    description: 'Start here when building an app with Agicore. Tutorial-style walkthrough.',
    mimeType:    'text/markdown',
    path:        'BUILD_WITH_AI.md',
  },
  {
    uri:         'agicore://coding-standards',
    name:        'Coding standards',
    description: 'Naming conventions, generated structure, anti-patterns. Read this before drafting a .agi.',
    mimeType:    'text/markdown',
    path:        'CODING_STANDARDS.md',
  },
];

export function readResource(uri: string): { mimeType: string; text: string } | null {
  const record = RESOURCES.find((r) => r.uri === uri);
  if (!record) return null;
  const full = resolve(repoRoot(), record.path);
  if (!existsSync(full)) {
    return {
      mimeType: record.mimeType,
      text:     `[resource file not found at ${record.path}; set AGICORE_REPO_PATH if you've moved the agicore checkout]`,
    };
  }
  return {
    mimeType: record.mimeType,
    text:     readFileSync(full, 'utf-8'),
  };
}
