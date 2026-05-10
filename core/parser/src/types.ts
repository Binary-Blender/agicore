// Agicore DSL - Abstract Syntax Tree Type Definitions

// --- Source Location (for error reporting) ---

export interface SourceLocation {
  line: number;
  column: number;
}

export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

// --- Primitive Types ---

export type AgiType =
  | 'string'
  | 'number'
  | 'float'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'json'
  | 'id';

export type FieldModifier = 'REQUIRED' | 'UNIQUE' | 'INDEX';

export type CrudOp = 'create' | 'read' | 'update' | 'delete' | 'list';

export type ThemeOption = 'dark' | 'light' | 'system';

export type LayoutType = 'table' | 'form' | 'detail' | 'cards' | 'split' | 'custom';

export type OnFailBehavior = 'stop' | 'skip' | 'retry' | 'fallback';

// --- Literal Values ---

export type LiteralValue = string | number | boolean;

// --- Field Definition ---

export interface FieldDef {
  name: string;
  type: AgiType;
  defaultValue?: LiteralValue;
  modifiers: FieldModifier[];
  span: SourceSpan;
}

// --- APP Declaration ---

export type TelemetryMode = 'auto' | 'explicit' | 'off';

export interface AppDecl {
  kind: 'app';
  name: string;
  title: string;
  window?: {
    width: number;
    height: number;
    frameless: boolean;
  };
  db: string;
  port?: number;
  theme?: ThemeOption;
  icon?: string;
  telemetry?: TelemetryMode;
  /**
   * Active navigation context — entity names declared via the
   * `CURRENT <Entity>(, <Entity>)*` field of the APP block. Each entity
   * named here causes the generated Zustand store to expose
   * `current<Entity>Id` + `setCurrent<Entity>Id` slots, distinct from the
   * per-entity `selected<Entity>Id` that drives list-picker UI.
   */
  current?: string[];
  span: SourceSpan;
}

// --- ENTITY Declaration ---

export interface Relationship {
  type: 'BELONGS_TO' | 'HAS_MANY';
  target: string;
  span: SourceSpan;
}

/**
 * Default-ordering hint for generated `list_<entity>` queries. Drives
 * `ORDER BY created_at <ASC|DESC>` in both the unfiltered list and the
 * BELONGS_TO+CURRENT filtered variant. Defaults to `DESC` when omitted
 * (back-compat with all pre-ORDER entity declarations).
 */
export type EntityOrder = 'ASC' | 'DESC';

/**
 * A SEED block on an ENTITY. Each block emits one `INSERT OR IGNORE INTO
 * <table> (...) VALUES (...)` in the migration SQL, so the row is created
 * idempotently on every app boot. The user supplies `id` explicitly (no
 * UUID generation at seed time). Missing `created_at`/`updated_at` are
 * filled with `datetime('now')` when the entity has TIMESTAMPS.
 */
export interface SeedRecord {
  fields: Map<string, LiteralValue>;
  span: SourceSpan;
}

export interface EntityDecl {
  kind: 'entity';
  name: string;
  fields: FieldDef[];
  timestamps: boolean;
  crud: CrudOp[] | 'full';
  relationships: Relationship[];
  /** Optional ORDER clause; codegen defaults to 'DESC' when undefined. */
  order?: EntityOrder;
  /** Zero or more SEED blocks (each yields one INSERT OR IGNORE). */
  seeds?: SeedRecord[];
  span: SourceSpan;
}

// --- ACTION Declaration ---

export interface ActionParam {
  name: string;
  type: AgiType;
  defaultValue?: LiteralValue;
}

export interface ActionOutput {
  name: string;
  type: string; // Can be AgiType or an Entity name
}

export interface ActionDecl {
  kind: 'action';
  name: string;
  input: ActionParam[];
  output: ActionOutput[];
  ai?: string;
  stream: boolean;
  span: SourceSpan;
}

// --- VIEW Declaration ---

