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

export type FieldModifier = 'REQUIRED' | 'UNIQUE' | 'INDEX' | 'SENSITIVE';

export type CrudOp = 'create' | 'read' | 'update' | 'delete' | 'list';

export type ThemeOption = 'dark' | 'light' | 'system';

export type LayoutType = 'table' | 'form' | 'detail' | 'cards' | 'split' | 'custom' | 'document_editor' | 'settings' | 'hero' | 'gallery' | 'landing' | 'dashboard' | 'kanban';

// --- THEME Declaration (visual identity) ---

export type ThemePalette = 'indigo' | 'violet' | 'rose' | 'amber' | 'emerald' | 'cyan' | 'slate';
export type ThemeBackground = 'dark' | 'light' | 'auto';
export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';
export type ThemeMotif = 'minimal' | 'retro' | 'cyberpunk' | 'corporate' | 'playful';
export type ThemeRadius = 'sharp' | 'rounded' | 'pill';

export interface ThemeDecl {
  kind: 'theme';
  name: string;
  palette: ThemePalette;
  accent?: string;
  background: ThemeBackground;
  font: string;
  density: ThemeDensity;
  motif: ThemeMotif;
  radius: ThemeRadius;
  span: SourceSpan;
}

export type OnFailBehavior = 'stop' | 'skip' | 'retry' | 'fallback';

// --- Literal Values ---

export type LiteralValue = string | number | boolean;

// --- Field Definition ---

