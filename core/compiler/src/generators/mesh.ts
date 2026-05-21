// MESH codegen — emits TypeScript mesh config + SQL topology table
// Activated when ast.meshes.length > 0.

import type { AgiFile, MeshDecl } from '@agicore/parser';

export function generateMesh(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.meshes.length === 0) return files;

  files.set('migrations/mesh.sql', buildMeshSql());
  files.set('src/lib/mesh.ts', buildMeshTs(ast.meshes, ast));

  return files;
}

// ─── SQL schema ───────────────────────────────────────────────────────────────

function buildMeshSql(): string {
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
`;
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
      return `    {
      name: '${nodeName}',
      endpoint: ${endpoint},
      capabilities: ${capabilities} as const,
      trustLevel: ${trustLevel},
    },`;
    }).join('\n');

    const packetList = decl.packets.map((p: string) => `'${p}'`).join(', ');

    return `// ─── ${decl.name} ─────────────────────────────────────────────────────────────
// ${decl.description}

export const ${decl.name}Config = {
  name: '${decl.name}',
  authority: ${decl.authority ? `'${decl.authority}'` : 'undefined'},
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
}`;
  }).join('\n\n');

  return `// MESH — distributed compute mesh configs and routing helpers
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

${blocks}
`;
}
