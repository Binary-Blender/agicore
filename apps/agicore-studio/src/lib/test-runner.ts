// Stub test runner — synthesizes plausible pass/fail results for
// TEST blocks. Real execution requires the agicore-cli to compile the
// .agi into runnable code and execute it with a real fixture harness.
// The stub uses simple heuristics so the UI can be developed against
// believable results:
//
//   - IS NOT NULL on `id` always passes (CRUD scaffolding sets ids)
//   - Equality on a field that matches a GIVEN literal passes
//   - HAS_LENGTH > 0 after a create passes
//   - Everything else: passes with a "[stub]" detail line
//
// Per-assertion timing is randomized in a small range so the UI feels
// like it's actually doing something. When the CLI lands and we
// replace this with real execution, the UI doesn't need to change.

import type {
  TestBlock,
  TestExpect,
  TestExpectResult,
  TestRunRecord,
} from '../types/test';

const ASSERT_DELAY_MS = { min: 40, max: 140 };

export interface TestRunCallbacks {
  onTestStart: (name: string) => void;
  onAssertResult: (name: string, result: TestExpectResult) => void;
  onTestFinish: (record: TestRunRecord) => void;
}

export async function runTestBlock(
  block: TestBlock,
  cb: TestRunCallbacks,
): Promise<TestRunRecord> {
  cb.onTestStart(block.name);

  const startedAt = Date.now();
  const results: TestExpectResult[] = [];

  for (const expect of block.expects) {
    await sleep(rand(ASSERT_DELAY_MS.min, ASSERT_DELAY_MS.max));
    const result = evaluateExpect(expect, block);
    results.push(result);
    cb.onAssertResult(block.name, result);
  }

  const finishedAt = Date.now();
  const status = results.every((r) => r.passed) ? 'passed' : 'failed';
  const record: TestRunRecord = {
    test_name: block.name,
    status,
    started_at: startedAt,
    finished_at: finishedAt,
    results,
  };
  cb.onTestFinish(record);
  return record;
}

export async function runAllTestBlocks(
  blocks: TestBlock[],
  cb: TestRunCallbacks,
): Promise<void> {
  for (const block of blocks) {
    await runTestBlock(block, cb);
  }
}

function evaluateExpect(expect: TestExpect, block: TestBlock): TestExpectResult {
  // Find the most recent GIVEN whose fields we can probe.
  const recentGiven = block.givens[block.givens.length - 1];
  const fields = recentGiven?.fields ?? {};

  switch (expect.op) {
    case 'IS_NOT_NULL':
      // The id field always exists post-create per the entity scaffolding.
      if (expect.field === 'id') {
        return {
          expect,
          passed: true,
          observed: '"<uuid-v4>"',
          detail: '[stub: CRUD scaffolding stamps id on create]',
        };
      }
      return {
        expect,
        passed: true,
        observed: '"<synthetic>"',
        detail: '[stub: assumed non-null]',
      };

    case 'IS_NULL':
      // Common after delete — pass.
      return {
        expect,
        passed: true,
        observed: null,
        detail: '[stub: assumed null]',
      };

    case '==':
    case '!=': {
      const givenValue = fields[expect.field];
      const matches = stringifyForCompare(givenValue) === stringifyForCompare(expect.expected);
      const expectingEqual = expect.op === '==';
      const passed = matches === expectingEqual;
      return {
        expect,
        passed,
        observed: givenValue ?? expect.expected,
        detail: passed
          ? undefined
          : `[stub: GIVEN had ${JSON.stringify(givenValue)}, EXPECT wanted ${JSON.stringify(expect.expected)}]`,
      };
    }

    case '<':
    case '<=':
    case '>':
    case '>=':
      // Numeric — stub passes when both sides look numeric.
      return {
        expect,
        passed: true,
        observed: expect.expected,
        detail: '[stub: numeric comparison assumed satisfied]',
      };

    case 'HAS_LENGTH_GT':
    case 'HAS_LENGTH_EQ':
    case 'HAS_LENGTH_LT':
      return {
        expect,
        passed: true,
        observed: 1,
        detail: '[stub: list length comparison assumed satisfied]',
      };

    case 'CONTAINS':
    case 'MATCHES':
      return {
        expect,
        passed: true,
        observed: '"<synthetic>"',
        detail: '[stub: substring/regex match assumed]',
      };

    case 'UNKNOWN':
      return {
        expect,
        passed: false,
        observed: undefined,
        detail: 'stub could not parse this assertion — real runner needed',
      };
  }
}

function stringifyForCompare(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
