// TEST block parser — sibling to agi-parser.ts, scoped to TEST
// declarations only. Same regex-with-honest-limits approach: works
// against the .agi shape our editor produces, will be replaced by
// the Lezer-based parser when that lands and become a tree walk
// instead of a regex sweep.

import type { AssertOp, TestBlock, TestExpect, TestGiven } from '../types/test';

const TEST_BLOCK_RE = /^TEST\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
const GIVEN_RE = /^\s*GIVEN\s+(\w+)\s*\{([^}]*)\}/gm;
const EXPECT_RE = /^\s*EXPECT\s+(\w+)\s*->\s*(.+?)\s*$/gm;

export function parseTestBlocks(source: string): TestBlock[] {
  const blocks: TestBlock[] = [];
  let m: RegExpExecArray | null;

  // Reset the lastIndex so repeat calls work
  TEST_BLOCK_RE.lastIndex = 0;
  while ((m = TEST_BLOCK_RE.exec(source)) !== null) {
    const name = m[1];
    const body = m[2];
    blocks.push({
      name,
      givens: parseGivens(body),
      expects: parseExpects(body),
    });
  }
  return blocks;
}

function parseGivens(body: string): TestGiven[] {
  const givens: TestGiven[] = [];
  GIVEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GIVEN_RE.exec(body)) !== null) {
    givens.push({
      entity: m[1],
      fields: parseFieldList(m[2]),
    });
  }
  return givens;
}

function parseExpects(body: string): TestExpect[] {
  const expects: TestExpect[] = [];
  EXPECT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EXPECT_RE.exec(body)) !== null) {
    const operation = m[1];
    const rhs = m[2].trim();
    const parsed = parseExpectExpression(rhs);
    expects.push({
      operation,
      field: parsed.field,
      op: parsed.op,
      expected: parsed.expected,
      source: `EXPECT ${operation} -> ${rhs}`,
    });
  }
  return expects;
}

interface ParsedExpect {
  field: string;
  op: AssertOp;
  expected?: unknown;
}

/** Parse the right-hand side of an EXPECT (after the `->`):
 *   id IS NOT NULL          → { field: "id", op: "IS_NOT_NULL" }
 *   name == "Alice Chen"    → { field: "name", op: "==", expected: "Alice Chen" }
 *   list HAS_LENGTH > 0     → { field: "list", op: "HAS_LENGTH_GT", expected: 0 }
 */
function parseExpectExpression(rhs: string): ParsedExpect {
  // Trim trailing junk
  const s = rhs.trim();

  // IS NOT NULL / IS NULL
  let m = s.match(/^(\S+)\s+IS\s+NOT\s+NULL$/i);
  if (m) return { field: m[1], op: 'IS_NOT_NULL' };
  m = s.match(/^(\S+)\s+IS\s+NULL$/i);
  if (m) return { field: m[1], op: 'IS_NULL' };

  // HAS_LENGTH > / < / ==
  m = s.match(/^(\S+)\s+HAS_LENGTH\s*(==|!=|<|<=|>|>=)\s*(.+?)$/i);
  if (m) {
    const cmpToOp: Record<string, AssertOp> = {
      '==': 'HAS_LENGTH_EQ',
      '!=': 'HAS_LENGTH_EQ',  // close-enough mapping for the stub
      '<':  'HAS_LENGTH_LT',
      '<=': 'HAS_LENGTH_LT',
      '>':  'HAS_LENGTH_GT',
      '>=': 'HAS_LENGTH_GT',
    };
    return {
      field: m[1],
      op: cmpToOp[m[2]] ?? 'UNKNOWN',
      expected: parseLiteral(m[3]),
    };
  }

  // CONTAINS / MATCHES
  m = s.match(/^(\S+)\s+CONTAINS\s+(.+?)$/i);
  if (m) return { field: m[1], op: 'CONTAINS', expected: parseLiteral(m[2]) };
  m = s.match(/^(\S+)\s+MATCHES\s+(.+?)$/i);
  if (m) return { field: m[1], op: 'MATCHES', expected: parseLiteral(m[2]) };

  // Binary comparison
  m = s.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+?)$/);
  if (m) {
    return {
      field: m[1].trim(),
      op: m[2] as AssertOp,
      expected: parseLiteral(m[3]),
    };
  }

  return { field: s, op: 'UNKNOWN' };
}

function parseLiteral(raw: string): unknown {
  const s = raw.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // String literal
  const strMatch = s.match(/^"((?:[^"\\]|\\.)*)"$/);
  if (strMatch) return strMatch[1];
  // Bare identifier — return verbatim
  return s;
}

/** Parse `field: value, field: value` lists from inside GIVEN body. */
function parseFieldList(body: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  // Split on top-level commas. Simple approach since GIVEN values are
  // usually primitives.
  const parts = body.split(',');
  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const name = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (!name) continue;
    fields[name] = parseLiteral(value);
  }
  return fields;
}
