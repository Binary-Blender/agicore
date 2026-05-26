// Minimal CodeMirror 6 language extension for the Agicore DSL.
//
// Sprint 0 scope: tokenizer + highlighter only. No parser, no autocomplete,
// no diagnostics. Validates that CodeMirror 6's extensibility surface is
// adequate for everything MVP will need (it is).
//
// Alpha work: replace this StreamLanguage with a Lezer grammar for proper
// AST-driven features (autocomplete, semantic highlighting, error squiggles).

import { StreamLanguage } from '@codemirror/language';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const KEYWORDS = new Set([
  // Structural
  'APP', 'ENTITY', 'ACTION', 'VIEW', 'WORKFLOW', 'PIPELINE', 'ROUTER',
  'AI_SERVICE', 'TEST', 'STATE', 'PATTERN', 'SCORE', 'MODULE', 'RULE',
  'FACT', 'SKILL', 'COMPILER', 'VAULT', 'SESSION', 'PERSONA', 'PERIPHERAL',
  // Workflow
  'NODE', 'EDGE', 'INPUT', 'OUTPUT', 'TYPE', 'METHOD', 'URL', 'BODY',
  'PROMPT', 'WHEN', 'STREAM', 'AI', 'TIER',
  // Common modifiers
  'TIMESTAMPS', 'BELONGS_TO', 'HAS_MANY', 'CRUD', 'REQUIRED', 'UNIQUE',
  'INDEX', 'DEFAULT', 'ORDER', 'ASC', 'DESC', 'SEED', 'TITLE', 'WINDOW',
  'DB', 'PORT', 'THEME', 'ICON', 'TELEMETRY', 'DESCRIPTION',
  // State machine
  'INITIAL', 'TRANSITION', 'ON_ENTER', 'ON_EXIT',
  // Pattern matching
  'MATCH', 'RESPOND', 'PRIORITY', 'CATEGORY', 'ASSERT', 'THRESHOLD', 'AT',
  'THEN', 'MAX', 'MIN', 'DECAY', 'PER',
  // Tests
  'GIVEN', 'EXPECT', 'CONTAINS', 'MATCHES',
  // Modules
  'ACTIVATE_WHEN', 'DEACTIVATE_WHEN', 'OPTIONAL', 'PROVIDERS', 'KEYS_FILE',
  'MODELS', 'LABEL', 'STATUS', 'FROM',
]);

const PRIMITIVE_TYPES = new Set([
  'string', 'number', 'float', 'bool', 'date', 'datetime', 'json', 'id',
]);

const agiLanguage = StreamLanguage.define({
  name: 'agicore',
  startState: () => ({ inBlockComment: false }),

  token(stream, state) {
    // Block comments
    if (state.inBlockComment) {
      if (stream.match(/[^*]*\*\//)) {
        state.inBlockComment = false;
        return 'comment';
      }
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match('/*')) {
      state.inBlockComment = true;
      stream.skipToEnd();
      return 'comment';
    }

    // Line comments
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }

    if (stream.eatSpace()) return null;

    // String literals
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return 'string';

    // Regex literals (between /.../) — common in PATTERN MATCH
    if (stream.match(/\/(?:[^/\n\\]|\\.)+\/[gimsuy]*/)) return 'string';

    // Numbers
    if (stream.match(/-?\d+(?:\.\d+)?/)) return 'number';

    // Identifiers — distinguish keywords / types / PascalCase names / plain identifiers
    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*\$?/)) {
      const word = stream.current();
      if (KEYWORDS.has(word)) return 'keyword';
      if (PRIMITIVE_TYPES.has(word)) return 'typeName';
      if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) return 'className'; // entity / module / view names
      return 'variableName';
    }

    // Operators and punctuation
    if (stream.match(/->|>=|<=|<>|!=|==|::|[{}()\[\],;:.=<>+\-*\/^?]/)) return 'operator';

    stream.next();
    return null;
  },

  tokenTable: {
    typeName: t.typeName,
    variableName: t.variableName,
    className: t.className,
  },
});

const agiHighlightStyle = HighlightStyle.define([
  { tag: t.keyword,      color: '#a78bfa', fontWeight: '600' },
  { tag: t.typeName,     color: '#f59e0b' },
  { tag: t.className,    color: '#60a5fa' },
  { tag: t.string,       color: '#10b981' },
  { tag: t.number,       color: '#f472b6' },
  { tag: t.comment,      color: '#6b7280', fontStyle: 'italic' },
  { tag: t.operator,     color: '#94a3b8' },
  { tag: t.variableName, color: '#e4e4e7' },
]);

export const agicoreLanguageSupport = () => [
  agiLanguage,
  syntaxHighlighting(agiHighlightStyle),
];
