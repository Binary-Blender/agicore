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

  // App keywords
  TITLE = 'TITLE',
  WINDOW = 'WINDOW',
  DB = 'DB',
  PORT = 'PORT',
  THEME = 'THEME',
  ICON = 'ICON',

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
  TIER = 'TIER',
  STRENGTHS = 'STRENGTHS',
  COST = 'COST',
  CONTEXT = 'CONTEXT',
  TASK_TYPES = 'TASK_TYPES',
  MOSH_PIT = 'MOSH_PIT',
  KEYWORDS = 'KEYWORDS',
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

  // Layout values
  LAYOUT_TABLE = 'LAYOUT_TABLE',
  LAYOUT_FORM = 'LAYOUT_FORM',
  LAYOUT_DETAIL = 'LAYOUT_DETAIL',
  LAYOUT_CARDS = 'LAYOUT_CARDS',
  LAYOUT_SPLIT = 'LAYOUT_SPLIT',
  LAYOUT_CUSTOM = 'LAYOUT_CUSTOM',

  // On-fail values
  FAIL_STOP = 'FAIL_STOP',
  FAIL_SKIP = 'FAIL_SKIP',
  FAIL_RETRY = 'FAIL_RETRY',
  FAIL_FALLBACK = 'FAIL_FALLBACK',

  // Symbols (additional)
  SLASH = 'SLASH',

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
  TITLE: TokenType.TITLE,
  WINDOW: TokenType.WINDOW,
  DB: TokenType.DB,
  PORT: TokenType.PORT,
  THEME: TokenType.THEME,
  ICON: TokenType.ICON,
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

      const ch = this.peek();

      if (ch === '{') { this.addToken(TokenType.LBRACE, '{'); this.advance(); continue; }
      if (ch === '}') { this.addToken(TokenType.RBRACE, '}'); this.advance(); continue; }
      if (ch === ':') { this.addToken(TokenType.COLON, ':'); this.advance(); continue; }
      if (ch === ',') { this.addToken(TokenType.COMMA, ','); this.advance(); continue; }
      if (ch === '.') { this.addToken(TokenType.DOT, '.'); this.advance(); continue; }
      if (ch === '/') { this.addToken(TokenType.SLASH, '/'); this.advance(); continue; }

      // JSON literal shorthand: [] or {}
      if (ch === '[' && this.peekNext() === ']') {
        this.addToken(TokenType.STRING_LITERAL, '[]');
        this.advance(); this.advance();
        continue;
      }

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

      // String literals
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