export interface ViewDecl {
  kind: 'view';
  name: string;
  entity?: string;
  layout: LayoutType;
  actions: string[];
  sidebar?: { icon: string };
  fields: string[];
  title?: string;
  span: SourceSpan;
}

// --- AI_SERVICE Declaration ---

export interface ModelMapping {
  provider: string;
  model: string;
}

export interface AiServiceDecl {
  kind: 'ai_service';
  providers: string[];
  keysFile: string;
  defaultProvider?: string;
  streaming: boolean;
  models: ModelMapping[];
  span: SourceSpan;
}

// --- TEST Declaration ---

export type AssertionOp =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'IS NOT NULL'
  | 'IS NULL'
  | 'CONTAINS'
  | 'MATCHES'
  | 'HAS_LENGTH';

export interface TestGiven {
  entity: string;
  fields: Record<string, LiteralValue>;
  belongsTo?: Record<string, string>;
  span: SourceSpan;
}

export interface TestExpect {
  operation: string;
  updateFields?: Record<string, LiteralValue>;
  assertion: {
    field?: string;
    op: AssertionOp;
    value?: LiteralValue;
  };
  span: SourceSpan;
}

export interface TestDecl {
  kind: 'test';
  name: string;
  givens: TestGiven[];
  expects: TestExpect[];
  span: SourceSpan;
}

// --- RULE Declaration (Expert System) ---

export interface RuleCondition {
  field: string; // entity.field notation
  op: string;
  value: LiteralValue;
  connector?: 'AND' | 'OR' | 'UNLESS';
}

export interface RuleDecl {
  kind: 'rule';
  name: string;
  conditions: RuleCondition[];
  action: string;
  priority: number;
  span: SourceSpan;
}

// --- WORKFLOW Declaration ---

export interface WorkflowStep {
  name: string;
  action: string;
  input?: Record<string, string>;
  onFail: OnFailBehavior;
  span: SourceSpan;
}

export interface WorkflowDecl {
  kind: 'workflow';
  name: string;
  steps: WorkflowStep[];
  parallel?: string[];
  idempotent?: boolean;
  span: SourceSpan;
}

// --- PIPELINE Declaration (Orchestration Engine) ---

export type PipelineModuleType =
  | 'ai_action'
  | 'transform'
  | 'qc_checkpoint'
  | 'vault_save'
  | 'vault_load'
  | 'cross_app'
  | 'custom';

export interface PipelineModule {
  name: string;
  type: PipelineModuleType;
  config: Record<string, LiteralValue | string>;
  span: SourceSpan;
}

export interface PipelineRow {
  name: string;
  modules: PipelineModule[];
  span: SourceSpan;
}

export interface PipelineConnection {
  fromModule: string;
  fromOutput: string;
  toModule: string;
  toInput: string;
  span: SourceSpan;
}

export interface PipelineDecl {
  kind: 'pipeline';
  name: string;
  description: string;
  rows: PipelineRow[];
  connections: PipelineConnection[];
  idempotent?: boolean;
  span: SourceSpan;
}

// --- QC Declaration (Quality Control / SPC) ---

export interface QCDecl {
  kind: 'qc';
  name: string;
  youngThreshold: number;
  maturingThreshold: number;
  youngPassRate: number;
  maturePassRate: number;
  maturingSample: number;
  matureSample: number;
  span: SourceSpan;
}

// --- VAULT Declaration (Shared Asset Storage) ---

export interface VaultDecl {
  kind: 'vault';
  path: string;
  assetTypes: string[];
  provenance: boolean;
  tags: boolean;
  span: SourceSpan;
}

// --- FACT Declaration (Expert System Working Memory) ---

export interface FactDecl {
  kind: 'fact';
  name: string;
  fields: FieldDef[];
  persistent: boolean;
  span: SourceSpan;
}

// --- STATE Declaration (Expert System State Machines) ---

export interface StateTransition {
  target: string;
  condition: string;
  span: SourceSpan;
}

