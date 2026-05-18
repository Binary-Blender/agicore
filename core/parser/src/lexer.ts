// Agicore DSL Lexer - Tokenizes .agi source text

import type { SourceLocation } from './types.js';

// --- Token Types ---

export enum TokenType {
  // Keywords
  APP = 'APP',
  ENTITY = 'ENTITY',
  ACTION = 'ACTION',
  VIEW = 'VIEW',
  AI_SERVICE = 'AI_SERVICE',
  TEST = 'TEST',
  RULE = 'RULE',
  WORKFLOW = 'WORKFLOW',

  // Entity keywords
  TIMESTAMPS = 'TIMESTAMPS',
  CRUD = 'CRUD',
  BELONGS_TO = 'BELONGS_TO',
  HAS_MANY = 'HAS_MANY',
  REQUIRED = 'REQUIRED',
  UNIQUE = 'UNIQUE',
  INDEX = 'INDEX',
  ORDER = 'ORDER',
  ASC = 'ASC',
  DESC = 'DESC',
  SEED = 'SEED',

  // App keywords
  TITLE = 'TITLE',
  WINDOW = 'WINDOW',
  DB = 'DB',
  PORT = 'PORT',
  THEME = 'THEME',
  ICON = 'ICON',
  CURRENT = 'CURRENT',
  WORKSPACES = 'WORKSPACES',
  TRAY = 'TRAY',
  HOTKEY = 'HOTKEY',

  // Action keywords
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  AI = 'AI',
  STREAM = 'STREAM',

  // View keywords
  LAYOUT = 'LAYOUT',
  ACTIONS = 'ACTIONS',
  SIDEBAR = 'SIDEBAR',
  FIELDS = 'FIELDS',

  // AI_SERVICE keywords
  PROVIDERS = 'PROVIDERS',
  KEYS_FILE = 'KEYS_FILE',
  DEFAULT = 'DEFAULT',
  STREAMING = 'STREAMING',
  MODELS = 'MODELS',
  LABEL = 'LABEL',

  // Test keywords
  GIVEN = 'GIVEN',
  EXPECT = 'EXPECT',
  IS = 'IS',
  NOT = 'NOT',
  NULL = 'NULL',
  CONTAINS = 'CONTAINS',
  MATCHES = 'MATCHES',
  HAS_LENGTH = 'HAS_LENGTH',

  // Rule keywords
  WHEN = 'WHEN',
  AND = 'AND',
  OR = 'OR',
  UNLESS = 'UNLESS',
  THEN = 'THEN',
  PRIORITY = 'PRIORITY',
  IF_KW = 'IF_KW',
  FLAG_KW = 'FLAG_KW',
  SEVERITY_KW = 'SEVERITY_KW',

  // Log keywords
  LOG_KW = 'LOG_KW',
  LEVEL_KW = 'LEVEL_KW',
  TARGET_KW = 'TARGET_KW',
  ROTATE_KW = 'ROTATE_KW',

  // Macro registry keywords
  MACRO_KW = 'MACRO_KW',
  MACRO_REGISTRY_KW = 'MACRO_REGISTRY_KW',
  EXPOSES_KW = 'EXPOSES_KW',
  INVOKES_KW = 'INVOKES_KW',
  BINDING_KW = 'BINDING_KW',

  // Embedded / robotics keywords
  ACTUATOR_KW = 'ACTUATOR_KW',
  SAFE_STATE_KW = 'SAFE_STATE_KW',
  SLEW_RATE_KW = 'SLEW_RATE_KW',
  MAX_CURRENT_KW = 'MAX_CURRENT_KW',
  PLATFORM_KW = 'PLATFORM_KW',
  CHIP_KW = 'CHIP_KW',
  OS_KW = 'OS_KW',
  AI_RUNTIME_KW = 'AI_RUNTIME_KW',
  CROSS_TARGET_KW = 'CROSS_TARGET_KW',
  NULLCLAW_KW = 'NULLCLAW_KW',
  PERSONALITY_KW = 'PERSONALITY_KW',
  BRAIN_BODY_KW = 'BRAIN_BODY_KW',
  BAUD_KW = 'BAUD_KW',
  HEARTBEAT_KW = 'HEARTBEAT_KW',
  WATCHDOG_KW = 'WATCHDOG_KW',
  COMMANDS_KW = 'COMMANDS_KW',
  ESTOP_KW = 'ESTOP_KW',

  // Workflow keywords
  STEP = 'STEP',
  ON_FAIL = 'ON_FAIL',
  PARALLEL = 'PARALLEL',

  // Expert system keywords
  FACT = 'FACT',
  STATE = 'STATE',
  PATTERN = 'PATTERN',
  SCORE = 'SCORE',
  MODULE = 'MODULE',
  INITIAL = 'INITIAL',
  TRANSITION = 'TRANSITION',
  ON_ENTER = 'ON_ENTER',
  ON_EXIT = 'ON_EXIT',
  MATCH = 'MATCH',
  RESPOND = 'RESPOND',
  ASSERT = 'ASSERT',
  RETRACT = 'RETRACT',
  CATEGORY = 'CATEGORY',
  PERSISTENT = 'PERSISTENT',
  THRESHOLD = 'THRESHOLD',
  AT = 'AT',
  MIN = 'MIN',
  MAX = 'MAX',
  DECAY = 'DECAY',
  PER = 'PER',
  DESCRIPTION = 'DESCRIPTION',
  ACTIVATE_WHEN = 'ACTIVATE_WHEN',
  DEACTIVATE_WHEN = 'DEACTIVATE_WHEN',

