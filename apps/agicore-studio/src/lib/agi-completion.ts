// Context-aware autocomplete for the .agi DSL.
//
// Without a Lezer AST we can't lean on a structural tree — but the
// grammar is regular enough that a short scan backwards from the
// cursor tells us where we are. That's all this file does: find the
// enclosing block, identify whether the cursor sits at "field key
// position" (top of a line, ready to start a field) or "field value
// position" (after a known field keyword), and serve the relevant
// completions.
//
// The completion catalogues live as plain arrays at the bottom of the
// file. Adding a new node type or keyword = add to one list.
//
// When the Lezer migration lands (a later Alpha sprint), this whole
// file gets replaced by a tree-walking version that's smarter and
// requires no scanning. The catalogues survive.

import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

// ----- Context detection -----

type EnclosingBlock =
  | { kind: 'file' }
  | { kind: 'workflow' }
  | { kind: 'node' }
  | { kind: 'entity' }
  | { kind: 'action' }
  | { kind: 'ai_service' }
  | { kind: 'module' }
  | { kind: 'view' }
  | { kind: 'test' }
  | { kind: 'state' }
  | { kind: 'pattern' }
  | { kind: 'unknown_block' };

interface LineContext {
  /** Text from the start of the current logical line up to the cursor. */
  prefix: string;
  /** First whitespace-stripped word on the line, if any. */
  leadingWord: string | null;
  /** True if the cursor is past the leading word (so we're in "value" position). */
  pastLeadingWord: boolean;
}

interface Context {
  enclosing: EnclosingBlock;
  line: LineContext;
}

function detectEnclosingBlock(doc: string, pos: number): EnclosingBlock {
  // Walk backwards counting unmatched opens.
  //
  // Caveat: doesn't track string boundaries. A `{` or `}` inside a
  // string literal will confuse the depth counter. Rare in practice
  // for .agi (URLs, prompts — neither uses curly braces semantically),
  // and the Lezer pass will get this right when it lands.
  let depth = 0;
  let i = pos - 1;
  let openAt = -1;

  while (i >= 0) {
    const ch = doc[i];
    if (ch === '}') {
      depth += 1;
    } else if (ch === '{') {
      if (depth === 0) {
        openAt = i;
        break;
      }
      depth -= 1;
    }
    i -= 1;
  }
  if (openAt === -1) return { kind: 'file' };

  // Look backwards from openAt for the keyword that owns this block.
  // The pattern we emit and accept is `KEYWORD <name> {` so the keyword
  // is the first word on the same line as the opening brace.
  const lineStart = lastIndexOfNewline(doc, openAt) + 1;
  const lineToOpen = doc.slice(lineStart, openAt);
  const firstWord = lineToOpen.trim().split(/\s+/)[0] ?? '';

  switch (firstWord.toUpperCase()) {
    case 'WORKFLOW':   return { kind: 'workflow' };
    case 'NODE':       return { kind: 'node' };
    case 'ENTITY':     return { kind: 'entity' };
    case 'ACTION':     return { kind: 'action' };
    case 'AI_SERVICE': return { kind: 'ai_service' };
    case 'MODULE':     return { kind: 'module' };
    case 'VIEW':       return { kind: 'view' };
    case 'TEST':       return { kind: 'test' };
    case 'STATE':      return { kind: 'state' };
    case 'PATTERN':    return { kind: 'pattern' };
    case 'APP':        return { kind: 'unknown_block' };  // APP fields are flat
    default:           return { kind: 'unknown_block' };
  }
}

function detectLineContext(doc: string, pos: number): LineContext {
  const lineStart = lastIndexOfNewline(doc, pos) + 1;
  const prefix = doc.slice(lineStart, pos);
  const trimmed = prefix.trimStart();
  const wordMatch = trimmed.match(/^([A-Z_$][A-Z0-9_$]*)/);
  if (!wordMatch) {
    return { prefix, leadingWord: null, pastLeadingWord: false };
  }
  const word = wordMatch[1];
  const wordEnd = (prefix.length - trimmed.length) + word.length;
  return {
    prefix,
    leadingWord: word,
    pastLeadingWord: pos - lineStart > wordEnd, // cursor sits past the word
  };
}

function lastIndexOfNewline(doc: string, before: number): number {
  for (let i = before - 1; i >= 0; i -= 1) {
    if (doc[i] === '\n') return i;
  }
  return -1;
}

// ----- Workflow-aware extraction -----

/** All NODE-block names declared anywhere in the doc. */
function declaredNodeNames(doc: string): string[] {
  const re = /^\s*NODE\s+(\w+)\s*\{/gm;
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc)) !== null) {
    names.add(m[1]);
  }
  return [...names];
}

// ----- The CompletionSource -----