export interface FieldDef {
  name: string;
  type: AgiType;
  customType?: string;   // name of a TYPE alias when field references one
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
  workspaces?: boolean;
  tray?: boolean;
  hotkey?: string;
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
  /** When true, only one row exists (id = 'singleton'); no create/list/delete. */
  singleton?: boolean;
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

export interface ActionEmitField {
  name: string;
  type: string;
}

export interface ActionEmit {
  eventName: string;
  fields: ActionEmitField[];
}

export interface ActionDecl {
  kind: 'action';
  name: string;
  input: ActionParam[];
  output: ActionOutput[];
  ai?: string;
  /** Overrides AI_SERVICE default — specific model to use for this AI action. */
  model?: string;
  stream: boolean;
  impl?: string;
  pattern?: string;
  emit?: ActionEmit;
  role?: string;
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
  subtitle?: string;
  emoji?: string;
  columns?: number;
  featured?: string[];
  groupBy?: string;
  span: SourceSpan;
}

// --- AI_SERVICE Declaration ---

/**
 * @deprecated kept for backwards compatibility with external consumers; prefer
 * `ModelEntry`. ModelMapping carried only `{provider, model}` — the new
 * multi-model MODELS block carries an ordered list of `ModelEntry` with
 * optional display labels and an explicit DEFAULT marker per provider.
 */
export interface ModelMapping {
  provider: string;
  model: string;
}

/**
 * One entry inside an `AI_SERVICE.MODELS { ... }` block. Multiple entries per
 * provider are allowed. `isDefault` is true for the entry that should be used
 * when that provider is selected (each provider has exactly one default —
 * either explicitly marked or the first declared).
 */
export interface ModelEntry {
  provider: string;
  /** The model id sent to the provider API (e.g. `claude-sonnet-4-20250514`). */
  id: string;
  /** Optional human-friendly display label; derived from the id if omitted. */
  label?: string;
  isDefault: boolean;
}

export interface AiServiceDecl {
  kind: 'ai_service';
  providers: string[];
  /** Path to JSON key file on disk — mutually exclusive with keysEntity. */
  keysFile: string;
  /** Name of a SINGLETON ENTITY whose fields supply API keys (e.g. "AIConfig"). */
  keysEntity?: string;
  defaultProvider?: string;
  streaming: boolean;
  /** Ordered list of provider+model entries as declared in the source. */
  models: ModelEntry[];
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
  flag?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
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

// --- LOG Declaration (Application Logging) ---

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export type LogTarget = 'file' | 'stdout' | 'both';

export interface LogDecl {
  kind: 'log';
  level: LogLevel;
  target: LogTarget;
  path: string;
  rotate?: string;
  span: SourceSpan;
}

// --- MACRO Declaration (Reusable named capability) ---

export interface MacroParam {
  name: string;
  type: string;
  required: boolean;
}

export interface MacroDecl {
  kind: 'macro';
  name: string;
  description: string;
  params: MacroParam[];
  action?: string;
  span: SourceSpan;
}

// --- MACRO_REGISTRY Declaration (Cross-app capability exposure) ---

export interface MacroBinding {
  macro: string;
  as?: string;
}

export interface MacroRegistryDecl {
  kind: 'macro_registry';
  exposes: string[];
  invokes: MacroBinding[];
  span: SourceSpan;
}

// --- ACTUATOR Declaration (Hardware output device) ---

export type ActuatorType =
  | 'servo'
  | 'motor'
  | 'stepper'
  | 'relay'
  | 'led'
  | 'neopixel'
  | 'custom';

export interface ActuatorDecl {
  kind: 'actuator';
  name: string;
  description: string;
  type: ActuatorType;
  model?: string;
  safeState: string;
  maxCurrent?: number;
  slewRate?: number;
  watchdog?: number;
  span: SourceSpan;
}

// --- PLATFORM Declaration (Embedded target chip + runtime) ---

export type ChipType =
  | 'rpi5'
  | 'rpi4'
  | 'esp32s3'
  | 'stm32h7'
  | 'stm32f4'
  | 'x86'
  | 'custom';

export interface PlatformDecl {
  kind: 'platform';
  name: string;
  chip: ChipType;
  os?: string;
  aiRuntime?: string;
  crossTarget?: string;
  span: SourceSpan;
}

// --- NULLCLAW Declaration (Agent runtime with hardware tool bindings) ---

export interface NullclawTool {
  name: string;
  mapsTo: string;
}

export interface NullclawProvider {
  name: string;
  url: string;
  priority: number;
}

export interface NullclawDecl {
  kind: 'nullclaw';
  configPath: string;
  providers: NullclawProvider[];
  tools: NullclawTool[];
  personality?: string;
  span: SourceSpan;
}

// --- BRAIN_BODY Declaration (UART brain-body protocol) ---

export interface BrainBodyDecl {
  kind: 'brain_body';
  baud: number;
  heartbeat: number;
  watchdog: number;
  estopGpio?: string;
  commands: string[];
  span: SourceSpan;
}

// --- TYPE Alias Declaration ---

export interface TypeAliasDecl {
  kind: 'typeAlias';
  name: string;
  definition: string;  // TypeScript-compatible string, e.g. "string[]" or "'draft' | 'published'"
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
  content?: string;
  appliesTo?: string[];
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

// --- COGNITION_ROLE Declaration ---

export type PromotionPolicy = 'SPC_AUTOMATIC' | 'MANUAL' | 'DISABLED';
export type FallbackPolicy  = 'ESCALATE' | 'DEGRADE' | 'FAIL';

export interface CognitionRoleDecl {
  kind: 'cognition_role';
  name: string;
  responsibilities: string[];
  qcProfile?: string;
  escalateTo?: string;
  modelHierarchy: string[];
  promotionPolicy: PromotionPolicy;
  fallbackPolicy: FallbackPolicy;
  span: SourceSpan;
}

// --- STAGES Declaration (Entity Field State Machine) ---

export type StagesConditionOp =
  | 'is_not_null'
  | 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  | 'count_gte'
  | 'count_gte_where';

export type StagesMatchMode = 'all' | 'any';

export interface StagesCondition {
  op: StagesConditionOp;
  entity: string;
  field?: string;
  value?: string | number;
  count?: number;
  whereField?: string;
  whereValue?: string;
}

export interface StagesTransition {
  from: string;
  to: string;
  match: StagesMatchMode;
  conditions: StagesCondition[];
}

export interface StagesDecl {
  kind: 'stages';
  entity: string;
  field: string;
  transitions: StagesTransition[];
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

// --- EVENT Declaration ---

export interface EventPayloadField {
  name: string;
  type: string;
}

export interface EventDecl {
  kind: 'event';
  name: string;
  description: string;
  payload: EventPayloadField[];
  subscribers: string[];
  schedule?: string;
  idempotent: boolean;
  ttl: number;
  span: SourceSpan;
}

// --- NBVE Declaration (No-Blind-Version-Elevation) ---

export interface NbveSpc {
  window: number;
  confidence: number;
  accuracyThreshold: number;
  stabilityThreshold: number;
  defectRateMax: number;
}

export interface NbveDecl {
  kind: 'nbve';
  name: string;
  description: string;
  production: string;
  shadow: string;
  spc: NbveSpc;
  metrics: string[];
  promotion: 'auto' | 'manual';
  fallback: 'production' | 'shadow';
  chain?: string;
  span: SourceSpan;
}

// --- ESCALATION_CHAIN Declaration (Dynamic Model Escalation) ---

export interface EscalationOnConditions {
  spcViolation?: number;
  errorRate?: number;
  explicit: boolean;
}

export interface DeescalationOnConditions {
  stabilityWindow?: number;
  errorRate?: number;
}

export interface EscalationChainDecl {
  kind: 'escalation_chain';
  name: string;
  description: string;
  roles: string[];
  escalateOn: EscalationOnConditions;
  deescalateOn: DeescalationOnConditions;
  cooldown: string;
  span: SourceSpan;
}

// --- QC_MESH Declaration (Consensus-based judgment drift detection) ---

export type QcMeshConsensus = 'majority' | 'all' | number;
export type QcMeshOnFail = 'escalate' | 'reject' | 'flag';

export interface QcMeshSpc {
  minEvaluators: number;
  maxEvaluators: number;
  driftRate: number;
  stabilityWindow: number;
}

export interface QcMeshDecl {
  kind: 'qc_mesh';
  name: string;
  description: string;
  evaluators: string[];
  criteria: string;
  consensus: QcMeshConsensus;
  onFail: QcMeshOnFail;
  spc: QcMeshSpc;
  span: SourceSpan;
}

// --- TARGET Declaration (Compilation profile) ---

export type TargetRuntime  = 'axum' | 'tauri';
export type TargetFrontend = 'react' | 'nextjs';
export type TargetDeploy   = 'docker' | 'k8s' | 'lambda' | 'fly';

export interface TargetDecl {
  kind: 'target';
  runtime: TargetRuntime;
  frontend: TargetFrontend;
  deploy: TargetDeploy;
  span: SourceSpan;
}

// --- AUTH Declaration (Authentication configuration) ---

export type AuthStrategy = 'jwt' | 'session' | 'oauth' | 'saml';

export interface AuthDecl {
  kind: 'auth';
  strategy: AuthStrategy;
  providers: string[];
  expiry: string;
  refresh: boolean;
  span: SourceSpan;
}

// --- TENANT Declaration (Multi-tenancy model) ---

export type TenantModel     = 'row_level' | 'schema' | 'database';
export type TenantIsolation = 'strict' | 'advisory';

export interface TenantDecl {
  kind: 'tenant';
  model: TenantModel;
  key: string;
  isolate: TenantIsolation;
  span: SourceSpan;
}

// --- CONTRACT Declaration ---

export type PaymentMethod = 'ach' | 'stripe' | 'paypal' | 'crypto' | 'external';
export type PaymentRelease = 'on_acceptance' | 'milestone' | 'manual';

export interface ContractParty {
  role: string;
  type: string;
}

export interface ContractTerm {
  key: string;
  value: string;
}

export interface ContractDeliverable {
  name: string;
  required: boolean;
}

export interface ContractPayment {
  method: PaymentMethod;
  amount: number;
  currency: string;
  release: PaymentRelease;
  recurring: boolean;
}

export interface ContractGovernance {
  signedBy: 'client' | 'provider' | 'both';
  dispute: 'optional' | 'required' | 'external';
}

export interface ContractDecl {
  kind: 'contract';
  name: string;
  description: string;
  parties: ContractParty[];
  terms: ContractTerm[];
  deliverables: ContractDeliverable[];
  payment: ContractPayment;
  governance: ContractGovernance;
  timestamps: boolean;
  span: SourceSpan;
}

// --- REPUTATION Declaration (SPC-Driven Trust Scoring) ---

export interface ReputationMetric {
  name: string;
  type: 'float' | 'int';
}

export interface ReputationSpc {
  maturingThreshold: number;
  matureThreshold: number;
  requiredConfidence: number;
}

export interface ReputationDecay {
  enabled: boolean;
  halfLife: string;
}

export interface ReputationDecl {
  kind: 'reputation';
  name: string;
  description: string;
  metrics: ReputationMetric[];
  spc: ReputationSpc;
  decay: ReputationDecay;
  span: SourceSpan;
}

// --- SUBSCRIPTION Declaration (Recurring Creator Support) ---

export interface SubscriptionTerms {
  amount: number;
  interval: 'monthly' | 'yearly' | 'weekly';
  perks: string[];
}

export interface SubscriptionPayment {
  method: PaymentMethod;
  autoRenew: boolean;
}

export interface SubscriptionDecl {
  kind: 'subscription';
  name: string;
  description: string;
  provider: string;
  subscriber: string;
  terms: SubscriptionTerms;
  payment: SubscriptionPayment;
  span: SourceSpan;
}

// --- DISPUTE Declaration (Structured Conflict Resolution) ---

export type DisputeResolution = 'refund' | 'revision' | 'partial_acceptance' | 'cancellation';

export interface DisputeDecl {
  kind: 'dispute';
  name: string;
  description: string;
  contract: string;
  states: string[];
  resolutions: DisputeResolution[];
  span: SourceSpan;
}

// --- PREFERENCE Declaration ---

export interface PreferenceDecl {
  kind: 'preference';
  name: string;
  type: string;        // 'string' | 'number' | 'bool'
  defaultValue: LiteralValue;
  key: string;         // localStorage key
  span: SourceSpan;
}

// --- Top-Level SEED Declaration ---

/**
 * A top-level SEED block (outside any ENTITY). Each block emits one
 * `INSERT OR IGNORE INTO <table> (...) VALUES (...)` in the migration SQL.
 * Fields are space-delimited key-value pairs (no colon, no quotes on keys).
 */
export interface TopLevelSeedDecl {
  kind: 'seed';
  entity: string;
  fields: Map<string, LiteralValue>;
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
  | LogDecl
  | MacroDecl
  | MacroRegistryDecl
  | ActuatorDecl
  | PlatformDecl
  | NullclawDecl
  | BrainBodyDecl
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
  | CompilerDecl
  | EventDecl
  | NbveDecl
  | ContractDecl
  | ReputationDecl
  | SubscriptionDecl
  | DisputeDecl
  | PreferenceDecl
  | TopLevelSeedDecl
  | ThemeDecl
  | StagesDecl
  | CognitionRoleDecl
  | EscalationChainDecl
  | QcMeshDecl
  | TargetDecl
  | AuthDecl
  | TenantDecl;

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
  log?: LogDecl;
  macros: MacroDecl[];
  macroRegistry?: MacroRegistryDecl;
  actuators: ActuatorDecl[];
  platforms: PlatformDecl[];
  nullclaw?: NullclawDecl;
  brainBody?: BrainBodyDecl;
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
  events: EventDecl[];
  nbves: NbveDecl[];
  contracts: ContractDecl[];
  reputations: ReputationDecl[];
  subscriptions: SubscriptionDecl[];
  disputes: DisputeDecl[];
  preferences: PreferenceDecl[];
  topLevelSeeds: TopLevelSeedDecl[];
  typeAliases: TypeAliasDecl[];
  themes: ThemeDecl[];
  stages: StagesDecl[];
  cognitionRoles: CognitionRoleDecl[];
  escalationChains: EscalationChainDecl[];
  qcMeshes: QcMeshDecl[];
  target?: TargetDecl;
  auth?: AuthDecl;
  tenant?: TenantDecl;
}

// --- Parse Error ---

export interface ParseError {
  message: string;
  location: SourceLocation;
}