  // Orchestration keywords
  PIPELINE = 'PIPELINE',
  ROW = 'ROW',
  CONNECTION = 'CONNECTION',
  QC = 'QC',
  VAULT = 'VAULT',
  CONFIG = 'CONFIG',
  MODEL = 'MODEL',
  PROMPT = 'PROMPT',
  TAGS = 'TAGS',
  OUTPUT_TYPE = 'OUTPUT_TYPE',
  SPC = 'SPC',
  YOUNG_THRESHOLD = 'YOUNG_THRESHOLD',
  MATURING_THRESHOLD = 'MATURING_THRESHOLD',
  YOUNG_PASS_RATE = 'YOUNG_PASS_RATE',
  MATURE_PASS_RATE = 'MATURE_PASS_RATE',
  MATURING_SAMPLE = 'MATURING_SAMPLE',
  MATURE_SAMPLE = 'MATURE_SAMPLE',
  PATH = 'PATH',
  ASSET_TYPES = 'ASSET_TYPES',

  // Cooperative intelligence keywords
  ROUTER = 'ROUTER',
  SKILL = 'SKILL',
  SKILLDOC = 'SKILLDOC',
  LIFECYCLE = 'LIFECYCLE',
  BREED = 'BREED',
  GOVERNANCE = 'GOVERNANCE',
  COMPRESSION = 'COMPRESSION',
  CONTENT_KW = 'CONTENT_KW',
  VERSION = 'VERSION',
  SIGNED_BY = 'SIGNED_BY',
  REQUIRE_KW = 'REQUIRE_KW',
  EXECUTE_ONLY = 'EXECUTE_ONLY',
  DISALLOW = 'DISALLOW',
  AUDIT = 'AUDIT',
  SEMANTIC_DENSITY = 'SEMANTIC_DENSITY',
  INTENT_PRESERVATION = 'INTENT_PRESERVATION',
  TOKEN_EFFICIENCY = 'TOKEN_EFFICIENCY',
  REASONER = 'REASONER',
  USES = 'USES',
  FILTER = 'FILTER',
  SCHEDULE = 'SCHEDULE',
  TELEMETRY = 'TELEMETRY',
  TRIGGER = 'TRIGGER',
  FIRES = 'FIRES',
  DEBOUNCE = 'DEBOUNCE',
  RATE_LIMIT = 'RATE_LIMIT',
  IDEMPOTENT = 'IDEMPOTENT',
  ORDERING = 'ORDERING',
  DEAD_LETTER = 'DEAD_LETTER',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  FALLBACK = 'FALLBACK',
  TIER = 'TIER',
  STRENGTHS = 'STRENGTHS',
  COST = 'COST',
  CONTEXT = 'CONTEXT',
  TASK_TYPES = 'TASK_TYPES',
  MOSH_PIT = 'MOSH_PIT',
  KEYWORDS = 'KEYWORDS',
  APPLIES_TO_KW = 'APPLIES_TO_KW',
  DOMAIN = 'DOMAIN',
  STALENESS_WINDOW = 'STALENESS_WINDOW',
  STALENESS_DROP = 'STALENESS_DROP',
  MIN_LIFETIME = 'MIN_LIFETIME',
  MAX_INSTANCES = 'MAX_INSTANCES',
  INHERITANCE = 'INHERITANCE',
  MIN_FITNESS = 'MIN_FITNESS',
  COOLDOWN_KW = 'COOLDOWN_KW',
  FITNESS = 'FITNESS',
  PREFER = 'PREFER',
  DIVERSITY_MIN = 'DIVERSITY_MIN',
  PERSIST_AFTER = 'PERSIST_AFTER',
  EXTINCT_AFTER = 'EXTINCT_AFTER',

  // Semantic infrastructure keywords
  PACKET = 'PACKET',
  AUTHORITY_KW = 'AUTHORITY_KW',
  CHANNEL = 'CHANNEL',
  PAYLOAD = 'PAYLOAD',
  PROTOCOL = 'PROTOCOL',
  DIRECTION = 'DIRECTION',
  ENDPOINT = 'ENDPOINT',
  RETRY = 'RETRY',
  TIMEOUT = 'TIMEOUT',
  SIGNING = 'SIGNING',
  ALGORITHM = 'ALGORITHM',
  VERIFY_CHAIN = 'VERIFY_CHAIN',
  VALIDATION = 'VALIDATION',
  TTL = 'TTL',

  // Creator network keywords
  IDENTITY = 'IDENTITY',
  FEED = 'FEED',
  PROFILE = 'PROFILE',
  SIGNING_KEY = 'SIGNING_KEY',
  DISCOVERABLE = 'DISCOVERABLE',
  PORTABLE = 'PORTABLE',
  SUBSCRIBE = 'SUBSCRIBE',
  SYNDICATE = 'SYNDICATE',
  MAX_ITEMS = 'MAX_ITEMS',
  DISCOVERY = 'DISCOVERY',