export interface StateNode {
  name: string;
  onEnter?: string;
  onExit?: string;
  transitions: StateTransition[];
  span: SourceSpan;
}

export interface StateDecl {
  kind: 'state';
  name: string;
  initial: string;
  states: StateNode[];
  span: SourceSpan;
}

// --- PATTERN Declaration (Expert System Pattern Matching) ---

export interface PatternDecl {
  kind: 'pattern';
  name: string;
  match: string[];         // regex strings or keyword lists
  when?: string;           // guard condition
  responses: string[];
  score?: { name: string; delta: number };
  assertFact?: { name: string; fields: Record<string, LiteralValue> };
  priority: number;
  category?: string;
  span: SourceSpan;
}

// --- SCORE Declaration (Expert System Certainty Tracking) ---

export interface ScoreThreshold {
  name: string;
  value: number;
  action?: string;
}

export interface ScoreDecl {
  kind: 'score';
  name: string;
  initial: number;
  min?: number;
  max?: number;
  decay?: { amount: number; per: string };
  thresholds: ScoreThreshold[];
  span: SourceSpan;
}

// --- MODULE Declaration (Expert System Composable Engines) ---

export interface ModuleDecl {
  kind: 'module';
  name: string;
  description: string;
  activateWhen?: string;
  deactivateWhen?: string;
  patterns: PatternDecl[];
  rules: RuleDecl[];
  states: StateDecl[];
  scores: ScoreDecl[];
  facts: FactDecl[];
  span: SourceSpan;
}

// --- ROUTER Declaration (Cooperative Intelligence) ---

export interface RouterModelDef {
  key: string;
  provider: string;
  modelId: string;
  strengths: string[];
  cost: number;
  context: number;
  isDefault: boolean;
}

export interface CircuitBreaker {
  threshold: number;
  window: string;
  fallback?: number;
}

export interface RouterTier {
  tier: number;
  name: string;
  models: RouterModelDef[];
  circuitBreaker?: CircuitBreaker;
}

export interface RouterDecl {
  kind: 'router';
  name: string;
  description: string;
  tiers: RouterTier[];
  taskTypes: string[];
  moshPitSize: number;
  calibration: boolean;
  span: SourceSpan;
}

// --- SKILL Declaration (Domain Expertise) ---

export interface SkillDecl {
  kind: 'skill';
  name: string;
  description: string;
  keywords: string[];
  domain?: string;
  path?: string;
  priority: number;
  span: SourceSpan;
}

// --- SKILLDOC Declaration (Governed Cognition Infrastructure) ---

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

export interface SkillDocDecl {
  kind: 'skilldoc';
  name: string;
  description: string;
  version?: string;
  domain?: string;
  content?: string;
  keywords: string[];
  priority: number;
  governance?: SkillDocGovernance;
  compression?: SkillDocCompression;
  span: SourceSpan;
}

// --- REASONER Declaration (Periodic AI Analysis Loop) ---

export type ReasonerSchedule = 'on_demand' | 'event_triggered' | 'hourly' | 'daily' | 'weekly' | string;

export interface ReasonerInput {
  channels: string[];
  window?: string;
  filter?: string;
}

export interface ReasonerOutput {
  packet?: string;
  channel?: string;
}

export interface ReasonerDecl {
  kind: 'reasoner';
  name: string;
  description: string;
  input: ReasonerInput;
  uses?: string;
  tier?: number;
  output: ReasonerOutput;
  schedule: ReasonerSchedule;
  idempotent?: boolean;
  governance?: SkillDocGovernance;
  span: SourceSpan;
}

// --- TRIGGER Declaration (Reactive Event Binding) ---

export type TriggerTargetKind = 'workflow' | 'reasoner' | 'session' | 'compiler' | 'pipeline';

export interface TriggerWhen {
  channels: string[];
  packet?: string;
  filter?: string;
}

export interface TriggerFires {
  kind: TriggerTargetKind;
  target: string;
}

