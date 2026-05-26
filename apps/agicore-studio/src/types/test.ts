// TEST block model — mirrors the .agi DSL's TEST syntax:
//
//   TEST conversation_lifecycle {
//     GIVEN Conversation { title: "Test" }
//     EXPECT create -> id IS NOT NULL
//     EXPECT create -> name == "Alice Chen"
//   }
//
// We extract enough structure to display + "run" each assertion.
// Real execution is a CLI concern once the compiler can generate the
// per-test fixture + assertion harness; the stub renders plausible
// pass/fail so the UI can be developed against a believable surface.

export type AssertOp =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'IS_NOT_NULL'
  | 'IS_NULL'
  | 'CONTAINS'
  | 'MATCHES'
  | 'HAS_LENGTH_EQ'
  | 'HAS_LENGTH_GT'
  | 'HAS_LENGTH_LT'
  | 'UNKNOWN';

export interface TestGiven {
  /** Entity / action name the setup creates an instance of. */
  entity: string;
  /** Field assignments in the GIVEN block. Loosely typed — the stub
   *  uses them for equality-match heuristics. */
  fields: Record<string, unknown>;
}

export interface TestExpect {
  /** The operation under test: "create", "list", "delete", etc. */
  operation: string;
  /** The field or expression being checked. May be a dotted path. */
  field: string;
  op: AssertOp;
  /** Right-hand side literal. Null when the assertion takes no rhs
   *  (IS NOT NULL, IS NULL). */
  expected?: unknown;
  /** Verbatim source text for the assertion — surfaced in the UI as
   *  the secondary line so the user can read what's being checked. */
  source: string;
}

export interface TestBlock {
  /** Test name from `TEST <name> { ... }`. */
  name: string;
  givens: TestGiven[];
  expects: TestExpect[];
}

export type TestStatus =
  | 'idle'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error';     // couldn't even run (parse/runtime failure)

export interface TestExpectResult {
  expect: TestExpect;
  passed: boolean;
  /** Synthesized observed value the stub claims to have computed.
   *  Real runners will fill this with the actual runtime value. */
  observed?: unknown;
  detail?: string;
}

export interface TestRunRecord {
  test_name: string;
  status: TestStatus;
  started_at: number | null;
  finished_at: number | null;
  results: TestExpectResult[];
  error?: string;
}