  // Ambient intelligence keywords
  NODE = 'NODE',
  SENSOR_KW = 'SENSOR_KW',
  ZONE = 'ZONE',
  HARDWARE = 'HARDWARE',
  AI_TIER = 'AI_TIER',
  COMMS = 'COMMS',
  SENSORS = 'SENSORS',
  OFFLINE = 'OFFLINE',
  SAFETY = 'SAFETY',
  CAPABILITY = 'CAPABILITY',
  LATENCY = 'LATENCY',
  ACCURACY = 'ACCURACY',
  FAILURE = 'FAILURE',
  BOUNDS = 'BOUNDS',
  NODES = 'NODES',
  AMBIENT = 'AMBIENT',
  CAPACITY = 'CAPACITY',
  HOURS = 'HOURS',

  // Event / NBVE / Contract keywords
  EVENT_KW = 'EVENT_KW',
  NBVE_KW = 'NBVE_KW',
  CONTRACT_KW = 'CONTRACT_KW',
  REPUTATION_KW = 'REPUTATION_KW',
  PUBLISH = 'PUBLISH',
  SHADOW = 'SHADOW',
  PRODUCTION_KW = 'PRODUCTION_KW',
  SPC_KW = 'SPC_KW',
  CONFIDENCE = 'CONFIDENCE',
  PROMOTION_KW = 'PROMOTION_KW',
  METRICS = 'METRICS',
  AMOUNT = 'AMOUNT',
  CURRENCY = 'CURRENCY',
  RELEASE = 'RELEASE',
  RECURRING = 'RECURRING',
  PARTIES = 'PARTIES',
  TERMS = 'TERMS',
  DELIVERABLES = 'DELIVERABLES',
  PAYMENT_KW = 'PAYMENT_KW',
  DISPUTE_KW = 'DISPUTE_KW',
  SUBSCRIBERS = 'SUBSCRIBERS',

  // Reputation / Subscription / Dispute keywords (Phase 7.2)
  SUBSCRIPTION_KW = 'SUBSCRIPTION_KW',
  AUTO_RENEW = 'AUTO_RENEW',
  INTERVAL = 'INTERVAL',
  PERKS = 'PERKS',
  PROVIDER_KW = 'PROVIDER_KW',
  SUBSCRIBER_KW = 'SUBSCRIBER_KW',
  HALF_LIFE = 'HALF_LIFE',
  MATURE_THRESHOLD = 'MATURE_THRESHOLD',
  RESOLUTION_KW = 'RESOLUTION_KW',
  STATES_KW = 'STATES_KW',

  // Semantic operating environment keywords
  SESSION = 'SESSION',
  COMPILER_KW = 'COMPILER_KW',
  TOOLS = 'TOOLS',
  MEMORY = 'MEMORY',
  PERSIST = 'PERSIST',
  FROM = 'FROM',
  TO = 'TO',
  EXTRACT = 'EXTRACT',
  VALIDATE = 'VALIDATE',
  ENRICH = 'ENRICH',
  INFER = 'INFER',
  SUGGEST = 'SUGGEST',
  GENERATE = 'GENERATE',
  DETECT = 'DETECT',
  PRESERVE = 'PRESERVE',

  // Type keywords
  TYPE_STRING = 'TYPE_STRING',
  TYPE_NUMBER = 'TYPE_NUMBER',
  TYPE_FLOAT = 'TYPE_FLOAT',
  TYPE_BOOL = 'TYPE_BOOL',
  TYPE_DATE = 'TYPE_DATE',
  TYPE_DATETIME = 'TYPE_DATETIME',
  TYPE_JSON = 'TYPE_JSON',
  TYPE_ID = 'TYPE_ID',

  // Literals
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  FULL = 'FULL',

  // New Gap keywords
  IMPL_KW = 'IMPL_KW',
  EMIT_KW = 'EMIT_KW',
  PREFERENCE_KW = 'PREFERENCE_KW',
  TYPE_KW = 'TYPE_KW',
  KEY_KW = 'KEY_KW',
  SINGLETON_KW = 'SINGLETON_KW',

  // Symbols
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COLON = 'COLON',
  COMMA = 'COMMA',
  EQUALS = 'EQUALS',
  DOT = 'DOT',
  ARROW = 'ARROW',
  GT = 'GT',
  LT = 'LT',
  GTE = 'GTE',
  LTE = 'LTE',
  NEQ = 'NEQ',
  EQ_EQ = 'EQ_EQ',
  PIPE = 'PIPE',

  // THEME declaration keywords
  PALETTE_KW = 'PALETTE_KW',
  ACCENT_KW = 'ACCENT_KW',
  BACKGROUND_KW = 'BACKGROUND_KW',
  FONT_KW = 'FONT_KW',
  DENSITY_KW = 'DENSITY_KW',
  MOTIF_KW = 'MOTIF_KW',
  RADIUS_KW = 'RADIUS_KW',

  // Extended VIEW keywords
  SUBTITLE_KW = 'SUBTITLE_KW',
  EMOJI_KW = 'EMOJI_KW',
  COLUMNS_KW = 'COLUMNS_KW',
  FEATURED_KW = 'FEATURED_KW',