export interface TriggerDecl {
  kind: 'trigger';
  name: string;
  description: string;
  when: TriggerWhen;
  fires: TriggerFires;
  debounce?: string;
  rateLimit?: string;
  idempotent?: boolean;
  governance?: SkillDocGovernance;
  span: SourceSpan;
}

// --- LIFECYCLE Declaration (Temporal Graduation) ---

export interface LifecycleEscalation {
  level: string;
  description: string;
}

export interface LifecycleDecl {
  kind: 'lifecycle';
  name: string;
  description: string;
  stalenessWindow: number;
  stalenessDrop: number;
  minLifetime: number;
  maxInstances: number;
  escalation: LifecycleEscalation[];
  span: SourceSpan;
}

// --- BREED Declaration (Evolutionary Reproduction) ---

export interface BreedFitness {
  predictionAccuracy: number;
  domainDepth: number;
  costEfficiency: number;
  judgeQuality: number;
}

export interface BreedDecl {
  kind: 'breed';
  name: string;
  description: string;
  inheritanceA: number;
  inheritanceB: number;
  inheritanceFresh: number;
  minFitness: number;
  cooldown: number;
  fitness: BreedFitness;
  pairingPreferences: string[];
  diversityMin: number;
  traitPersistAfter: number;
  traitExtinctAfter: number;
  span: SourceSpan;
}

// --- PACKET Declaration (Semantic Infrastructure) ---

export interface PacketField {
  name: string;
  type: AgiType;
  required: boolean;
}

export interface PacketValidationRule {
  name: string;
  condition: string;
}

export interface PacketDecl {
  kind: 'packet';
  name: string;
  description: string;
  payload: PacketField[];
  provenance: boolean;
  lineage: boolean;
  signatures: boolean;
  admissibility: boolean;
  ttl: number;
  validation: PacketValidationRule[];
  span: SourceSpan;
}

// --- AUTHORITY Declaration (Trust Infrastructure) ---

export interface AuthorityLevel {
  name: string;
  description: string;
}

export interface AuthoritySigning {
  required: boolean;
  algorithm: string;
  verifyChain: boolean;
}

export interface AuthorityDecl {
  kind: 'authority';
  name: string;
  description: string;
  levels: AuthorityLevel[];
  signing: AuthoritySigning;
  admissibility: PacketValidationRule[];
  span: SourceSpan;
}

// --- CHANNEL Declaration (Semantic Communication) ---

export type ChannelProtocol = 'local' | 'websocket' | 'http' | 'queue' | 'grpc' | 'mqtt';
export type ChannelDirection = 'inbound' | 'outbound' | 'bidirectional';
export type ChannelOrdering = 'fifo' | 'keyed' | 'unordered';

export interface ChannelDecl {
  kind: 'channel';
  name: string;
  description: string;
  protocol: ChannelProtocol;
  direction: ChannelDirection;
  packet: string;
  authority?: string;
  endpoint?: string;
  retry: number;
  timeout: number;
  ordering?: ChannelOrdering;
  deadLetter?: string;
  span: SourceSpan;
}

// --- IDENTITY Declaration (Creator-Owned Identity) ---

export interface IdentityProfileField {
  name: string;
  type: AgiType;
  required: boolean;
}

export interface IdentityDecl {
  kind: 'identity';
  name: string;
  description: string;
  signingKey: string;
  domains: string[];
  discoverable: boolean;
  portable: boolean;
  profile: IdentityProfileField[];
  span: SourceSpan;
}

// --- FEED Declaration (Semantic Syndication) ---

export type FeedSubscribeMode = 'open' | 'approved' | 'invite';

export interface FeedDecl {
  kind: 'feed';
  name: string;
  description: string;
  identity: string;
  packet: string;
  channel?: string;
  subscribe: FeedSubscribeMode;
  syndicate: boolean;
  maxItems: number;
  discovery: boolean;
  span: SourceSpan;
}

// --- NODE Declaration (Ambient Intelligence) ---

