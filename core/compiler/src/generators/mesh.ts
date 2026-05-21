// MESH codegen — emits TypeScript mesh config + SQL topology/accounting tables
// Activated when ast.meshes.length > 0.

import type { AgiFile, MeshDecl } from '@agicore/parser';

export function generateMesh(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.meshes.length === 0) return files;

  const hasAccounting = ast.meshes.some(m => m.accounting);
  files.set('migrations/mesh.sql', buildMeshSql(hasAccounting));
  files.set('src/lib/mesh.ts', buildMeshTs(ast.meshes, ast));

  return files;
}

// ─── SQL schema ───────────────────────────────────────────────────────────────

function buildMeshSql(hasAccounting: boolean): string {
  const accountingTables = hasAccounting ? `
-- Phase 8.3: cooperative contribution accounting
CREATE TABLE IF NOT EXISTS mesh_contributions (
  id TEXT PRIMARY KEY,
  mesh_name TEXT NOT NULL,
  node_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,  -- 'cpu', 'gpu', 'storage_gb', 'bandwidth_mbps'
  amount REAL NOT NULL,
  direction TEXT NOT NULL DEFAULT 'credit',  -- 'credit' | 'debit'
  recorded_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contrib_mesh_node ON mesh_contributions(mesh_name, node_name);
CREATE INDEX IF NOT EXISTS idx_contrib_recorded ON mesh_contributions(recorded_at);

CREATE VIEW IF NOT EXISTS mesh_contribution_balance AS
SELECT
  mesh_name,
  node_name,
  resource_type,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS total_contributed,
  SUM(CASE WHEN direction = 'debit'  THEN amount ELSE 0 END) AS total_consumed,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) AS net_balance
FROM mesh_contributions
GROUP BY mesh_name, node_name, resource_type;
` : '';

  return `-- MESH: distributed compute mesh topology records
-- @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)
CREATE TABLE IF NOT EXISTS mesh_topology (
  id TEXT PRIMARY KEY,
  mesh_name TEXT NOT NULL,
  node_name TEXT NOT NULL,
  endpoint TEXT,
  capabilities TEXT NOT NULL DEFAULT '[]',
  trust_level REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(mesh_name, node_name)
);
CREATE INDEX IF NOT EXISTS idx_mesh_name ON mesh_topology(mesh_name);
CREATE INDEX IF NOT EXISTS idx_mesh_status ON mesh_topology(status);

CREATE TABLE IF NOT EXISTS mesh_routing_log (
  id TEXT PRIMARY KEY,
  mesh_name TEXT NOT NULL,
  packet_type TEXT NOT NULL,
  source_node TEXT NOT NULL,
  target_node TEXT NOT NULL,
  overflow BOOLEAN NOT NULL DEFAULT 0,
  routed_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_routing_mesh ON mesh_routing_log(mesh_name);
${accountingTables}`;
}

// ─── TypeScript mesh config ───────────────────────────────────────────────────

function buildMeshTs(meshes: MeshDecl[], ast: AgiFile): string {
  const blocks = meshes.map((decl: MeshDecl) => {
    const nodeConfigs = decl.nodes.map((nodeName: string) => {
      const node = ast.nodes.find(n => n.name === nodeName);
      const endpoint = node?.endpoint ? `'${node.endpoint}'` : 'undefined';
      const capabilities = node?.capabilities.length
        ? `[${node.capabilities.map(c => `'${c}'`).join(', ')}]`
        : '[]';
      const trustLevel = node?.trustLevel ?? 1.0;
      const c = node?.contributes;
      const contributesStr = c
        ? `{ cpu: ${c.cpu ?? 0}, gpu: ${c.gpu ?? 0}, storageGb: ${c.storageGb ?? 0}, bandwidthMbps: ${c.bandwidthMbps ?? 0} }`
        : 'undefined';
      return `    {
      name: '${nodeName}',
      endpoint: ${endpoint},
      capabilities: ${capabilities} as const,
      trustLevel: ${trustLevel},
      contributes: ${contributesStr},
    },`;
    }).join('\n');

    const packetList = decl.packets.map((p: string) => `'${p}'`).join(', ');

    const accountingBlock = decl.accounting ? `
/** Record a resource contribution (credit) or consumption (debit) for ${decl.name}. */
export async function ${decl.name[0]!.toLowerCase() + decl.name.slice(1)}RecordContribution(
  nodeName: ${decl.name}NodeName,
  resourceType: 'cpu' | 'gpu' | 'storage_gb' | 'bandwidth_mbps',
  amount: number,
  direction: 'credit' | 'debit' = 'credit',
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('record_mesh_contribution', { meshName: '${decl.name}', nodeName, resourceType, amount, direction });
}

/** Query the net contribution balance for a node in ${decl.name}. */
export async function ${decl.name[0]!.toLowerCase() + decl.name.slice(1)}GetBalance(
  nodeName: ${decl.name}NodeName,
  resourceType: 'cpu' | 'gpu' | 'storage_gb' | 'bandwidth_mbps',
): Promise<{ totalContributed: number; totalConsumed: number; netBalance: number }> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('get_mesh_contribution_balance', { meshName: '${decl.name}', nodeName, resourceType });
}` : '';

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export const ${decl.name}Config = {
  name: '${decl.name}',
  authority: ${decl.authority ? `'${decl.authority}'` : 'undefined'},
  accounting: ${decl.accounting},
  packets: [${packetList}] as const,
  nodes: [
${nodeConfigs}
  ],
} as const;

export type ${decl.name}PacketType = ${decl.packets.length ? decl.packets.map((p: string) => `'${p}'`).join(' | ') : 'never'};

export type ${decl.name}NodeName = ${decl.nodes.length ? decl.nodes.map((n: string) => `'${n}'`).join(' | ') : 'never'};

export function ${decl.name[0]!.toLowerCase() + decl.name.slice(1)}Route(
  packetType: ${decl.name}PacketType,
  preferredNode?: ${decl.name}NodeName,
): typeof ${decl.name}Config.nodes[number] | undefined {
  const nodes = [...${decl.name}Config.nodes].sort((a, b) => b.trustLevel - a.trustLevel);
  if (preferredNode) {
    const preferred = nodes.find(n => n.name === preferredNode);
    if (preferred) return preferred;
  }
  return nodes.find(n => n.capabilities.includes(packetType as string)) ?? nodes[0];
}
${accountingBlock}`;
  }).join('\n\n');

  return `// MESH — distributed compute mesh configs and routing helpers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

${blocks}
`;
}