  // Layout values
  LAYOUT_TABLE = 'LAYOUT_TABLE',
  LAYOUT_FORM = 'LAYOUT_FORM',
  LAYOUT_DETAIL = 'LAYOUT_DETAIL',
  LAYOUT_CARDS = 'LAYOUT_CARDS',
  LAYOUT_SPLIT = 'LAYOUT_SPLIT',
  LAYOUT_CUSTOM = 'LAYOUT_CUSTOM',
  LAYOUT_DOCUMENT_EDITOR = 'LAYOUT_DOCUMENT_EDITOR',
  LAYOUT_SETTINGS = 'LAYOUT_SETTINGS',
  LAYOUT_HERO = 'LAYOUT_HERO',
  LAYOUT_GALLERY = 'LAYOUT_GALLERY',
  LAYOUT_LANDING = 'LAYOUT_LANDING',
  LAYOUT_DASHBOARD = 'LAYOUT_DASHBOARD',

  // On-fail values
  FAIL_STOP = 'FAIL_STOP',
  FAIL_SKIP = 'FAIL_SKIP',
  FAIL_RETRY = 'FAIL_RETRY',
  FAIL_FALLBACK = 'FAIL_FALLBACK',

  // Symbols (additional)
  SLASH = 'SLASH',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',

  // Other
  IDENTIFIER = 'IDENTIFIER',
  DIMENSION = 'DIMENSION', // e.g., 1200x800
  EOF = 'EOF',
}