export type NodeType = 'personal' | 'environment' | 'business' | 'actor';
export type AiTier = 'edge' | 'cloud' | 'hybrid';
export type SafetyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface NodeDecl {
  kind: 'node';
  name: string;
  description: string;
  type: NodeType;
  hardware: string;
  aiTier: AiTier;
  comms: string[];
  sensors: string[];
  zone?: string;
  offline: boolean;
  safety: SafetyLevel;
  span: SourceSpan;
}

// --- SENSOR Declaration (Physical World Input) ---

export type SensorType = 'camera' | 'microphone' | 'imu' | 'gps' | 'environmental' | 'proximity' | 'custom';

export interface SensorDecl {
  kind: 'sensor';
  name: string;
  description: string;
  type: SensorType;
  model?: string;
  capabilities: string[];
  latency: number;
  accuracy: number;
  failure?: string;
  span: SourceSpan;
}

// --- ZONE Declaration (Physical Space) ---

export interface ZoneDecl {
  kind: 'zone';
  name: string;
  description: string;
  bounds?: string;
  nodes: string[];
  ambient: boolean;
  capacity?: number;
  hours?: string;
  span: SourceSpan;
}

// --- SESSION Declaration (Semantic Operating Mode) ---

export interface SessionDecl {
  kind: 'session';
  name: string;
  description: string;
  tools: string[];
  context: string;
  memory: string;
  output: string[];
  persist: boolean;
  span: SourceSpan;
}

// --- COMPILER Declaration (Semantic State Transformation) ---

export interface EnrichOp {
  operation: string; // infer, suggest, generate, detect, preserve
  target: string;    // what to enrich
}

export interface CompilerDecl {
  kind: 'compiler';
  name: string;
  description: string;
  from: string;
  to: string;
  extract: string[];
  enrich: EnrichOp[];
  ai?: string;
  validate: boolean;
  span: SourceSpan;
}

// --- Top-Level AST ---

export type Declaration =
  | AppDecl
  | EntityDecl
  | ActionDecl
  | ViewDecl
  | AiServiceDecl
  | TestDecl
  | RuleDecl
  | WorkflowDecl
  | PipelineDecl
  | QCDecl
  | VaultDecl
  | FactDecl
  | StateDecl
  | PatternDecl
  | ScoreDecl
  | ModuleDecl
  | RouterDecl
  | SkillDecl
  | SkillDocDecl
  | ReasonerDecl
  | TriggerDecl
  | LifecycleDecl
  | BreedDecl
  | PacketDecl
  | AuthorityDecl
  | ChannelDecl
  | IdentityDecl
  | FeedDecl
  | NodeDecl
  | SensorDecl
  | ZoneDecl
  | SessionDecl
  | CompilerDecl;

export interface AgiFile {
  app: AppDecl;
  entities: EntityDecl[];
  actions: ActionDecl[];
  views: ViewDecl[];
  aiService?: AiServiceDecl;
  tests: TestDecl[];
  rules: RuleDecl[];
  workflows: WorkflowDecl[];
  pipelines: PipelineDecl[];
  qcs: QCDecl[];
  vault?: VaultDecl;
  facts: FactDecl[];
  states: StateDecl[];
  patterns: PatternDecl[];
  scores: ScoreDecl[];
  modules: ModuleDecl[];
  routers: RouterDecl[];
  skills: SkillDecl[];
  skilldocs: SkillDocDecl[];
  reasoners: ReasonerDecl[];
  triggers: TriggerDecl[];
  lifecycles: LifecycleDecl[];
  breeds: BreedDecl[];
  packets: PacketDecl[];
  authorities: AuthorityDecl[];
  channels: ChannelDecl[];
  identities: IdentityDecl[];
  feeds: FeedDecl[];
  nodes: NodeDecl[];
  sensors: SensorDecl[];
  zones: ZoneDecl[];
  sessions: SessionDecl[];
  compilers: CompilerDecl[];
}

// --- Parse Error ---

export interface ParseError {
  message: string;
  location: SourceLocation;
}
