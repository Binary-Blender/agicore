// The 58 DSL declaration types, grouped by layer. Mirrors the catalog in the
// main README. Used by the list_dsl_declarations tool so an assistant can
// enumerate primitives before drafting a .agi for a new domain.

export interface DslLayer {
  layer: string;
  declarations: { name: string; short: string }[];
}

export const DSL_CATALOG: DslLayer[] = [
  {
    layer: 'Application',
    declarations: [
      { name: 'APP',          short: 'App-wide config: title, window, DB path, telemetry, tray, hotkey.' },
      { name: 'ENTITY',       short: 'Database-backed type. Generates SQL table, CRUD, TS bindings, React forms.' },
      { name: 'ACTION',       short: 'Typed Tauri command with INPUT/OUTPUT. User fills in body in Rust.' },
      { name: 'VIEW',         short: 'React UI scaffolds for an ENTITY: list, form, detail.' },
      { name: 'AI_SERVICE',   short: 'Multi-provider AI dispatch (Anthropic, OpenAI, Google, xAI) with streaming.' },
      { name: 'TEST',         short: 'GIVEN/EXPECT integration tests against generated Rust.' },
      { name: 'PREFERENCE',   short: 'User-settable preference key with type + default.' },
    ],
  },
  {
    layer: 'Orchestration',
    declarations: [
      { name: 'WORKFLOW',     short: 'Multi-step orchestration with ANDON_ON, TIMEOUT, ROLLBACK_BOUNDARY, COMPENSATING_ACTION.' },
      { name: 'PIPELINE',     short: 'BFS-parallel pipeline with SPC sampling.' },
      { name: 'QC',           short: 'Quality control gate — validates outputs against rules.' },
      { name: 'VAULT',        short: 'Shared cross-app asset storage (signed/audited).' },
      { name: 'STAGES',       short: 'Named lifecycle stages with transition conditions.' },
    ],
  },
  {
    layer: 'Expert System',
    declarations: [
      { name: 'RULE',         short: 'WHEN/AND/THEN classification rule. PRIORITY + MUTATION_TIER.' },
      { name: 'FACT',         short: 'Working-memory fact with typed fields.' },
      { name: 'STATE',        short: 'State machine with enter/exit hooks and transition guards.' },
      { name: 'PATTERN',      short: 'Regex/template pattern matcher with response payloads.' },
      { name: 'SCORE',        short: 'Certainty score with named thresholds.' },
      { name: 'MODULE',       short: 'Composable engine grouping. EXPECTS_MATCH + MUTATION_POLICY binding.' },
    ],
  },
  {
    layer: 'Cooperative Intelligence',
    declarations: [
      { name: 'ROUTER',           short: 'Multi-tier model routing with per-tier circuit breakers.' },
      { name: 'SKILL',            short: 'Named capability with input/output contract.' },
      { name: 'SKILLDOC',         short: 'Governance-bound skill document (signed, clearance-checked).' },
      { name: 'REASONER',         short: 'Scheduled AI analysis loop (hourly/daily/weekly).' },
      { name: 'TRIGGER',          short: 'Reactive event binding from CHANNEL/PACKET to WORKFLOW/REASONER.' },
      { name: 'LIFECYCLE',        short: 'Escalation rules over the lifetime of a session.' },
      { name: 'BREED',            short: 'Variant generation with fitness function.' },
      { name: 'COGNITION_ROLE',   short: 'Named cognitive role with SPC floor + promotion policy.' },
      { name: 'ESCALATION_CHAIN', short: 'Dynamic model escalation with stability windows.' },
      { name: 'QC_MESH',          short: 'Distributed QC consensus with on-fail handler.' },
    ],
  },
  {
    layer: 'Semantic Infrastructure',
    declarations: [
      { name: 'PACKET',     short: 'Typed message payload with PAYLOAD field types.' },
      { name: 'AUTHORITY',  short: 'Identity authority with trust-claim issuance.' },
      { name: 'CHANNEL',    short: 'SQLite-backed message queue with PROTOCOL/DIRECTION/PACKET.' },
      { name: 'IDENTITY',   short: 'Cryptographic identity with profile fields and signing.' },
      { name: 'FEED',       short: 'Subscription-based content delivery with mode selection.' },
    ],
  },
  {
    layer: 'Adaptive Intelligence',
    declarations: [
      { name: 'EVENT',         short: 'Typed system event with PAYLOAD.' },
      { name: 'NBVE',          short: 'No-Blind-Version-Elevation: shadow-mode model evaluation with SPC gates.' },
      { name: 'CONTRACT',      short: 'Multi-party contract with terms, deliverables, payment, governance.' },
      { name: 'REPUTATION',    short: 'Reputation metric with SPC + decay.' },
      { name: 'SUBSCRIPTION',  short: 'Subscription with terms and payment cadence.' },
      { name: 'DISPUTE',       short: 'Dispute resolution workflow with transitions.' },
    ],
  },
  {
    layer: 'Semantic Operating Environment',
    declarations: [
      { name: 'SESSION',    short: 'AI session with tools, context, memory, output modes.' },
      { name: 'COMPILER',   short: 'Semantic transition ("Send To") between SESSION and ENTITY/SESSION.' },
    ],
  },
  {
    layer: 'Ambient + Embedded',
    declarations: [
      { name: 'NODE',         short: 'Robotics/IoT compute node with AI tier + safety level.' },
      { name: 'SENSOR',       short: 'Physical sensor with sampling rate and type.' },
      { name: 'ZONE',         short: 'Spatial zone for ambient computing.' },
      { name: 'MESH',         short: 'Multi-node mesh topology.' },
      { name: 'ACTUATOR',     short: 'Physical actuator with type and control protocol.' },
      { name: 'PLATFORM',     short: 'Hardware platform (chip, board) with capability declaration.' },
      { name: 'NULLCLAW',     short: 'Agent runtime with tool bindings, providers, and safety.' },
      { name: 'BRAIN_BODY',   short: 'Cognition-to-actuator binding for embodied AI.' },
    ],
  },
  {
    layer: 'Deployment',
    declarations: [
      { name: 'TARGET',  short: 'Build target (Tauri desktop, Axum web, Docker).' },
      { name: 'AUTH',    short: 'Authentication strategy.' },
      { name: 'TENANT',  short: 'Multi-tenant model with isolation strategy.' },
    ],
  },
  {
    layer: 'Primitives',
    declarations: [
      { name: 'MACRO',          short: 'Reusable parameterized snippet.' },
      { name: 'MACRO_REGISTRY', short: 'Cross-app macro exposure.' },
      { name: 'LOG',            short: 'File-based Rust logger with level + target.' },
      { name: 'THEME',          short: 'UI theme: palette, density, motif, radius.' },
      { name: 'SEED',           short: 'Initial database row(s) for an ENTITY.' },
      { name: 'TYPE',           short: 'Type alias for reuse across declarations.' },
    ],
  },
  // Phase 11 additions: MUTATION_POLICY is the gateway to the entire
  // Andon Loop substrate (mutations, sandbox, ledger, responder, improver,
  // approvals, shadow_eval, MutationConsole). Surfaced separately because
  // it's the load-bearing declaration for everything in ANDON_LOOP.md.
  {
    layer: 'Andon Loop (Phase 11)',
    declarations: [
      { name: 'MUTATION_POLICY', short: 'Andon Loop gateway: declares which AI-proposed mutations are allowed at which tier, with REGRESSION_SUITE, NBVE_WINDOW, AUTO_DEPLOY, APPROVAL_AUTHORITY (single / N-of-N / ORDERED), ANDON_RESPONDER, IMPROVEMENT_REASONER, LEDGER. Single declaration unlocks ~9,700 LOC of substrate — see ANDON_LOOP.md.' },
    ],
  },
];

export function dslLayerNames(): string[] {
  return DSL_CATALOG.map((l) => l.layer);
}

export function findDeclaration(name: string): { layer: string; name: string; short: string } | undefined {
  const norm = name.toUpperCase();
  for (const layer of DSL_CATALOG) {
    for (const d of layer.declarations) {
      if (d.name === norm) return { layer: layer.layer, name: d.name, short: d.short };
    }
  }
  return undefined;
}