const KEYWORDS: Record<string, TokenType> = {
  APP: TokenType.APP,
  ENTITY: TokenType.ENTITY,
  ACTION: TokenType.ACTION,
  VIEW: TokenType.VIEW,
  AI_SERVICE: TokenType.AI_SERVICE,
  TEST: TokenType.TEST,
  RULE: TokenType.RULE,
  WORKFLOW: TokenType.WORKFLOW,
  TIMESTAMPS: TokenType.TIMESTAMPS,
  CRUD: TokenType.CRUD,
  BELONGS_TO: TokenType.BELONGS_TO,
  HAS_MANY: TokenType.HAS_MANY,
  REQUIRED: TokenType.REQUIRED,
  UNIQUE: TokenType.UNIQUE,
  INDEX: TokenType.INDEX,
  ORDER: TokenType.ORDER,
  ASC: TokenType.ASC,
  DESC: TokenType.DESC,
  SEED: TokenType.SEED,
  TITLE: TokenType.TITLE,
  WINDOW: TokenType.WINDOW,
  DB: TokenType.DB,
  PORT: TokenType.PORT,
  THEME: TokenType.THEME,
  ICON: TokenType.ICON,
  CURRENT: TokenType.CURRENT,
  WORKSPACES: TokenType.WORKSPACES,
  TRAY: TokenType.TRAY,
  HOTKEY: TokenType.HOTKEY,
  INPUT: TokenType.INPUT,
  OUTPUT: TokenType.OUTPUT,
  AI: TokenType.AI,
  STREAM: TokenType.STREAM,
  LAYOUT: TokenType.LAYOUT,
  ACTIONS: TokenType.ACTIONS,
  SIDEBAR: TokenType.SIDEBAR,
  FIELDS: TokenType.FIELDS,
  PROVIDERS: TokenType.PROVIDERS,
  KEYS_FILE: TokenType.KEYS_FILE,
  DEFAULT: TokenType.DEFAULT,
  STREAMING: TokenType.STREAMING,
  MODELS: TokenType.MODELS,
  LABEL: TokenType.LABEL,
  GIVEN: TokenType.GIVEN,
  EXPECT: TokenType.EXPECT,
  IS: TokenType.IS,
  NOT: TokenType.NOT,
  NULL: TokenType.NULL,
  CONTAINS: TokenType.CONTAINS,
  MATCHES: TokenType.MATCHES,
  HAS_LENGTH: TokenType.HAS_LENGTH,
  WHEN: TokenType.WHEN,
  AND: TokenType.AND,
  OR: TokenType.OR,
  UNLESS: TokenType.UNLESS,
  THEN: TokenType.THEN,
  PRIORITY: TokenType.PRIORITY,
  STEP: TokenType.STEP,
  ON_FAIL: TokenType.ON_FAIL,
  PARALLEL: TokenType.PARALLEL,
  FACT: TokenType.FACT,
  STATE: TokenType.STATE,
  PATTERN: TokenType.PATTERN,
  SCORE: TokenType.SCORE,
  MODULE: TokenType.MODULE,
  INITIAL: TokenType.INITIAL,
  TRANSITION: TokenType.TRANSITION,
  ON_ENTER: TokenType.ON_ENTER,
  ON_EXIT: TokenType.ON_EXIT,
  MATCH: TokenType.MATCH,
  RESPOND: TokenType.RESPOND,
  ASSERT: TokenType.ASSERT,
  RETRACT: TokenType.RETRACT,
  CATEGORY: TokenType.CATEGORY,
  PERSISTENT: TokenType.PERSISTENT,
  THRESHOLD: TokenType.THRESHOLD,
  AT: TokenType.AT,
  MIN: TokenType.MIN,
  MAX: TokenType.MAX,
  DECAY: TokenType.DECAY,
  PER: TokenType.PER,
  DESCRIPTION: TokenType.DESCRIPTION,
  ACTIVATE_WHEN: TokenType.ACTIVATE_WHEN,
  DEACTIVATE_WHEN: TokenType.DEACTIVATE_WHEN,
  PIPELINE: TokenType.PIPELINE,
  ROW: TokenType.ROW,
  CONNECTION: TokenType.CONNECTION,
  QC: TokenType.QC,
  VAULT: TokenType.VAULT,
  CONFIG: TokenType.CONFIG,
  MODEL: TokenType.MODEL,
  PROMPT: TokenType.PROMPT,
  TAGS: TokenType.TAGS,
  OUTPUT_TYPE: TokenType.OUTPUT_TYPE,
  SPC: TokenType.SPC,
  YOUNG_THRESHOLD: TokenType.YOUNG_THRESHOLD,
  MATURING_THRESHOLD: TokenType.MATURING_THRESHOLD,
  YOUNG_PASS_RATE: TokenType.YOUNG_PASS_RATE,
  MATURE_PASS_RATE: TokenType.MATURE_PASS_RATE,
  MATURING_SAMPLE: TokenType.MATURING_SAMPLE,
  MATURE_SAMPLE: TokenType.MATURE_SAMPLE,
  PATH: TokenType.PATH,
  ASSET_TYPES: TokenType.ASSET_TYPES,
  PROVENANCE: TokenType.IDENTIFIER,
  ROUTER: TokenType.ROUTER,
  SKILL: TokenType.SKILL,
  SKILLDOC: TokenType.SKILLDOC,
  LIFECYCLE: TokenType.LIFECYCLE,
  BREED: TokenType.BREED,
  GOVERNANCE: TokenType.GOVERNANCE,
  COMPRESSION: TokenType.COMPRESSION,
  CONTENT: TokenType.CONTENT_KW,
  VERSION: TokenType.VERSION,
  SIGNED_BY: TokenType.SIGNED_BY,
  REQUIRE: TokenType.REQUIRE_KW,
  EXECUTE_ONLY: TokenType.EXECUTE_ONLY,
  DISALLOW: TokenType.DISALLOW,
  AUDIT: TokenType.AUDIT,
  SEMANTIC_DENSITY: TokenType.SEMANTIC_DENSITY,
  INTENT_PRESERVATION: TokenType.INTENT_PRESERVATION,
  TOKEN_EFFICIENCY: TokenType.TOKEN_EFFICIENCY,
  REASONER: TokenType.REASONER,
  USES: TokenType.USES,
  FILTER: TokenType.FILTER,
  SCHEDULE: TokenType.SCHEDULE,
  TELEMETRY: TokenType.TELEMETRY,
  TRIGGER: TokenType.TRIGGER,
  FIRES: TokenType.FIRES,
  DEBOUNCE: TokenType.DEBOUNCE,
  RATE_LIMIT: TokenType.RATE_LIMIT,
  IDEMPOTENT: TokenType.IDEMPOTENT,
  ORDERING: TokenType.ORDERING,
  DEAD_LETTER: TokenType.DEAD_LETTER,
  CIRCUIT_BREAKER: TokenType.CIRCUIT_BREAKER,
  FALLBACK: TokenType.FALLBACK,
  TIER: TokenType.TIER,
  STRENGTHS: TokenType.STRENGTHS,
  COST: TokenType.COST,
  CONTEXT: TokenType.CONTEXT,
  TASK_TYPES: TokenType.TASK_TYPES,
  MOSH_PIT: TokenType.MOSH_PIT,
  KEYWORDS: TokenType.KEYWORDS,
  DOMAIN: TokenType.DOMAIN,
  STALENESS_WINDOW: TokenType.STALENESS_WINDOW,
  STALENESS_DROP: TokenType.STALENESS_DROP,
  MIN_LIFETIME: TokenType.MIN_LIFETIME,
  MAX_INSTANCES: TokenType.MAX_INSTANCES,
  INHERITANCE: TokenType.INHERITANCE,
  MIN_FITNESS: TokenType.MIN_FITNESS,
  COOLDOWN: TokenType.COOLDOWN_KW,
  FITNESS: TokenType.FITNESS,
  PREFER: TokenType.PREFER,
  DIVERSITY_MIN: TokenType.DIVERSITY_MIN,
  PERSIST_AFTER: TokenType.PERSIST_AFTER,
  EXTINCT_AFTER: TokenType.EXTINCT_AFTER,
  PAIRING: TokenType.IDENTIFIER,
  TRAITS: TokenType.IDENTIFIER,
  ESCALATION: TokenType.IDENTIFIER,
  PACKET: TokenType.PACKET,
  AUTHORITY: TokenType.AUTHORITY_KW,
  CHANNEL: TokenType.CHANNEL,
  PAYLOAD: TokenType.PAYLOAD,
  PROTOCOL: TokenType.PROTOCOL,
  DIRECTION: TokenType.DIRECTION,
  ENDPOINT: TokenType.ENDPOINT,
  RETRY: TokenType.RETRY,
  TIMEOUT: TokenType.TIMEOUT,
  SIGNING: TokenType.SIGNING,
  ALGORITHM: TokenType.ALGORITHM,
  VERIFY_CHAIN: TokenType.VERIFY_CHAIN,
  VALIDATION: TokenType.VALIDATION,
  TTL: TokenType.TTL,
  LEVELS: TokenType.IDENTIFIER,
  ADMISSIBILITY: TokenType.IDENTIFIER,
  IDENTITY: TokenType.IDENTITY,
  FEED: TokenType.FEED,
  PROFILE: TokenType.PROFILE,
  SIGNING_KEY: TokenType.SIGNING_KEY,
  DISCOVERABLE: TokenType.DISCOVERABLE,
  PORTABLE: TokenType.PORTABLE,
  SUBSCRIBE: TokenType.SUBSCRIBE,
  SYNDICATE: TokenType.SYNDICATE,
  MAX_ITEMS: TokenType.MAX_ITEMS,
  DISCOVERY: TokenType.DISCOVERY,
  NODE: TokenType.NODE,
  SENSOR: TokenType.SENSOR_KW,
  ZONE: TokenType.ZONE,
  HARDWARE: TokenType.HARDWARE,
  AI_TIER: TokenType.AI_TIER,
  COMMS: TokenType.COMMS,
  SENSORS: TokenType.SENSORS,
  OFFLINE: TokenType.OFFLINE,
  SAFETY: TokenType.SAFETY,
  CAPABILITY: TokenType.CAPABILITY,
  LATENCY: TokenType.LATENCY,
  ACCURACY: TokenType.ACCURACY,
  FAILURE: TokenType.FAILURE,
  BOUNDS: TokenType.BOUNDS,
  NODES: TokenType.NODES,
  AMBIENT: TokenType.AMBIENT,
  CAPACITY: TokenType.CAPACITY,
  HOURS: TokenType.HOURS,
  EVENT: TokenType.EVENT_KW,
  NBVE: TokenType.NBVE_KW,
  CONTRACT: TokenType.CONTRACT_KW,
  REPUTATION: TokenType.REPUTATION_KW,
  PUBLISH: TokenType.PUBLISH,
  SHADOW: TokenType.SHADOW,
  PRODUCTION: TokenType.PRODUCTION_KW,
  CONFIDENCE: TokenType.CONFIDENCE,
  PROMOTION: TokenType.PROMOTION_KW,
  METRICS: TokenType.METRICS,
  AMOUNT: TokenType.AMOUNT,
  CURRENCY: TokenType.CURRENCY,
  RELEASE: TokenType.RELEASE,
  RECURRING: TokenType.RECURRING,
  PARTIES: TokenType.PARTIES,
  TERMS: TokenType.TERMS,
  DELIVERABLES: TokenType.DELIVERABLES,
  PAYMENT: TokenType.PAYMENT_KW,
  DISPUTE: TokenType.DISPUTE_KW,
  SUBSCRIBERS: TokenType.SUBSCRIBERS,
  SUBSCRIPTION: TokenType.SUBSCRIPTION_KW,
  AUTO_RENEW: TokenType.AUTO_RENEW,
  INTERVAL: TokenType.INTERVAL,
  PERKS: TokenType.PERKS,
  PROVIDER: TokenType.PROVIDER_KW,
  SUBSCRIBER: TokenType.SUBSCRIBER_KW,
  HALF_LIFE: TokenType.HALF_LIFE,
  MATURE_THRESHOLD: TokenType.MATURE_THRESHOLD,
  RESOLUTION: TokenType.RESOLUTION_KW,
  STATES: TokenType.STATES_KW,
  SESSION: TokenType.SESSION,
  COMPILER: TokenType.COMPILER_KW,
  TOOLS: TokenType.TOOLS,
  MEMORY: TokenType.MEMORY,
  PERSIST: TokenType.PERSIST,
  FROM: TokenType.FROM,
  TO: TokenType.TO,
  EXTRACT: TokenType.EXTRACT,
  VALIDATE: TokenType.VALIDATE,
  ENRICH: TokenType.ENRICH,
  INFER: TokenType.INFER,
  SUGGEST: TokenType.SUGGEST,
  GENERATE: TokenType.GENERATE,
  DETECT: TokenType.DETECT,
  PRESERVE: TokenType.PRESERVE,
  IMPL: TokenType.IMPL_KW,
  EMIT: TokenType.EMIT_KW,
  PREFERENCE: TokenType.PREFERENCE_KW,
  TYPE: TokenType.TYPE_KW,
  KEY: TokenType.KEY_KW,
  SINGLETON: TokenType.SINGLETON_KW,
  IF: TokenType.IF_KW,
  FLAG: TokenType.FLAG_KW,
  SEVERITY: TokenType.SEVERITY_KW,
  APPLIES_TO: TokenType.APPLIES_TO_KW,
  LOG: TokenType.LOG_KW,
  LEVEL: TokenType.LEVEL_KW,
  TARGET: TokenType.TARGET_KW,
  ROTATE: TokenType.ROTATE_KW,
  MACRO: TokenType.MACRO_KW,
  MACRO_REGISTRY: TokenType.MACRO_REGISTRY_KW,
  EXPOSES: TokenType.EXPOSES_KW,
  INVOKES: TokenType.INVOKES_KW,
  BINDING: TokenType.BINDING_KW,
  ACTUATOR: TokenType.ACTUATOR_KW,
  SAFE_STATE: TokenType.SAFE_STATE_KW,
  SLEW_RATE: TokenType.SLEW_RATE_KW,
  MAX_CURRENT: TokenType.MAX_CURRENT_KW,
  PLATFORM: TokenType.PLATFORM_KW,
  CHIP: TokenType.CHIP_KW,
  OS: TokenType.OS_KW,
  AI_RUNTIME: TokenType.AI_RUNTIME_KW,
  CROSS_TARGET: TokenType.CROSS_TARGET_KW,
  NULLCLAW: TokenType.NULLCLAW_KW,
  PERSONALITY: TokenType.PERSONALITY_KW,
  BRAIN_BODY: TokenType.BRAIN_BODY_KW,
  BAUD: TokenType.BAUD_KW,
  HEARTBEAT: TokenType.HEARTBEAT_KW,
  WATCHDOG: TokenType.WATCHDOG_KW,
  COMMANDS: TokenType.COMMANDS_KW,
  ESTOP: TokenType.ESTOP_KW,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  full: TokenType.FULL,
  string: TokenType.TYPE_STRING,
  number: TokenType.TYPE_NUMBER,
  float: TokenType.TYPE_FLOAT,
  bool: TokenType.TYPE_BOOL,
  date: TokenType.TYPE_DATE,
  datetime: TokenType.TYPE_DATETIME,
  json: TokenType.TYPE_JSON,
  id: TokenType.TYPE_ID,
  table: TokenType.LAYOUT_TABLE,
  form: TokenType.LAYOUT_FORM,
  detail: TokenType.LAYOUT_DETAIL,
  cards: TokenType.LAYOUT_CARDS,
  split: TokenType.LAYOUT_SPLIT,
  custom: TokenType.LAYOUT_CUSTOM,
  document_editor: TokenType.LAYOUT_DOCUMENT_EDITOR,
  settings: TokenType.LAYOUT_SETTINGS,
  hero: TokenType.LAYOUT_HERO,
  gallery: TokenType.LAYOUT_GALLERY,
  landing: TokenType.LAYOUT_LANDING,
  dashboard: TokenType.LAYOUT_DASHBOARD,
  PALETTE: TokenType.PALETTE_KW,
  ACCENT: TokenType.ACCENT_KW,
  BACKGROUND: TokenType.BACKGROUND_KW,
  FONT: TokenType.FONT_KW,
  DENSITY: TokenType.DENSITY_KW,
  MOTIF: TokenType.MOTIF_KW,
  RADIUS: TokenType.RADIUS_KW,
  SUBTITLE: TokenType.SUBTITLE_KW,
  EMOJI: TokenType.EMOJI_KW,
  COLUMNS: TokenType.COLUMNS_KW,
  FEATURED: TokenType.FEATURED_KW,
  stop: TokenType.FAIL_STOP,
  skip: TokenType.FAIL_SKIP,
  retry: TokenType.FAIL_RETRY,
  fallback: TokenType.FAIL_FALLBACK,
  frameless: TokenType.IDENTIFIER,
  dark: TokenType.IDENTIFIER,
  light: TokenType.IDENTIFIER,
  system: TokenType.IDENTIFIER,
  icon: TokenType.IDENTIFIER,
  create: TokenType.IDENTIFIER,
  read: TokenType.IDENTIFIER,
  update: TokenType.IDENTIFIER,
  delete: TokenType.IDENTIFIER,
  list: TokenType.IDENTIFIER,
};

