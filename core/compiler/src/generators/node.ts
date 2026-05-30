// NODE + SENSOR + ZONE Code Generator
// Generates TypeScript interfaces and Rust types for all hardware declarations.
// Also generates a device dashboard component stub (protected).
// Activated when ast.nodes.length > 0 or ast.sensors.length > 0.

import type { AgiFile, NodeDecl, SensorDecl, ZoneDecl } from '@agicore/parser';

// ── TypeScript types ───────────────────────────────────────────────────────────

function generateNodeTypes(nodes: NodeDecl[], sensors: SensorDecl[], zones: ZoneDecl[]): string {
  const sensorInterfaces = sensors.map(s => `
export interface ${pascalCase(s.name)}Reading {
  nodeId: string;
  sensorName: string;  // '${s.name}'
  type: '${s.type}';
  value: unknown;       // shape depends on sensor type
  latencyMs: number;   // expected: ${s.latency}
  accuracy: number;    // expected: ${s.accuracy}
  timestamp: string;
}`).join('\n');

  const nodeInterfaces = nodes.map(n => {
    const c = n.contributes;
    const contributesType = c
      ? `{ cpu: ${c.cpu ?? 0}; gpu: ${c.gpu ?? 0}; storageGb: ${c.storageGb ?? 0}; bandwidthMbps: ${c.bandwidthMbps ?? 0} }`
      : 'undefined';
    return `
export interface ${pascalCase(n.name)}State {
  nodeId: string;      // matches NODE name '${n.name}'
  hardware: string;    // '${n.hardware}'
  aiTier: '${n.aiTier}';
  online: boolean;
  offline: ${n.offline};
  safetyLevel: '${n.safety}';
  lastSeen: string;
  sensors: Record<string, unknown>;
  // Phase 8: network participation
  endpoint: ${n.endpoint ? `'${n.endpoint}'` : 'undefined'};
  capabilities: ${n.capabilities.length ? `[${n.capabilities.map(c => `'${c}'`).join(', ')}]` : '[]'};
  trustLevel: ${n.trustLevel};
  // Phase 8.3: cooperative contributions
  contributes: ${contributesType};
}`;
  }).join('\n');

  const zoneInterfaces = zones.map(z => `
export interface ${pascalCase(z.name)}Zone {
  zoneName: string;    // '${z.name}'
  nodes: string[];     // ${JSON.stringify(z.nodes)}
  ambient: ${z.ambient};
  ${z.capacity ? `capacity: ${z.capacity};` : '// capacity: not set'}
}`).join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Hardware node, sensor, and zone TypeScript interfaces.

${sensorInterfaces}

${nodeInterfaces}

${zoneInterfaces}

/** All declared node names */
export type NodeName = ${nodes.map(n => `'${n.name}'`).join(' | ') || 'never'};

/** All declared sensor types */
export type SensorName = ${sensors.map(s => `'${s.name}'`).join(' | ') || 'never'};

/** All declared zone names */
export type ZoneName = ${zones.map(z => `'${z.name}'`).join(' | ') || 'never'};
`;
}

// ── Rust types ─────────────────────────────────────────────────────────────────

function generateNodeRs(nodes: NodeDecl[], sensors: SensorDecl[]): string {
  const sensorStructs = sensors.map(s => `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ${pascalRust(s.name)}Reading {
  pub node_id: String,
  pub sensor_name: String,
  pub value_json: String,  // JSON-serialized reading
  pub timestamp: String,
}`).join('\n');

  const nodeStructs = nodes.map(n => `
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ${pascalRust(n.name)}State {
  pub node_id: String,
  pub online: bool,
  pub last_seen: String,
  pub sensors: std::collections::HashMap<String, serde_json::Value>,
  pub endpoint: Option<String>,
  pub capabilities: Vec<String>,
  pub trust_level: f64,
}`).join('\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Hardware node and sensor Rust types.

${sensorStructs}

${nodeStructs}
`;
}

// ── Dashboard component (protected) ──────────────────────────────────────────

function generateDashboard(nodes: NodeDecl[], zones: ZoneDecl[]): string {
  const nodeCards = nodes.map(n => `
        {/* ${n.name}: ${n.description} — ${n.hardware} (${n.aiTier}) */}
        <div className="border rounded p-4">
          <h3 className="font-semibold">${n.name}</h3>
          <p className="text-sm text-gray-500">${n.hardware} · ${n.aiTier}</p>
          <div className="mt-2 text-xs">Safety: ${n.safety} · Offline: ${n.offline}</div>
        </div>`).join('\n');

  const zoneCards = zones.map(z => `
        {/* Zone ${z.name}: ${z.description} */}
        <div className="border rounded p-3 bg-blue-50">
          <h4 className="font-medium">${z.name}</h4>
          <p className="text-xs text-gray-400">${z.nodes.join(', ')}</p>
        </div>`).join('\n');

  return `// @agicore-protected
// Agicore Generated — customize this component freely.
// Hardware node and zone monitoring dashboard.

export default function DeviceDashboard() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Devices</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${nodeCards}
      </div>

      ${zones.length > 0 ? `<h2 className="text-xl font-bold">Zones</h2>
      <div className="flex flex-wrap gap-3">
        ${zoneCards}
      </div>` : ''}
    </div>
  );
}
`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function generateNode(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  const { nodes, sensors, zones } = ast;
  if (nodes.length === 0 && sensors.length === 0 && zones.length === 0) return files;

  files.set('src/types/hardware.ts', generateNodeTypes(nodes, sensors, zones));
  files.set('src-tauri/src/embedded/node_types.rs', generateNodeRs(nodes, sensors));
  if (nodes.length > 0) {
    files.set('src/components/DeviceDashboard.tsx', generateDashboard(nodes, zones));
  }
  return files;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pascalCase(s: string): string {
  return s.replace(/[_-](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (c: string) => c.toUpperCase());
}

function pascalRust(s: string): string {
  return s.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}