export function agiCompletion(ctx: CompletionContext): CompletionResult | null {
  const doc = ctx.state.doc.toString();
  const pos = ctx.pos;
  const enclosing = detectEnclosingBlock(doc, pos);
  const line = detectLineContext(doc, pos);

  // Decide what to suggest.
  let options: Completion[] | null = null;
  let from = ctx.matchBefore(/[A-Za-z_$][\w$]*$/)?.from ?? pos;

  // ----- VALUE POSITION (after a known field keyword on the same line) -----
  if (line.leadingWord && line.pastLeadingWord) {
    options = valueCompletionsFor(line.leadingWord, enclosing, doc);
  }

  // ----- KEY POSITION (start of line) -----
  if (!options) {
    options = keyCompletionsFor(enclosing);
  }

  if (!options || options.length === 0) return null;

  // Only show the popup if the user typed a letter or explicitly invoked
  // completion. Without this every cursor move surfaces the menu.
  if (!ctx.explicit && from === pos) return null;

  return { from, options };
}

function keyCompletionsFor(enclosing: EnclosingBlock): Completion[] {
  switch (enclosing.kind) {
    case 'file':
      return TOP_LEVEL_DECLARATIONS;
    case 'workflow':
      return WORKFLOW_KEYWORDS;
    case 'node':
      return NODE_KEYWORDS;
    case 'entity':
      return ENTITY_KEYWORDS;
    case 'action':
      return ACTION_KEYWORDS;
    case 'ai_service':
      return AI_SERVICE_KEYWORDS;
    case 'module':
      return MODULE_KEYWORDS;
    case 'view':
      return VIEW_KEYWORDS;
    case 'state':
      return STATE_KEYWORDS;
    case 'pattern':
      return PATTERN_KEYWORDS;
    case 'test':
      return TEST_KEYWORDS;
    case 'unknown_block':
      return [];
  }
}

function valueCompletionsFor(
  field: string,
  enclosing: EnclosingBlock,
  doc: string,
): Completion[] | null {
  const upper = field.toUpperCase();

  // NODE block — context-sensitive value catalogues
  if (enclosing.kind === 'node') {
    if (upper === 'TYPE')   return NODE_TYPE_VALUES;
    if (upper === 'METHOD') return HTTP_METHOD_VALUES;
  }

  // Workflow body — EDGE references node names dynamically
  if (enclosing.kind === 'workflow' && upper === 'EDGE') {
    return declaredNodeNames(doc).map((name) => ({
      label: name,
      type: 'variable',
      info: 'declared node',
    }));
  }

  // ENTITY field — colon-prefixed type position
  if (enclosing.kind === 'entity') {
    // Field type position is "name: " — heuristic: if the prefix
    // contains a colon after the leading word, suggest primitive types.
    // (Detection isn't perfect here; the Lezer pass will fix it.)
    return PRIMITIVE_TYPES;
  }

  // ACTION INPUT/OUTPUT lines — primitive types after colon
  if (enclosing.kind === 'action' && (upper === 'INPUT' || upper === 'OUTPUT')) {
    return PRIMITIVE_TYPES;
  }

  return null;
}

// ============================================================================
// Catalogues
// ============================================================================

const k = (label: string, info: string, detail = 'keyword'): Completion =>
  ({ label, info, detail, type: 'keyword' });

const v = (label: string, info: string): Completion =>
  ({ label, info, type: 'variable' });

const t = (label: string, info: string): Completion =>
  ({ label, info, type: 'type' });

const TOP_LEVEL_DECLARATIONS: Completion[] = [
  k('APP',         'Application configuration block'),
  k('ENTITY',      'Data-model declaration'),
  k('ACTION',      'Custom command beyond standard CRUD'),
  k('VIEW',        'UI scaffolding for an entity or custom view'),
  k('WORKFLOW',    'Multi-step workflow with nodes and edges'),
  k('PIPELINE',    'Orchestration pipeline'),
  k('ROUTER',      'Cooperative-intelligence routing tiers'),
  k('AI_SERVICE',  'AI provider abstraction (optional)'),
  k('TEST',        'Validation assertion block'),
  k('MODULE',      'Composable expert-system module'),
  k('STATE',       'Expert-system state machine'),
  k('PATTERN',     'Expert-system pattern-matching rule'),
  k('SCORE',       'Named score with thresholds'),
  k('SKILL',       'Domain expertise skill document'),
  k('COMPILER',    'Semantic state transformation'),
  k('VAULT',       'Shared asset storage'),
  k('SESSION',     'Semantic operating mode'),
  k('PERSONA',     'LLM-driven persona'),
  k('PERIPHERAL',  'Cross-platform deterministic hardware sim'),
];

const WORKFLOW_KEYWORDS: Completion[] = [
  k('DESCRIPTION', 'Human-readable description'),
  k('INPUT',       'Declare workflow inputs (name: type, ...)'),
  k('OUTPUT',      'Declare workflow outputs (name: type, ...)'),
  k('NODE',        'Begin a node block'),
  k('EDGE',        'Connect two nodes: EDGE source -> target [WHEN ...]'),
];