export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}

export class LexerError extends Error {
  location: SourceLocation;
  constructor(message: string, location: SourceLocation) {
    super(`${message} at line ${location.line}, column ${location.column}`);
    this.location = location;
  }
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      // Skip comments
      if (this.peek() === '/' && this.peekNext() === '/') {
        this.skipLineComment();
        continue;
      }
      if (this.peek() === '/' && this.peekNext() === '*') {
        this.skipBlockComment();
        continue;
      }
      // # single-line comment (also ## double-hash)
      if (this.peek() === '#') {
        this.skipLineComment();
        continue;
      }

      const ch = this.peek();

      if (ch === '{') { this.addToken(TokenType.LBRACE, '{'); this.advance(); continue; }
      if (ch === '}') { this.addToken(TokenType.RBRACE, '}'); this.advance(); continue; }
      if (ch === ':') { this.addToken(TokenType.COLON, ':'); this.advance(); continue; }
      if (ch === ',') { this.addToken(TokenType.COMMA, ','); this.advance(); continue; }
      if (ch === '.') { this.addToken(TokenType.DOT, '.'); this.advance(); continue; }
      if (ch === '|') { this.addToken(TokenType.PIPE, '|'); this.advance(); continue; }
      if (ch === '/') { this.addToken(TokenType.SLASH, '/'); this.advance(); continue; }

      // Bracket tokens: [] is JSON literal shorthand, [x] is a list
      if (ch === '[') {
        if (this.peekNext() === ']') {
          this.addToken(TokenType.STRING_LITERAL, '[]');
          this.advance(); this.advance();
        } else {
          this.addToken(TokenType.LBRACKET, '[');
          this.advance();
        }
        continue;
      }
      if (ch === ']') { this.addToken(TokenType.RBRACKET, ']'); this.advance(); continue; }

      // Multi-char operators
      if (ch === '-' && this.peekNext() === '>') {
        this.addToken(TokenType.ARROW, '->');
        this.advance(); this.advance();
        continue;
      }
      if (ch === '=' && this.peekNext() === '=') {
        this.addToken(TokenType.EQ_EQ, '==');
        this.advance(); this.advance();
        continue;
      }
      if (ch === '!' && this.peekNext() === '=') {
        this.addToken(TokenType.NEQ, '!=');
        this.advance(); this.advance();
        continue;
      }
      if (ch === '>' && this.peekNext() === '=') {
        this.addToken(TokenType.GTE, '>=');
        this.advance(); this.advance();
        continue;
      }
      if (ch === '<' && this.peekNext() === '=') {
        this.addToken(TokenType.LTE, '<=');
        this.advance(); this.advance();
        continue;
      }
      if (ch === '>') { this.addToken(TokenType.GT, '>'); this.advance(); continue; }
      if (ch === '<') { this.addToken(TokenType.LT, '<'); this.advance(); continue; }
      if (ch === '=') { this.addToken(TokenType.EQUALS, '='); this.advance(); continue; }