const NODE_KEYWORDS: Completion[] = [
  k('TYPE',        'Node kind: http_call | ai_call | qc_checkpoint | branch | start | end'),
  k('METHOD',      'HTTP verb (for http_call nodes)'),
  k('URL',         'Target URL with {{templating}}'),
  k('BODY',        'Request body (for write methods)'),
  k('PROMPT',      'Prompt template (ai_call / qc_checkpoint)'),
  k('WHEN',        'Conditional expression'),
  k('INPUT',       'Node input field'),
  k('OUTPUT',      'Node output field'),
];

const ENTITY_KEYWORDS: Completion[] = [
  k('BELONGS_TO',  'Foreign-key relationship'),
  k('HAS_MANY',    'Reverse list query'),
  k('TIMESTAMPS',  'Adds created_at + updated_at'),
  k('CRUD',        'Specify CRUD operation set'),
  k('ORDER',       'Default sort order (ASC | DESC)'),
  k('SEED',        'Initial data on migration'),
  k('REQUIRED',    'NOT NULL modifier'),
  k('UNIQUE',      'Unique-constraint modifier'),
  k('INDEX',       'Add database index'),
];

const ACTION_KEYWORDS: Completion[] = [
  k('INPUT',  'Action input parameter'),
  k('OUTPUT', 'Action return type'),
  k('AI',     'AI prompt template'),
  k('STREAM', 'Streaming response (true | false)'),
];

const AI_SERVICE_KEYWORDS: Completion[] = [
  k('PROVIDERS', 'Comma-separated provider list (anthropic, openai, google, ...)'),
  k('KEYS_FILE', 'Path to the api-keys JSON file'),
  k('DEFAULT',   'Default provider'),
  k('STREAMING', 'Enable streaming responses'),
  k('MODELS',    'Model declarations'),
  k('OPTIONAL',  'Whether the AI service is required for the app to run'),
];

const MODULE_KEYWORDS: Completion[] = [
  k('DESCRIPTION',     'Human description of the module'),
  k('ACTIVATE_WHEN',   'Condition that admits the module'),
  k('DEACTIVATE_WHEN', 'Condition that retires the module'),
  k('STATE',           'Nested state machine'),
  k('PATTERN',         'Nested pattern declaration'),
  k('SCORE',           'Nested score declaration'),
];

const VIEW_KEYWORDS: Completion[] = [
  k('ENTITY',  'Linked entity (auto-wires data)'),
  k('LAYOUT',  'table | form | detail | cards | split | custom'),
  k('ACTIONS', 'Comma-separated action list'),
  k('SIDEBAR', 'icon: <LucideIconName>'),
  k('FIELDS',  'Visible field list'),
  k('TITLE',   'Display title'),
];

const STATE_KEYWORDS: Completion[] = [
  k('INITIAL',    'Starting state'),
  k('TRANSITION', 'Conditional transition to another state'),
  k('ON_ENTER',   'Action when entering a state'),
  k('ON_EXIT',    'Action when leaving a state'),
];

const PATTERN_KEYWORDS: Completion[] = [
  k('MATCH',    'Regex / keyword pattern'),
  k('WHEN',     'Guard condition'),
  k('RESPOND',  'Response templates (one chosen randomly)'),
  k('SCORE',    'Increment a named score'),
  k('ASSERT',   'Create a fact when this pattern matches'),
  k('PRIORITY', 'Match priority (higher = earlier)'),
  k('CATEGORY', 'Pattern category tag'),
];

const TEST_KEYWORDS: Completion[] = [
  k('GIVEN',  'Setup data'),
  k('EXPECT', 'Assertion'),
];

const NODE_TYPE_VALUES: Completion[] = [
  v('start',          'Workflow entry point'),
  v('http_call',      'HTTP request to an external endpoint'),
  v('ai_call',        'LLM call with a templated prompt'),
  v('qc_checkpoint',  'Pause for human approval (first-class node type)'),
  v('branch',         'Conditional routing'),
  v('end',            'Workflow exit'),
];

const HTTP_METHOD_VALUES: Completion[] = [
  v('GET',    ''),
  v('POST',   ''),
  v('PUT',    ''),
  v('DELETE', ''),
  v('PATCH',  ''),
];

const PRIMITIVE_TYPES: Completion[] = [
  t('string',   'Text value'),
  t('number',   'Integer'),
  t('float',    'Floating point'),
  t('bool',     'Boolean'),
  t('date',     'ISO 8601 date'),
  t('datetime', 'ISO 8601 datetime'),
  t('json',     'JSON blob'),
  t('id',       'UUID v4 primary key'),
];