      // String literals — triple-quoted first (multi-line)
      if (ch === '"' && this.source[this.pos + 1] === '"' && this.source[this.pos + 2] === '"') {
        this.readTripleQuotedString();
        continue;
      }
      if (ch === '"') {
        this.readString();
        continue;
      }

      // Numbers (including negative)
      if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peekNext()))) {
        this.readNumber();
        continue;
      }

      // Identifiers and keywords
      if (this.isAlpha(ch) || ch === '_' || ch === '%') {
        this.readIdentifier();
        continue;
      }

      throw new LexerError(`Unexpected character: '${ch}'`, this.location());
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  private peek(): string {
    return this.source[this.pos] ?? '';
  }

  private peekNext(): string {
    return this.source[this.pos + 1] ?? '';
  }

  private advance(): string {
    const ch = this.source[this.pos];
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch ?? '';
  }

  private location(): SourceLocation {
    return { line: this.line, column: this.column };
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, location: this.location() });
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  private skipLineComment(): void {
    while (this.pos < this.source.length && this.peek() !== '\n') {
      this.advance();
    }
  }

  private skipBlockComment(): void {
    this.advance(); // /
    this.advance(); // *
    while (this.pos < this.source.length) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); this.advance();
        return;
      }
      this.advance();
    }
    throw new LexerError('Unterminated block comment', this.location());
  }

  private readTripleQuotedString(): void {
    const loc = this.location();
    // Consume opening """
    this.advance(); this.advance(); this.advance();
    let value = '';
    while (this.pos < this.source.length) {
      // Check for closing """
      if (this.peek() === '"' && this.source[this.pos + 1] === '"' && this.source[this.pos + 2] === '"') {
        this.advance(); this.advance(); this.advance(); // consume """
        this.tokens.push({ type: TokenType.STRING_LITERAL, value, location: loc });
        return;
      }
      // Preserve all characters raw (newlines, em dashes, dollar signs, etc.)
      value += this.advance();
    }
    throw new LexerError('Unterminated triple-quoted string literal', loc);
  }

  private readString(): void {
    const loc = this.location();
    this.advance(); // opening "
    let value = '';
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const esc = this.advance();
        if (esc === 'n') value += '\n';
        else if (esc === 't') value += '\t';
        else if (esc === '"') value += '"';
        else if (esc === '\\') value += '\\';
        else value += esc;
      } else {
        value += this.advance();
      }
    }
    if (this.pos >= this.source.length) {
      throw new LexerError('Unterminated string literal', loc);
    }
    this.advance(); // closing "
    this.tokens.push({ type: TokenType.STRING_LITERAL, value, location: loc });
  }

  private readNumber(): void {
    const loc = this.location();
    let value = '';
    if (this.peek() === '-') {
      value += this.advance();
    }
    while (this.pos < this.source.length && this.isDigit(this.peek())) {
      value += this.advance();
    }
    // Check for dimension (e.g., 1200x800)
    if (this.peek() === 'x' && this.isDigit(this.peekNext())) {
      value += this.advance(); // x
      while (this.pos < this.source.length && this.isDigit(this.peek())) {
        value += this.advance();
      }
      this.tokens.push({ type: TokenType.DIMENSION, value, location: loc });
      return;
    }
    // Check for float
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (this.pos < this.source.length && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    this.tokens.push({ type: TokenType.NUMBER_LITERAL, value, location: loc });
  }

  private readIdentifier(): void {
    const loc = this.location();
    let value = '';
    while (
      this.pos < this.source.length &&
      (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '%' ||
       this.peek() === '/' || this.peek() === '\\' || this.peek() === '.' || this.peek() === '-')
    ) {
      // Stop at dot if next char would start a new identifier context (entity.field)
      if (this.peek() === '.' && !value.includes('%') && !value.includes('/') && !value.includes('\\')) {
        // Check if this looks like a file path or entity.field
        const restOfWord = this.lookAheadWord(1);
        if (restOfWord && !restOfWord.includes('/') && !restOfWord.includes('\\')) {
          break; // entity.field notation - stop before dot
        }
      }
      value += this.advance();
    }

    // Check for keyword
    const keyword = KEYWORDS[value];
    if (keyword !== undefined) {
      this.tokens.push({ type: keyword, value, location: loc });
    } else {
      this.tokens.push({ type: TokenType.IDENTIFIER, value, location: loc });
    }
  }

  private lookAheadWord(offset: number): string | null {
    let p = this.pos + offset;
    let word = '';
    while (p < this.source.length && (this.isAlphaNumeric(this.source[p]!) || this.source[p] === '_')) {
      word += this.source[p];
      p++;
    }
    return word || null;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }
}
