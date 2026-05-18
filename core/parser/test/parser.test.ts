// Agicore DSL Parser Test Suite

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../src/index.js';
import type { AgiFile } from '../src/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n--- ${name} ---`);
}

// --- Test: Minimal APP ---

section('Minimal APP parsing');

const minimalApp = `
APP test_app {
  TITLE "Test App"
  DB test.db
}
`;

const minResult = parse(minimalApp);
assert(minResult.app.name === 'test_app', 'App name should be test_app');
assert(minResult.app.title === 'Test App', 'App title should be "Test App"');
assert(minResult.app.db === 'test.db', 'App db should be test.db');
assert(minResult.app.kind === 'app', 'App kind should be "app"');

// --- Test: APP with all fields ---

section('Full APP parsing');

const fullApp = `
APP full_app {
  TITLE   "Full App"
  WINDOW  1200x800 frameless
  DB      full.db
  PORT    5176
  THEME   dark
}
`;

const fullResult = parse(fullApp);
assert(fullResult.app.window?.width === 1200, 'Window width should be 1200');
assert(fullResult.app.window?.height === 800, 'Window height should be 800');
assert(fullResult.app.window?.frameless === true, 'Window should be frameless');
assert(fullResult.app.port === 5176, 'Port should be 5176');
assert(fullResult.app.theme === 'dark', 'Theme should be dark');
assert(fullResult.app.current === undefined, 'CURRENT should be undefined when not declared');

// --- Test: APP with CURRENT field ---
//
// CURRENT is a navigation-context field — the entities listed here become
// `current<Entity>Id` slots in the generated Zustand store. The parser
// itself doesn't validate that the entity names resolve; later passes do.
section('APP with CURRENT field');

const appWithCurrent = `
APP nav_app {
  TITLE   "Nav App"
  WINDOW  1024x768 frameless
  DB      nav.db
  PORT    5177
  THEME   dark
  CURRENT Session, User
}
`;

const navResult = parse(appWithCurrent);
assert(Array.isArray(navResult.app.current), 'CURRENT should yield an array');
assert(navResult.app.current?.length === 2, 'CURRENT should have 2 entries');
assert(navResult.app.current?.[0] === 'Session', 'first CURRENT entry should be Session');
assert(navResult.app.current?.[1] === 'User', 'second CURRENT entry should be User');

// Single-entity CURRENT (no comma)
const singleCurrent = `
APP single {
  TITLE "Single"
  DB    single.db
  CURRENT Session
}
`;
const singleRes = parse(singleCurrent);
assert(singleRes.app.current?.length === 1, 'single-entity CURRENT should yield length 1');
assert(singleRes.app.current?.[0] === 'Session', 'single-entity CURRENT should be Session');

// Field-order independence: CURRENT can appear anywhere in the APP block.
const reorderedCurrent = `
APP reordered {
  CURRENT Session
  TITLE   "Reordered"
  DB      reordered.db
}
`;
const reorderedRes = parse(reorderedCurrent);
assert(reorderedRes.app.current?.[0] === 'Session', 'CURRENT should parse regardless of position');
assert(reorderedRes.app.title === 'Reordered', 'TITLE should still parse after CURRENT');

// --- Test: ENTITY ---

section('ENTITY parsing');

const entityTest = `
APP test {
  TITLE "Test"
  DB test.db
}

ENTITY Student {
  name: string REQUIRED
  age: number
  gpa: float
  active: bool = true
  notes: string
  TIMESTAMPS
  CRUD full
}

ENTITY Enrollment {
  status: string = "active"
  BELONGS_TO Student
  TIMESTAMPS
}
`;

const entityResult = parse(entityTest);
assert(entityResult.entities.length === 2, 'Should have 2 entities');

const student = entityResult.entities[0]!;
assert(student.name === 'Student', 'Entity name should be Student');
assert(student.fields.length === 5, 'Student should have 5 fields');
assert(student.fields[0]!.name === 'name', 'First field should be name');
assert(student.fields[0]!.type === 'string', 'Name type should be string');
assert(student.fields[0]!.modifiers.includes('REQUIRED'), 'Name should be REQUIRED');
assert(student.fields[1]!.type === 'number', 'Age type should be number');
assert(student.fields[2]!.type === 'float', 'GPA type should be float');
assert(student.fields[3]!.type === 'bool', 'Active type should be bool');
assert(student.fields[3]!.defaultValue === true, 'Active default should be true');
assert(student.timestamps === true, 'Should have timestamps');
assert(student.crud === 'full', 'CRUD should be full');

const enrollment = entityResult.entities[1]!;
assert(enrollment.name === 'Enrollment', 'Second entity should be Enrollment');
assert(enrollment.relationships.length === 1, 'Should have 1 relationship');
assert(enrollment.relationships[0]!.type === 'BELONGS_TO', 'Should be BELONGS_TO');
assert(enrollment.relationships[0]!.target === 'Student', 'Should belong to Student');
assert(enrollment.fields[0]!.defaultValue === 'active', 'Status default should be "active"');

// Default ordering: an entity without ORDER must not carry one on the AST,
// so codegen can apply its DESC default without re-checking the source.
assert(student.order === undefined, 'Student without ORDER should be undefined on AST');
assert(enrollment.order === undefined, 'Enrollment without ORDER should be undefined on AST');
assert(student.seeds === undefined, 'Student without SEED should be undefined on AST');

// --- Test: ENTITY ORDER ASC / DESC ---
//
// ORDER is a field-order-independent body keyword. It records the user's
// intended default sort direction for `list_<entity>` (and the BELONGS_TO+
// CURRENT filtered variant). Absence => undefined, codegen defaults to DESC.
section('ENTITY ORDER ASC / DESC');

const orderAsc = parse(`
APP test { TITLE "T" DB t.db }
ENTITY ChatMessage {
  text: string REQUIRED
  ORDER ASC
  TIMESTAMPS
}
`);
assert(orderAsc.entities[0]!.order === 'ASC', 'ORDER ASC should parse to "ASC"');

const orderDesc = parse(`
APP test { TITLE "T" DB t.db }
ENTITY ChatMessage {
  text: string REQUIRED
  ORDER DESC
  TIMESTAMPS
}
`);
assert(orderDesc.entities[0]!.order === 'DESC', 'ORDER DESC should parse to "DESC"');

// Position-independence: ORDER may appear before fields, between relations,
// after TIMESTAMPS — wherever, like every other ENTITY body keyword.
const orderReordered = parse(`
APP test { TITLE "T" DB t.db }
ENTITY Msg {
  ORDER ASC
  TIMESTAMPS
  text: string REQUIRED
}
`);
assert(orderReordered.entities[0]!.order === 'ASC', 'ORDER ASC should parse at top of body');

// --- Test: ENTITY SEED block ---
//
// SEED { key: value ... } records one row to be INSERT OR IGNORE'd into the
// table on every migration run. Multiple SEED blocks per entity are allowed.
section('ENTITY SEED block');

const seedSingle = parse(`
APP test { TITLE "T" DB t.db }
ENTITY User {
  email: string REQUIRED
  name: string
  TIMESTAMPS

  SEED {
    id: "default-user"
    email: "you@local"
    name: "You"
  }
}
`);
const seedUser = seedSingle.entities[0]!;
assert(Array.isArray(seedUser.seeds), 'SEED should produce an array on the AST');
assert(seedUser.seeds?.length === 1, 'single SEED block should produce 1 record');
assert(seedUser.seeds?.[0]!.fields.get('id') === 'default-user', 'SEED id should round-trip');
assert(seedUser.seeds?.[0]!.fields.get('email') === 'you@local', 'SEED email should round-trip');
assert(seedUser.seeds?.[0]!.fields.get('name') === 'You', 'SEED name should round-trip');

// Multiple SEED blocks → multiple records, in declaration order.
const seedMulti = parse(`
APP test { TITLE "T" DB t.db }
ENTITY Tag {
  name: string REQUIRED
  color: string
  count: number
  active: bool
  TIMESTAMPS

  SEED { id: "tag-1" name: "Red" color: "#f00" count: 0 active: true }
  SEED { id: "tag-2" name: "Blue" color: "#00f" count: 5 active: false }
}
`);
const seedTag = seedMulti.entities[0]!;
assert(seedTag.seeds?.length === 2, 'two SEED blocks should produce 2 records');
assert(seedTag.seeds?.[0]!.fields.get('id') === 'tag-1', 'first SEED id');
assert(seedTag.seeds?.[1]!.fields.get('id') === 'tag-2', 'second SEED id');
// Mixed literal types preserved through the parser.
assert(seedTag.seeds?.[0]!.fields.get('count') === 0, 'SEED number literal preserved');
assert(seedTag.seeds?.[0]!.fields.get('active') === true, 'SEED true literal preserved');
assert(seedTag.seeds?.[1]!.fields.get('active') === false, 'SEED false literal preserved');

// --- Test: ACTION ---

section('ACTION parsing');

const actionTest = `
APP test {
  TITLE "Test"
  DB test.db
}

ACTION generate_lesson {
  INPUT   student_id: string, subject: string, difficulty: string = "medium"
  OUTPUT  lesson: Lesson
  AI      "Generate a lesson plan for {{subject}}"
  STREAM  false
}
`;

const actionResult = parse(actionTest);
assert(actionResult.actions.length === 1, 'Should have 1 action');
const action = actionResult.actions[0]!;
assert(action.name === 'generate_lesson', 'Action name should be generate_lesson');
assert(action.input.length === 3, 'Should have 3 input params');
assert(action.input[0]!.name === 'student_id', 'First param should be student_id');
assert(action.input[2]!.defaultValue === 'medium', 'Difficulty default should be "medium"');
assert(action.output.length === 1, 'Should have 1 output');
assert(action.output[0]!.type === 'Lesson', 'Output type should be Lesson');
assert(action.ai === 'Generate a lesson plan for {{subject}}', 'AI prompt should match');
assert(action.stream === false, 'Stream should be false');

// --- Test: VIEW ---

section('VIEW parsing');

const viewTest = `
APP test {
  TITLE "Test"
  DB test.db
}

VIEW StudentList {
  ENTITY   Student
  LAYOUT   split
  ACTIONS  create, edit, delete
  SIDEBAR  icon: Users
  FIELDS   name, grade, active
}

VIEW Dashboard {
  LAYOUT   custom
  SIDEBAR  icon: Home
  TITLE    "Dashboard"
}
`;

const viewResult = parse(viewTest);
assert(viewResult.views.length === 2, 'Should have 2 views');
const studentView = viewResult.views[0]!;
assert(studentView.name === 'StudentList', 'View name should be StudentList');
assert(studentView.entity === 'Student', 'Entity should be Student');
assert(studentView.layout === 'split', 'Layout should be split');
assert(studentView.actions.length === 3, 'Should have 3 actions');
assert(studentView.sidebar?.icon === 'Users', 'Sidebar icon should be Users');
assert(studentView.fields.length === 3, 'Should have 3 fields');

const dashboard = viewResult.views[1]!;
assert(dashboard.layout === 'custom', 'Dashboard layout should be custom');
assert(dashboard.title === 'Dashboard', 'Dashboard title should be "Dashboard"');

// --- Test: AI_SERVICE ---

section('AI_SERVICE parsing');

const aiServiceTest = `
APP test {
  TITLE "Test"
  DB test.db
}

AI_SERVICE {
  PROVIDERS   anthropic, openai
  KEYS_FILE   "%APPDATA%/NovaSyn/api-keys.json"
  DEFAULT     anthropic
  STREAMING   true
  MODELS {
    anthropic  "claude-sonnet-4-20250514"
    openai     "gpt-4o"
  }
}
`;

const aiResult = parse(aiServiceTest);
assert(aiResult.aiService !== undefined, 'Should have AI_SERVICE');
assert(aiResult.aiService!.providers.length === 2, 'Should have 2 providers');
assert(aiResult.aiService!.defaultProvider === 'anthropic', 'Default should be anthropic');
assert(aiResult.aiService!.streaming === true, 'Streaming should be true');
assert(aiResult.aiService!.models.length === 2, 'Should have 2 model mappings');
assert(aiResult.aiService!.models[0]!.id === 'claude-sonnet-4-20250514', 'First model id should be claude');
assert(aiResult.aiService!.models[0]!.provider === 'anthropic', 'First model provider should be anthropic');
// Back-compat: single entry per provider with no DEFAULT modifier becomes the implicit default.
assert(aiResult.aiService!.models[0]!.isDefault === true, 'Sole anthropic entry should be implicit default');
assert(aiResult.aiService!.models[1]!.isDefault === true, 'Sole openai entry should be implicit default');
assert(aiResult.aiService!.models[0]!.label === undefined, 'No LABEL → label should be undefined');

// --- Test: AI_SERVICE multi-model with LABEL + DEFAULT modifiers ---

section('AI_SERVICE multi-model parsing');

const multiModelTest = `
APP test {
  TITLE "Test"
  DB test.db
}

AI_SERVICE {
  PROVIDERS   anthropic, openai
  KEYS_FILE   "k.json"
  DEFAULT     anthropic
  STREAMING   true
  MODELS {
    anthropic  "claude-sonnet-4-20250514"   LABEL "Claude Sonnet 4"   DEFAULT
    anthropic  "claude-haiku-4-5-20251001"  LABEL "Claude Haiku 4.5"
    openai     "gpt-4o"                     LABEL "GPT-4o"            DEFAULT
    openai     "gpt-4o-mini"                LABEL "GPT-4o Mini"
  }
}
`;
const multiResult = parse(multiModelTest);
assert(multiResult.aiService!.models.length === 4, 'Multi-model: should have 4 entries');
assert(multiResult.aiService!.models[0]!.id === 'claude-sonnet-4-20250514', 'Multi: entry 0 id');
assert(multiResult.aiService!.models[0]!.label === 'Claude Sonnet 4', 'Multi: entry 0 label');
assert(multiResult.aiService!.models[0]!.isDefault === true, 'Multi: entry 0 is DEFAULT');
assert(multiResult.aiService!.models[1]!.isDefault === false, 'Multi: entry 1 (haiku) is not default');
assert(multiResult.aiService!.models[1]!.label === 'Claude Haiku 4.5', 'Multi: entry 1 label');
assert(multiResult.aiService!.models[2]!.isDefault === true, 'Multi: entry 2 (gpt-4o) is DEFAULT');
assert(multiResult.aiService!.models[3]!.provider === 'openai', 'Multi: entry 3 provider is openai');
assert(multiResult.aiService!.models[3]!.isDefault === false, 'Multi: entry 3 (gpt-4o-mini) is not default');

// --- Test: AI_SERVICE multi-model — no explicit DEFAULT means first wins ---

section('AI_SERVICE multi-model implicit default');

const implicitDefaultTest = `
APP test { TITLE "Test" DB test.db }
AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "k.json"
  DEFAULT   anthropic
  MODELS {
    anthropic "claude-sonnet-4-20250514" LABEL "Sonnet"
    anthropic "claude-haiku-4-5-20251001" LABEL "Haiku"
  }
}
`;
const implicitResult = parse(implicitDefaultTest);
assert(implicitResult.aiService!.models[0]!.isDefault === true, 'Implicit: first entry becomes default');
assert(implicitResult.aiService!.models[1]!.isDefault === false, 'Implicit: second entry is not default');

// --- Test: AI_SERVICE multi-model — LABEL/DEFAULT modifier ordering ---

section('AI_SERVICE multi-model LABEL/DEFAULT ordering');

// LABEL and DEFAULT can appear in either order on the same line. Use one
// DEFAULT per provider so the validation rule isn't tripped.
const orderingTest = `
APP test { TITLE "Test" DB test.db }
AI_SERVICE {
  PROVIDERS anthropic, openai
  KEYS_FILE "k.json"
  DEFAULT   anthropic
  MODELS {
    anthropic "claude-a" DEFAULT LABEL "A label"
    openai    "gpt-x"    LABEL "X label" DEFAULT
  }
}
`;
const orderingResult = parse(orderingTest);
assert(orderingResult.aiService!.models[0]!.isDefault === true, 'Ordering: DEFAULT first then LABEL works');
assert(orderingResult.aiService!.models[0]!.label === 'A label', 'Ordering: label parsed after DEFAULT');
assert(orderingResult.aiService!.models[1]!.isDefault === true, 'Ordering: LABEL first then DEFAULT works');
assert(orderingResult.aiService!.models[1]!.label === 'X label', 'Ordering: label parsed before DEFAULT');

// --- Test: AI_SERVICE multi-model — two DEFAULTs for same provider is an error ---

section('AI_SERVICE multi-model duplicate DEFAULT error');

const dupDefaultTest = `
APP test { TITLE "Test" DB test.db }
AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "k.json"
  DEFAULT   anthropic
  MODELS {
    anthropic "claude-a" DEFAULT
    anthropic "claude-b" DEFAULT
  }
}
`;
let dupErrorMsg = '';
try {
  parse(dupDefaultTest);
} catch (err) {
  dupErrorMsg = String((err as Error).message);
}
assert(dupErrorMsg.length > 0, 'Two DEFAULTs for same provider should throw');
assert(dupErrorMsg.includes('multiple DEFAULT') || dupErrorMsg.includes('DEFAULT'), 'Error message mentions DEFAULT');
assert(dupErrorMsg.includes('anthropic'), 'Error message names the provider');

// --- Test: TEST ---

section('TEST parsing');

const testTest = `
APP test {
  TITLE "Test"
  DB test.db
}

TEST student_crud {
  GIVEN Student { name: "Alice", grade: "5th", active: true }
  EXPECT create -> id IS NOT NULL
  EXPECT create -> name == "Alice"
  EXPECT list -> HAS_LENGTH > 0
  EXPECT update { grade: "6th" } -> grade == "6th"
  EXPECT delete -> get_by_id IS NULL
}
`;

const testResult = parse(testTest);
assert(testResult.tests.length === 1, 'Should have 1 test');
const test = testResult.tests[0]!;
assert(test.name === 'student_crud', 'Test name should be student_crud');
assert(test.givens.length === 1, 'Should have 1 given');
assert(test.givens[0]!.entity === 'Student', 'Given entity should be Student');
assert(test.givens[0]!.fields['name'] === 'Alice', 'Given name should be Alice');
assert(test.expects.length === 5, 'Should have 5 expects');
assert(test.expects[0]!.assertion.op === 'IS NOT NULL', 'First assertion should be IS NOT NULL');
assert(test.expects[1]!.assertion.op === '==', 'Second assertion should be ==');
assert(test.expects[1]!.assertion.value === 'Alice', 'Second assertion value should be Alice');
assert(test.expects[3]!.updateFields?.['grade'] === '6th', 'Update should set grade to 6th');

// --- Test: RULE ---

section('RULE parsing');

const ruleTest = `
APP test {
  TITLE "Test"
  DB test.db
}

RULE auto_approve_small {
  WHEN    invoice.amount <= 500
  UNLESS  vendor.trust_level == "low"
  THEN    auto_approve
  PRIORITY 5
}
`;

const ruleResult = parse(ruleTest);
assert(ruleResult.rules.length === 1, 'Should have 1 rule');
const rule = ruleResult.rules[0]!;
assert(rule.name === 'auto_approve_small', 'Rule name should be auto_approve_small');
assert(rule.conditions.length === 2, 'Should have 2 conditions');
assert(rule.conditions[0]!.field === 'invoice.amount', 'First condition field');
assert(rule.conditions[0]!.op === '<=', 'First condition op');
assert(rule.conditions[0]!.value === 500, 'First condition value');
assert(rule.conditions[1]!.connector === 'UNLESS', 'Second condition connector');
assert(rule.action === 'auto_approve', 'Action should be auto_approve');
assert(rule.priority === 5, 'Priority should be 5');

// --- Test: WORKFLOW ---

section('WORKFLOW parsing');

const workflowTest = `
APP test {
  TITLE "Test"
  DB test.db
}

WORKFLOW InvoiceReview {
  STEP validate {
    ACTION  validate_data
    ON_FAIL stop
  }

  STEP process {
    ACTION  run_rules
    INPUT   invoice_id: workflow.invoice_id
  }

  STEP notify {
    ACTION  send_notification
    ON_FAIL skip
  }
}
`;

const wfResult = parse(workflowTest);
assert(wfResult.workflows.length === 1, 'Should have 1 workflow');
const wf = wfResult.workflows[0]!;
assert(wf.name === 'InvoiceReview', 'Workflow name');
assert(wf.steps.length === 3, 'Should have 3 steps');
assert(wf.steps[0]!.name === 'validate', 'Step 1 name');
assert(wf.steps[0]!.action === 'validate_data', 'Step 1 action');
assert(wf.steps[0]!.onFail === 'stop', 'Step 1 onFail');
assert(wf.steps[1]!.input?.['invoice_id'] === 'workflow.invoice_id', 'Step 2 input mapping');
assert(wf.steps[2]!.onFail === 'skip', 'Step 3 onFail');

// --- Test: Comments ---

section('Comment handling');

const commentTest = `
// This is a line comment
APP test {
  TITLE "Test" // inline comment
  DB test.db
  /* block
     comment */
}
`;

const commentResult = parse(commentTest);
assert(commentResult.app.name === 'test', 'Should parse through comments');

// --- Test: Full Example File ---

section('Full home_academy.agi parsing');

try {
  const examplePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/home-academy/home_academy.agi'
  );
  const source = readFileSync(examplePath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'home_academy', 'App name should be home_academy');
  assert(result.app.title === 'NovaSyn Home Academy', 'App title');
  assert(result.app.port === 5176, 'App port');
  assert(result.entities.length === 6, 'Should have 6 entities');
  assert(result.actions.length === 3, 'Should have 3 actions');
  assert(result.views.length === 6, 'Should have 6 views');
  assert(result.aiService !== undefined, 'Should have AI_SERVICE');
  assert(result.tests.length === 4, 'Should have 4 tests');

  // Verify entity details
  const studentEntity = result.entities.find(e => e.name === 'Student');
  assert(studentEntity !== undefined, 'Should have Student entity');
  assert(studentEntity!.fields.length === 5, 'Student should have 5 fields');
  assert(studentEntity!.timestamps === true, 'Student should have timestamps');

  const lessonEntity = result.entities.find(e => e.name === 'Lesson');
  assert(lessonEntity !== undefined, 'Should have Lesson entity');
  assert(lessonEntity!.relationships.length === 2, 'Lesson should have 2 relationships');

  console.log(`  Parsed successfully: ${result.entities.length} entities, ${result.actions.length} actions, ${result.views.length} views, ${result.tests.length} tests`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse home_academy.agi: ${err}`);
}

// --- Test: Invoice Approval Example ---

section('Full invoice_approval.agi parsing');

try {
  const examplePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/invoice-approval/invoice_approval.agi'
  );
  const source = readFileSync(examplePath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'invoice_approval', 'App name');
  assert(result.entities.length === 3, 'Should have 3 entities');
  assert(result.rules.length === 5, 'Should have 5 rules');
  assert(result.workflows.length === 1, 'Should have 1 workflow');
  assert(result.workflows[0]!.steps.length === 5, 'Workflow should have 5 steps');
  assert(result.tests.length === 3, 'Should have 3 tests');

  const highValueRule = result.rules.find(r => r.name === 'director_approval_large');
  assert(highValueRule !== undefined, 'Should have director_approval_large rule');
  assert(highValueRule!.priority === 15, 'Priority should be 15');

  console.log(`  Parsed successfully: ${result.entities.length} entities, ${result.rules.length} rules, ${result.workflows.length} workflows, ${result.tests.length} tests`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse invoice_approval.agi: ${err}`);
}

// --- Test: FACT ---

// --- Test: PIPELINE ---

section('PIPELINE parsing');

const pipelineTest = `
APP test {
  TITLE "Test"
  DB test.db
}

PIPELINE ContentFactory {
  DESCRIPTION "Test pipeline"

  ROW research {
    topic: ai_action {
      MODEL       "anthropic"
      PROMPT      "Research {{input}}"
    }
    competitor: ai_action {
      MODEL       "openai"
      PROMPT      "Analyze competitors for {{input}}"
    }
  }

  ROW draft {
    article: ai_action {
      MODEL       "anthropic"
      PROMPT      "Write article from {{research}}"
    }
  }

  ROW quality {
    review: qc_checkpoint {
      DESCRIPTION "Review the draft"
      SPC         "content_qc"
    }
  }

  CONNECTION topic.output -> article.research
  CONNECTION article.output -> review.input
}
`;

const pipelineResult = parse(pipelineTest);
assert(pipelineResult.pipelines.length === 1, 'Should have 1 pipeline');
const pl = pipelineResult.pipelines[0]!;
assert(pl.name === 'ContentFactory', 'Pipeline name');
assert(pl.description === 'Test pipeline', 'Pipeline description');
assert(pl.rows.length === 3, 'Should have 3 rows');
assert(pl.rows[0]!.name === 'research', 'First row name');
assert(pl.rows[0]!.modules.length === 2, 'Research row should have 2 modules');
assert(pl.rows[0]!.modules[0]!.name === 'topic', 'First module name');
assert(pl.rows[0]!.modules[0]!.type === 'ai_action', 'First module type');
assert(pl.rows[1]!.modules.length === 1, 'Draft row should have 1 module');
assert(pl.rows[2]!.modules[0]!.type === 'qc_checkpoint', 'Quality module type');
assert(pl.connections.length === 2, 'Should have 2 connections');
assert(pl.connections[0]!.fromModule === 'topic', 'Connection from module');
assert(pl.connections[0]!.fromOutput === 'output', 'Connection from output');
assert(pl.connections[0]!.toModule === 'article', 'Connection to module');
assert(pl.connections[0]!.toInput === 'research', 'Connection to input');

// --- Test: QC ---

section('QC parsing');

const qcTest = `
APP test {
  TITLE "Test"
  DB test.db
}

QC content_quality {
  YOUNG_THRESHOLD     30
  MATURING_THRESHOLD  75
  YOUNG_PASS_RATE     0.85
  MATURE_PASS_RATE    0.95
  MATURING_SAMPLE     0.40
  MATURE_SAMPLE       0.05
}
`;

const qcResult = parse(qcTest);
assert(qcResult.qcs.length === 1, 'Should have 1 QC');
const qc = qcResult.qcs[0]!;
assert(qc.name === 'content_quality', 'QC name');
assert(qc.youngThreshold === 30, 'Young threshold');
assert(qc.maturingThreshold === 75, 'Maturing threshold');
assert(qc.youngPassRate === 0.85, 'Young pass rate');
assert(qc.maturePassRate === 0.95, 'Mature pass rate');
assert(qc.maturingSample === 0.40, 'Maturing sample rate');
assert(qc.matureSample === 0.05, 'Mature sample rate');

// --- Test: VAULT ---

section('VAULT parsing');

const vaultTest = `
APP test {
  TITLE "Test"
  DB test.db
}

VAULT {
  PATH         "%APPDATA%/NovaSyn/vault.db"
  ASSET_TYPES  text, image, json, markdown
  PROVENANCE   true
  TAGS         true
}
`;

const vaultResult = parse(vaultTest);
assert(vaultResult.vault !== undefined, 'Should have vault');
assert(vaultResult.vault!.path === '%APPDATA%/NovaSyn/vault.db', 'Vault path');
assert(vaultResult.vault!.assetTypes.length === 4, 'Should have 4 asset types');
assert(vaultResult.vault!.provenance === true, 'Provenance should be true');
assert(vaultResult.vault!.tags === true, 'Tags should be true');

// --- Test: Full content_pipeline.agi ---

section('Full content_pipeline.agi parsing');

try {
  const pipelinePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/content-pipeline/content_pipeline.agi'
  );
  const source = readFileSync(pipelinePath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'content_pipeline', 'App name');
  assert(result.pipelines.length === 2, 'Should have 2 pipelines');
  assert(result.qcs.length === 2, 'Should have 2 QC declarations');
  assert(result.vault !== undefined, 'Should have vault');
  assert(result.entities.length === 3, 'Should have 3 entities');
  assert(result.views.length === 4, 'Should have 4 views');
  assert(result.tests.length === 2, 'Should have 2 tests');

  const articlePipeline = result.pipelines.find(p => p.name === 'ArticleFactory');
  assert(articlePipeline !== undefined, 'Should have ArticleFactory');
  assert(articlePipeline!.rows.length === 5, 'ArticleFactory should have 5 rows');
  assert(articlePipeline!.connections.length === 6, 'ArticleFactory should have 6 connections');

  // First row should have 3 parallel modules
  assert(articlePipeline!.rows[0]!.modules.length === 3, 'Research row should have 3 parallel modules');

  const imagePipeline = result.pipelines.find(p => p.name === 'ImageFactory');
  assert(imagePipeline !== undefined, 'Should have ImageFactory');
  assert(imagePipeline!.rows.length === 3, 'ImageFactory should have 3 rows');

  const contentQC = result.qcs.find(q => q.name === 'content_quality');
  assert(contentQC !== undefined, 'Should have content_quality QC');
  assert(contentQC!.youngThreshold === 30, 'Content QC young threshold');

  console.log(`  Parsed successfully: ${result.pipelines.length} pipelines, ${result.qcs.length} QCs, ${result.entities.length} entities, ${result.views.length} views`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse content_pipeline.agi: ${err}`);
}

// --- Test: Full babyai_router.agi ---

section('Full babyai_router.agi parsing');

try {
  const babyaiPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/babyai-router/babyai_router.agi'
  );
  const source = readFileSync(babyaiPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'babyai', 'App name');
  assert(result.routers.length === 1, 'Should have 1 router');
  assert(result.skills.length === 4, 'Should have 4 skills');
  assert(result.lifecycles.length === 1, 'Should have 1 lifecycle');
  assert(result.breeds.length === 1, 'Should have 1 breed');
  assert(result.entities.length === 4, 'Should have 4 entities');
  assert(result.views.length === 4, 'Should have 4 views');
  assert(result.tests.length === 3, 'Should have 3 tests');

  // Router details
  const router = result.routers[0]!;
  assert(router.name === 'BabyAI', 'Router name');
  assert(router.tiers.length === 3, 'Should have 3 tiers');
  assert(router.tiers[0]!.models.length === 4, 'Tier 1 should have 4 models');
  assert(router.tiers[1]!.models.length === 3, 'Tier 2 should have 3 models');
  assert(router.tiers[2]!.models.length === 3, 'Tier 3 should have 3 models');
  assert(router.taskTypes.length === 9, 'Should have 9 task types');
  assert(router.moshPitSize === 3, 'Mosh pit size should be 3');
  assert(router.calibration === true, 'Calibration should be true');

  // Check model details
  const qwen = router.tiers[0]!.models[0]!;
  assert(qwen.key === 'qwen3_8b', 'First model key');
  assert(qwen.provider === 'huggingface', 'First model provider');
  assert(qwen.isDefault === true, 'First model should be default');
  assert(qwen.strengths.length === 3, 'First model strengths');

  // Skill details
  const cornSkill = result.skills.find(s => s.name === 'corn_missouri');
  assert(cornSkill !== undefined, 'Should have corn_missouri skill');
  assert(cornSkill!.keywords.length === 9, 'Corn skill should have 9 keywords');
  assert(cornSkill!.domain === 'farming', 'Corn skill domain');
  assert(cornSkill!.priority === 10, 'Corn skill priority');

  // Lifecycle details
  const lifecycle = result.lifecycles[0]!;
  assert(lifecycle.name === 'BabyAILifecycle', 'Lifecycle name');
  assert(lifecycle.stalenessWindow === 7, 'Staleness window');
  assert(lifecycle.stalenessDrop === 0.15, 'Staleness drop');
  assert(lifecycle.escalation.length === 4, 'Should have 4 escalation levels');
  assert(lifecycle.escalation[0]!.level === 'current', 'First escalation level');

  // Breed details
  const breed = result.breeds[0]!;
  assert(breed.name === 'BabyAIEvolution', 'Breed name');
  assert(breed.inheritanceA === 15, 'Inheritance A');
  assert(breed.inheritanceB === 15, 'Inheritance B');
  assert(breed.inheritanceFresh === 70, 'Inheritance fresh');
  assert(breed.minFitness === 0.5, 'Min fitness');
  assert(breed.cooldown === 30, 'Cooldown');
  assert(breed.fitness.predictionAccuracy === 0.4, 'Fitness prediction_accuracy');
  assert(breed.fitness.domainDepth === 0.3, 'Fitness domain_depth');
  assert(breed.pairingPreferences.length === 2, 'Should have 2 pairing preferences');
  assert(breed.diversityMin === 0.4, 'Diversity min');
  assert(breed.traitPersistAfter === 3, 'Trait persist after');
  assert(breed.traitExtinctAfter === 1, 'Trait extinct after');

  console.log(`  Parsed successfully: ${result.routers.length} routers (${router.tiers.reduce((s, t) => s + t.models.length, 0)} models), ${result.skills.length} skills, ${result.lifecycles.length} lifecycles, ${result.breeds.length} breeds, ${result.entities.length} entities`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse babyai_router.agi: ${err}`);
}

// --- Test: Full distributed_orchestration.agi ---

section('Full distributed_orchestration.agi parsing');

try {
  const distPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/distributed-orchestration/distributed_orchestration.agi'
  );
  const source = readFileSync(distPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'distributed_orchestration', 'App name');
  assert(result.packets.length === 3, 'Should have 3 packets');
  assert(result.authorities.length === 2, 'Should have 2 authorities');
  assert(result.channels.length === 4, 'Should have 4 channels');
  assert(result.pipelines.length === 1, 'Should have 1 pipeline');
  assert(result.qcs.length === 1, 'Should have 1 QC');
  assert(result.entities.length === 2, 'Should have 2 entities');

  // Packet details
  const analysisReq = result.packets.find(p => p.name === 'AnalysisRequest');
  assert(analysisReq !== undefined, 'Should have AnalysisRequest packet');
  assert(analysisReq!.payload.length === 6, 'AnalysisRequest should have 6 payload fields');
  assert(analysisReq!.provenance === true, 'Should have provenance');
  assert(analysisReq!.lineage === true, 'Should have lineage');
  assert(analysisReq!.validation.length === 2, 'Should have 2 validation rules');

  const analysisResult = result.packets.find(p => p.name === 'AnalysisResult');
  assert(analysisResult !== undefined, 'Should have AnalysisResult packet');
  assert(analysisResult!.signatures === true, 'AnalysisResult should require signatures');
  assert(analysisResult!.validation.length === 3, 'Should have 3 validation rules');

  const handoff = result.packets.find(p => p.name === 'WorkflowHandoff');
  assert(handoff !== undefined, 'Should have WorkflowHandoff packet');
  assert(handoff!.ttl === 604800, 'Handoff TTL should be 7 days');

  // Authority details
  const sysGov = result.authorities.find(a => a.name === 'SystemGovernance');
  assert(sysGov !== undefined, 'Should have SystemGovernance');
  assert(sysGov!.levels.length === 4, 'Should have 4 authority levels');
  assert(sysGov!.signing.required === true, 'Signing should be required');
  assert(sysGov!.signing.verifyChain === true, 'Verify chain should be true');
  assert(sysGov!.admissibility.length === 3, 'Should have 3 admissibility rules');

  // Channel details
  const intake = result.channels.find(c => c.name === 'analysis_intake');
  assert(intake !== undefined, 'Should have analysis_intake channel');
  assert(intake!.protocol === 'http', 'Protocol should be http');
  assert(intake!.direction === 'inbound', 'Direction should be inbound');
  assert(intake!.packet === 'AnalysisRequest', 'Should reference AnalysisRequest packet');
  assert(intake!.authority === 'SystemGovernance', 'Should reference SystemGovernance');

  const partner = result.channels.find(c => c.name === 'partner_exchange');
  assert(partner !== undefined, 'Should have partner_exchange channel');
  assert(partner!.protocol === 'websocket', 'Protocol should be websocket');
  assert(partner!.direction === 'bidirectional', 'Direction should be bidirectional');
  assert(partner!.retry === 5, 'Retry should be 5');

  console.log(`  Parsed successfully: ${result.packets.length} packets, ${result.authorities.length} authorities, ${result.channels.length} channels, ${result.pipelines.length} pipelines`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse distributed_orchestration.agi: ${err}`);
}

// --- Test: SKILLDOC parsing ---

section('SKILLDOC parsing');

const skilldocSrc = `
APP test {
  TITLE "Test"
  DB test.db
}

SKILLDOC aerospace_qc {
  DESCRIPTION  "Aerospace QC procedures"
  VERSION      "2.4.1"
  DOMAIN       "manufacturing"
  CONTENT      "skilldocs/aerospace_qc.md"
  KEYWORDS     aerospace, manufacturing, quality
  PRIORITY     20

  GOVERNANCE {
    SIGNED_BY      CorpAuthority
    REQUIRE        clearance_4, qc_certified
    EXECUTE_ONLY   secure_node, certified_node
    DISALLOW       export, modify
    AUDIT          all_access
  }

  COMPRESSION {
    SEMANTIC_DENSITY      0.85
    INTENT_PRESERVATION   0.95
    TOKEN_EFFICIENCY      0.7
  }
}

SKILLDOC open_skilldoc {
  DESCRIPTION  "Open community skilldoc"
  VERSION      "1.0.0"
}
`;

const skilldocResult = parse(skilldocSrc);
assert(skilldocResult.skilldocs.length === 2, 'Should have 2 skilldocs');

const enterprise = skilldocResult.skilldocs[0]!;
assert(enterprise.name === 'aerospace_qc', 'Enterprise skilldoc name');
assert(enterprise.version === '2.4.1', 'Version');
assert(enterprise.domain === 'manufacturing', 'Domain');
assert(enterprise.content === 'skilldocs/aerospace_qc.md', 'Content path');
assert(enterprise.keywords.length === 3, 'Should have 3 keywords');
assert(enterprise.priority === 20, 'Priority');
assert(enterprise.governance !== undefined, 'Should have governance');
assert(enterprise.governance!.signedBy === 'CorpAuthority', 'Signed by');
assert(enterprise.governance!.require.length === 2, 'Should have 2 required clearances');
assert(enterprise.governance!.executeOnly.length === 2, 'Should have 2 execute targets');
assert(enterprise.governance!.disallow.length === 2, 'Should have 2 disallow rules');
assert(enterprise.governance!.audit === 'all_access', 'Audit level');
assert(enterprise.compression !== undefined, 'Should have compression');
assert(enterprise.compression!.semanticDensity === 0.85, 'Semantic density');
assert(enterprise.compression!.intentPreservation === 0.95, 'Intent preservation');
assert(enterprise.compression!.tokenEfficiency === 0.7, 'Token efficiency');

const open = skilldocResult.skilldocs[1]!;
assert(open.name === 'open_skilldoc', 'Open skilldoc name');
assert(open.governance === undefined, 'Open skilldoc has no governance');
assert(open.compression === undefined, 'Open skilldoc has no compression');

// --- Test: Full cognitive_infrastructure.agi ---

section('Full cognitive_infrastructure.agi parsing');

try {
  const cogPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/cognitive-infrastructure/cognitive_infrastructure.agi'
  );
  const source = readFileSync(cogPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'cognitive_infrastructure', 'App name');
  assert(result.skilldocs.length === 6, 'Should have 6 skilldocs');
  assert(result.authorities.length === 2, 'Should have 2 authorities');
  assert(result.nodes.length === 3, 'Should have 3 nodes');
  assert(result.zones.length === 1, 'Should have 1 zone');
  assert(result.routers.length === 1, 'Should have 1 router');
  assert(result.packets.length === 1, 'Should have 1 packet');
  assert(result.channels.length === 1, 'Should have 1 channel');

  const aerospace = result.skilldocs.find((s) => s.name === 'aerospace_qc');
  assert(aerospace !== undefined, 'Should have aerospace_qc skilldoc');
  assert(aerospace!.governance!.signedBy === 'CorporateAuthority', 'Aerospace signed by');
  assert(aerospace!.governance!.require.length === 2, 'Aerospace clearances');
  assert(aerospace!.governance!.executeOnly.length === 2, 'Aerospace execute targets');
  assert(aerospace!.governance!.audit === 'all_access', 'Aerospace audit level');

  const openSkilldoc = result.skilldocs.find((s) => s.name === 'creative_voice_writing');
  assert(openSkilldoc !== undefined, 'Should have creative_voice_writing');
  assert(openSkilldoc!.governance === undefined, 'Open skilldoc has no governance');

  const governedCount = result.skilldocs.filter(s => s.governance).length;
  const openCount = result.skilldocs.filter(s => !s.governance).length;
  console.log('  Parsed successfully: ' + result.skilldocs.length + ' skilldocs (' + governedCount + ' governed, ' + openCount + ' open), ' + result.authorities.length + ' authorities, ' + result.nodes.length + ' nodes');
} catch (err) {
  failed++;
  console.error('  FAIL: Could not parse cognitive_infrastructure.agi: ' + err);
}

// --- Test: REASONER parsing ---

section('REASONER parsing');

const reasonerSrc = `
APP test_oie {
  TITLE     "Test"
  DB        test.db
  TELEMETRY auto
}

REASONER daily_reasoner {
  DESCRIPTION  "Daily reasoning over telemetry"

  INPUT {
    CHANNEL    telemetry_stream, audit_stream
    WINDOW     "7d"
    FILTER     "success = true"
  }

  USES         organization_analysis
  TIER         2

  OUTPUT {
    PACKET     OrgInsight
    CHANNEL    insight_stream
  }

  SCHEDULE     daily

  GOVERNANCE {
    SIGNED_BY    OrgAuthority
    EXECUTE_ONLY analytics_node
    REQUIRE      analyst
    AUDIT        all_actions
  }
}

REASONER on_demand_reasoner {
  DESCRIPTION  "On-demand reasoning"

  INPUT {
    CHANNEL    telemetry_stream
    WINDOW     "24h"
  }

  USES         organization_analysis

  OUTPUT {
    PACKET     OrgInsight
  }

  SCHEDULE     on_demand
}
`;

const reasonerResult = parse(reasonerSrc);
assert(reasonerResult.app.telemetry === 'auto', 'APP TELEMETRY auto');
assert(reasonerResult.reasoners.length === 2, 'Should have 2 reasoners');

const daily = reasonerResult.reasoners[0]!;
assert(daily.name === 'daily_reasoner', 'Daily reasoner name');
assert(daily.input.channels.length === 2, 'Daily reasoner: 2 input channels');
assert(daily.input.window === '7d', 'Daily reasoner window');
assert(daily.input.filter === 'success = true', 'Daily reasoner filter');
assert(daily.uses === 'organization_analysis', 'Daily reasoner uses skilldoc');
assert(daily.tier === 2, 'Daily reasoner tier');
assert(daily.output.packet === 'OrgInsight', 'Daily reasoner output packet');
assert(daily.output.channel === 'insight_stream', 'Daily reasoner output channel');
assert(daily.schedule === 'daily', 'Daily reasoner schedule');
assert(daily.governance !== undefined, 'Daily reasoner has governance');
assert(daily.governance!.signedBy === 'OrgAuthority', 'Daily reasoner signed by');
assert(daily.governance!.executeOnly.length === 1, 'Daily reasoner execute targets');
assert(daily.governance!.audit === 'all_actions', 'Daily reasoner audit');

const onDemand = reasonerResult.reasoners[1]!;
assert(onDemand.schedule === 'on_demand', 'On-demand reasoner schedule');
assert(onDemand.governance === undefined, 'On-demand reasoner has no governance block');
assert(onDemand.tier === undefined, 'On-demand reasoner has no tier');
assert(onDemand.input.filter === undefined, 'On-demand reasoner has no filter');

// Cron-style schedule via string literal
const cronSrc = `
APP test_cron {
  TITLE  "Test"
  DB     test.db
}

REASONER cron_reasoner {
  DESCRIPTION  "Cron-scheduled reasoner"
  INPUT { CHANNEL telemetry_stream WINDOW "1h" }
  USES         analysis_doc
  OUTPUT { PACKET OrgInsight }
  SCHEDULE     "0 6 * * *"
}
`;
const cronResult = parse(cronSrc);
assert(cronResult.reasoners[0]!.schedule === '0 6 * * *', 'Cron schedule via string literal');

// --- Test: Full organizational_intelligence.agi ---

section('Full organizational_intelligence.agi parsing');

try {
  const oiePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/organizational-intelligence/organizational_intelligence.agi'
  );
  const source = readFileSync(oiePath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'organizational_intelligence', 'OIE app name');
  assert(result.app.telemetry === 'auto', 'OIE app TELEMETRY auto');
  assert(result.reasoners.length === 2, 'OIE should have 2 reasoners');
  assert(result.skilldocs.length === 1, 'OIE should have 1 skilldoc');
  assert(result.packets.length === 2, 'OIE should have 2 packets');
  assert(result.channels.length === 2, 'OIE should have 2 channels');
  assert(result.authorities.length === 1, 'OIE should have 1 authority');
  assert(result.nodes.length === 1, 'OIE should have 1 node');

  const orgReasoner = result.reasoners.find((r) => r.name === 'organization_reasoner');
  assert(orgReasoner !== undefined, 'Should have organization_reasoner');
  assert(orgReasoner!.uses === 'organization_analysis', 'Org reasoner uses signed skilldoc');
  assert(orgReasoner!.input.window === '7d', 'Org reasoner 7d window');
  assert(orgReasoner!.governance!.signedBy === 'OrgAuthority', 'Org reasoner signed by');

  console.log('  Parsed successfully: ' + result.reasoners.length + ' reasoners, ' + result.skilldocs.length + ' skilldocs, ' + result.packets.length + ' packets, ' + result.channels.length + ' channels');
} catch (err) {
  failed++;
  console.error('  FAIL: Could not parse organizational_intelligence.agi: ' + err);
}

// --- Test: TRIGGER parsing ---

section('TRIGGER parsing');

const triggerSrc = `
APP test_trig {
  TITLE  "Test"
  DB     test.db
}

TRIGGER on_event {
  DESCRIPTION  "Reactive trigger"

  WHEN {
    CHANNEL    rejection_queue, audit_stream
    PACKET     ImageBatchRejected
    FILTER     "confidence > 0.5"
  }

  FIRES        REASONER refinement_reasoner

  DEBOUNCE     "2s"
  RATE_LIMIT   "30/min"
  IDEMPOTENT   true

  GOVERNANCE {
    SIGNED_BY    OpsAuthority
    AUDIT        all_actions
  }
}

TRIGGER fires_workflow {
  DESCRIPTION  "Minimal trigger"
  WHEN { CHANNEL ch1 }
  FIRES        WORKFLOW handler_workflow
}

TRIGGER fires_session {
  DESCRIPTION  "Session trigger"
  WHEN { CHANNEL ch2 }
  FIRES        SESSION creative_session
}
`;

const trigResult = parse(triggerSrc);
assert(trigResult.triggers.length === 3, 'Should have 3 triggers');

const t1 = trigResult.triggers[0]!;
assert(t1.name === 'on_event', 'Trigger name');
assert(t1.when.channels.length === 2, 'Trigger 2 channels');
assert(t1.when.packet === 'ImageBatchRejected', 'Trigger packet filter');
assert(t1.when.filter === 'confidence > 0.5', 'Trigger filter string');
assert(t1.fires.kind === 'reasoner', 'Trigger fires kind');
assert(t1.fires.target === 'refinement_reasoner', 'Trigger fires target');
assert(t1.debounce === '2s', 'Trigger debounce');
assert(t1.rateLimit === '30/min', 'Trigger rate limit');
assert(t1.idempotent === true, 'Trigger idempotent');
assert(t1.governance!.signedBy === 'OpsAuthority', 'Trigger signed by');

assert(trigResult.triggers[1]!.fires.kind === 'workflow', 'Workflow trigger');
assert(trigResult.triggers[2]!.fires.kind === 'session', 'Session trigger');

// --- Test: CHANNEL queue fields ---

section('CHANNEL queue fields');

const chanSrc = `
APP test_ch {
  TITLE  "Test"
  DB     test.db
}

CHANNEL primary_q {
  DESCRIPTION  "Primary queue"
  PROTOCOL     queue
  DIRECTION    bidirectional
  PACKET       Event
  RETRY        3
  TIMEOUT      30000
  ORDERING     fifo
  DEAD_LETTER  primary_dlq
}

CHANNEL primary_dlq {
  DESCRIPTION  "DLQ"
  PROTOCOL     queue
  DIRECTION    inbound
  PACKET       Event
}
`;

const chanResult = parse(chanSrc);
assert(chanResult.channels.length === 2, 'Should have 2 channels');
assert(chanResult.channels[0]!.ordering === 'fifo', 'Channel ordering fifo');
assert(chanResult.channels[0]!.deadLetter === 'primary_dlq', 'Channel dead letter');
assert(chanResult.channels[0]!.retry === 3, 'Channel retry preserved');
assert(chanResult.channels[1]!.ordering === undefined, 'DLQ has no ordering set');

// --- Test: ROUTER circuit breaker ---

section('ROUTER circuit breaker');

const routerSrc = `
APP test_r {
  TITLE  "Test"
  DB     test.db
}

ROUTER MyRouter {
  DESCRIPTION "Routes with circuit breaker"

  TIER 1 free {
    m1: huggingface "Q/m" {
      STRENGTHS  general
      CONTEXT    32768
      DEFAULT
    }

    CIRCUIT_BREAKER {
      THRESHOLD  0.4
      WINDOW     "90s"
      FALLBACK   2
    }
  }

  TIER 2 mid {
    m2: anthropic "claude-haiku-4-5-20251001" {
      STRENGTHS  general
      COST       0.1
      CONTEXT    200000
    }
  }

  TASK_TYPES   general
  MOSH_PIT     3
  CALIBRATION  true
}
`;

const routerResult = parse(routerSrc);
const tier1 = routerResult.routers[0]!.tiers[0]!;
assert(tier1.circuitBreaker !== undefined, 'Tier 1 has circuit breaker');
assert(tier1.circuitBreaker!.threshold === 0.4, 'CB threshold');
assert(tier1.circuitBreaker!.window === '90s', 'CB window');
assert(tier1.circuitBreaker!.fallback === 2, 'CB fallback tier');
assert(routerResult.routers[0]!.tiers[1]!.circuitBreaker === undefined, 'Tier 2 has no CB');

// --- Test: IDEMPOTENT on REASONER/WORKFLOW/PIPELINE ---

section('IDEMPOTENT field');

const idempSrc = `
APP test_i {
  TITLE  "Test"
  DB     test.db
}

REASONER r1 {
  DESCRIPTION "Idempotent reasoner"
  INPUT { CHANNEL ch1 WINDOW "1h" }
  USES        sd
  OUTPUT { PACKET P }
  SCHEDULE    daily
  IDEMPOTENT  true
}

WORKFLOW w1 {
  IDEMPOTENT true

  STEP s1 {
    ACTION  ActionA
  }
}
`;

const idempResult = parse(idempSrc);
assert(idempResult.reasoners[0]!.idempotent === true, 'Reasoner idempotent');
assert(idempResult.workflows[0]!.idempotent === true, 'Workflow idempotent');

// --- Test: Full distributed_cognition.agi ---

section('Full distributed_cognition.agi parsing');

try {
  const dcPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/distributed-cognition/distributed_cognition.agi'
  );
  const source = readFileSync(dcPath, 'utf-8');
  const result = parse(source);

  assert(result.app.telemetry === 'auto', 'DC app telemetry auto');
  assert(result.triggers.length === 2, 'DC has 2 triggers');
  assert(result.reasoners.length === 1, 'DC has 1 reasoner');
  assert(result.channels.length === 3, 'DC has 3 channels');
  assert(result.routers.length === 1, 'DC has 1 router');

  const onRejection = result.triggers.find((t) => t.name === 'on_rejection');
  assert(onRejection !== undefined, 'on_rejection trigger exists');
  assert(onRejection!.fires.kind === 'reasoner', 'on_rejection fires reasoner');
  assert(onRejection!.fires.target === 'refinement_reasoner', 'on_rejection target');
  assert(onRejection!.idempotent === true, 'on_rejection idempotent');

  const rejQueue = result.channels.find((c) => c.name === 'rejection_queue');
  assert(rejQueue !== undefined, 'rejection_queue exists');
  assert(rejQueue!.ordering === 'fifo', 'rejection_queue is fifo');
  assert(rejQueue!.deadLetter === 'rejection_dlq', 'rejection_queue has DLQ');

  const visionRouter = result.routers[0]!;
  assert(visionRouter.tiers[0]!.circuitBreaker !== undefined, 'Tier 1 has CB');
  assert(visionRouter.tiers[1]!.circuitBreaker !== undefined, 'Tier 2 has CB');
  assert(visionRouter.tiers[0]!.circuitBreaker!.fallback === 2, 'Tier 1 falls back to tier 2');

  assert(result.reasoners[0]!.idempotent === true, 'Refinement reasoner is idempotent');
  assert(result.workflows[0]!.idempotent === true, 'Regenerate workflow is idempotent');

  console.log('  Parsed successfully: ' + result.triggers.length + ' triggers, ' + result.channels.filter(c => c.ordering).length + ' queue-ordered channels, ' + result.routers[0]!.tiers.filter(t => t.circuitBreaker).length + ' tiers with circuit breakers');
} catch (err) {
  failed++;
  console.error('  FAIL: Could not parse distributed_cognition.agi: ' + err);
}

// --- Test: Full creator_network.agi ---

section('Full creator_network.agi parsing');

try {
  const creatorPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/creator-network/creator_network.agi'
  );
  const source = readFileSync(creatorPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'creator_network', 'App name');
  assert(result.identities.length === 2, 'Should have 2 identities');
  assert(result.feeds.length === 3, 'Should have 3 feeds');
  assert(result.packets.length === 2, 'Should have 2 packets');
  assert(result.authorities.length === 1, 'Should have 1 authority');
  assert(result.channels.length === 3, 'Should have 3 channels');
  assert(result.entities.length === 3, 'Should have 3 entities');

  // Identity details
  const creator = result.identities.find(i => i.name === 'CreatorProfile');
  assert(creator !== undefined, 'Should have CreatorProfile');
  assert(creator!.signingKey === 'ed25519', 'Signing key should be ed25519');
  assert(creator!.domains.length === 5, 'Should have 5 domains');
  assert(creator!.discoverable === true, 'Should be discoverable');
  assert(creator!.portable === true, 'Should be portable');
  assert(creator!.profile.length === 7, 'Should have 7 profile fields');
  assert(creator!.profile[0]!.name === 'display_name', 'First profile field');
  assert(creator!.profile[0]!.required === true, 'display_name should be required');

  const sysNode = result.identities.find(i => i.name === 'SystemNode');
  assert(sysNode !== undefined, 'Should have SystemNode');
  assert(sysNode!.discoverable === false, 'SystemNode should not be discoverable');

  // Feed details
  const blog = result.feeds.find(f => f.name === 'creator_blog');
  assert(blog !== undefined, 'Should have creator_blog feed');
  assert(blog!.identity === 'CreatorProfile', 'Feed identity');
  assert(blog!.packet === 'BlogPost', 'Feed packet');
  assert(blog!.channel === 'public_feed', 'Feed channel');
  assert(blog!.subscribe === 'open', 'Subscribe mode');
  assert(blog!.syndicate === true, 'Should allow syndication');
  assert(blog!.maxItems === 500, 'Max items');

  const premium = result.feeds.find(f => f.name === 'premium_content');
  assert(premium !== undefined, 'Should have premium_content');
  assert(premium!.subscribe === 'approved', 'Premium should be approved');
  assert(premium!.syndicate === false, 'Premium should not syndicate');
  assert(premium!.discovery === false, 'Premium should not be discoverable');

  console.log(`  Parsed successfully: ${result.identities.length} identities, ${result.feeds.length} feeds, ${result.packets.length} packets, ${result.channels.length} channels`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse creator_network.agi: ${err}`);
}

// --- Test: Full basketball_mmo.agi ---

section('Full basketball_mmo.agi parsing');

try {
  const bballPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/basketball-mmo/basketball_mmo.agi'
  );
  const source = readFileSync(bballPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'basketball_mmo', 'App name');
  assert(result.sensors.length === 3, 'Should have 3 sensors');
  assert(result.nodes.length === 2, 'Should have 2 nodes');
  assert(result.zones.length === 1, 'Should have 1 zone');
  assert(result.identities.length === 1, 'Should have 1 identity');
  assert(result.packets.length === 1, 'Should have 1 packet');
  assert(result.channels.length === 1, 'Should have 1 channel');
  assert(result.feeds.length === 1, 'Should have 1 feed');
  assert(result.scores.length === 3, 'Should have 3 scores');
  assert(result.rules.length === 6, 'Should have 6 rules');
  assert(result.states.length === 1, 'Should have 1 state machine');
  assert(result.qcs.length === 1, 'Should have 1 QC');
  assert(result.entities.length === 4, 'Should have 4 entities');
  assert(result.views.length === 5, 'Should have 5 views');
  assert(result.tests.length === 3, 'Should have 3 tests');

  // Node details
  const scorer = result.nodes.find(n => n.name === 'court_scorer');
  assert(scorer !== undefined, 'Should have court_scorer node');
  assert(scorer!.type === 'environment', 'Node type should be environment');
  assert(scorer!.hardware === 'rpi5', 'Hardware should be rpi5');
  assert(scorer!.aiTier === 'edge', 'AI tier should be edge');
  assert(scorer!.sensors.length === 3, 'Should have 3 sensor refs');
  assert(scorer!.zone === 'MainCourt', 'Zone should be MainCourt');
  assert(scorer!.offline === true, 'Should work offline');

  // Sensor details
  const cam = result.sensors.find(s => s.name === 'court_camera');
  assert(cam !== undefined, 'Should have court_camera sensor');
  assert(cam!.type === 'camera', 'Sensor type should be camera');
  assert(cam!.capabilities.length === 4, 'Camera should have 4 capabilities');
  assert(cam!.latency === 150, 'Latency should be 150ms');
  assert(cam!.accuracy === 0.95, 'Accuracy should be 0.95');

  // Zone details
  const court = result.zones[0]!;
  assert(court.name === 'MainCourt', 'Zone name');
  assert(court.bounds === '28x15m', 'Court bounds');
  assert(court.ambient === true, 'Should be ambient');
  assert(court.capacity === 20, 'Capacity should be 20');

  // Game mechanics
  assert(result.scores.find(s => s.name === 'player_xp') !== undefined, 'Should have player_xp score');
  assert(result.scores.find(s => s.name === 'streak_counter') !== undefined, 'Should have streak_counter');
  assert(result.rules.find(r => r.name === 'made_shot') !== undefined, 'Should have made_shot rule');
  assert(result.rules.find(r => r.name === 'distance_bonus') !== undefined, 'Should have distance_bonus rule');
  assert(result.states[0]!.name === 'GamePhase', 'State machine should be GamePhase');
  assert(result.states[0]!.states.length === 4, 'Should have 4 game states');

  console.log(`  Parsed successfully: ${result.nodes.length} nodes, ${result.sensors.length} sensors, ${result.zones.length} zones, ${result.scores.length} scores, ${result.rules.length} rules, ${result.entities.length} entities`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse basketball_mmo.agi: ${err}`);
}

// --- Test: Full semantic_workflow.agi ---

section('Full semantic_workflow.agi parsing');

try {
  const swPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/semantic-workflow/semantic_workflow.agi'
  );
  const source = readFileSync(swPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'semantic_workflow', 'App name');
  assert(result.sessions.length === 6, 'Should have 6 sessions');
  assert(result.compilers.length === 6, 'Should have 6 compilers');
  assert(result.entities.length === 2, 'Should have 2 entities');

  // Session details
  const brainstorm = result.sessions.find(s => s.name === 'brainstorm');
  assert(brainstorm !== undefined, 'Should have brainstorm session');
  assert(brainstorm!.tools.length === 4, 'Brainstorm should have 4 tools');
  assert(brainstorm!.context === 'conversation', 'Context should be conversation');
  assert(brainstorm!.memory === 'session', 'Memory should be session');
  assert(brainstorm!.output.length === 3, 'Should have 3 output types');

  const coding = result.sessions.find(s => s.name === 'coding');
  assert(coding !== undefined, 'Should have coding session');
  assert(coding!.persist === true, 'Coding should persist');
  assert(coding!.tools.length === 5, 'Coding should have 5 tools');

  // Compiler details
  const chatToSkill = result.compilers.find(c => c.name === 'chat_to_skilldoc');
  assert(chatToSkill !== undefined, 'Should have chat_to_skilldoc compiler');
  assert(chatToSkill!.from === 'brainstorm', 'From should be brainstorm');
  assert(chatToSkill!.to === 'skilldoc_editor', 'To should be skilldoc_editor');
  assert(chatToSkill!.extract.length === 5, 'Should extract 5 things');
  assert(chatToSkill!.enrich.length === 4, 'Should have 4 enrich operations');
  assert(chatToSkill!.enrich[0]!.operation === 'INFER', 'First enrich should be INFER');
  assert(chatToSkill!.enrich[0]!.target === 'implicit_constraints', 'INFER target');
  assert(chatToSkill!.enrich[1]!.operation === 'DETECT', 'Second enrich should be DETECT');
  assert(chatToSkill!.ai !== undefined, 'Should have AI prompt');
  assert(chatToSkill!.validate === true, 'Should validate');

  const chatToReq = result.compilers.find(c => c.name === 'chat_to_requirements');
  assert(chatToReq!.enrich.length === 6, 'chat_to_requirements should have 6 enrich ops');

  const reqToDslComp = result.compilers.find(c => c.name === 'requirements_to_dsl');
  assert(reqToDslComp!.enrich.length === 5, 'requirements_to_dsl should have 5 enrich ops');

  const reqToDsl = result.compilers.find(c => c.name === 'requirements_to_dsl');
  assert(reqToDsl !== undefined, 'Should have requirements_to_dsl');
  assert(reqToDsl!.from === 'requirements', 'From should be requirements');
  assert(reqToDsl!.to === 'coding', 'To should be coding');

  console.log(`  Parsed successfully: ${result.sessions.length} sessions, ${result.compilers.length} compilers, ${result.entities.length} entities`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse semantic_workflow.agi: ${err}`);
}

// --- Expert System Tests ---

section('FACT parsing');

const factTest = `
APP test {
  TITLE "Test"
  DB test.db
}

FACT UserIntent {
  category: string
  tone: string
  confidence: float = 0.5
}

FACT Context {
  turn_count: number = 0
  PERSISTENT
}
`;

const factResult = parse(factTest);
assert(factResult.facts.length === 2, 'Should have 2 facts');
assert(factResult.facts[0]!.name === 'UserIntent', 'First fact should be UserIntent');
assert(factResult.facts[0]!.fields.length === 3, 'UserIntent should have 3 fields');
assert(factResult.facts[0]!.persistent === false, 'UserIntent should not be persistent');
assert(factResult.facts[1]!.name === 'Context', 'Second fact should be Context');
assert(factResult.facts[1]!.persistent === true, 'Context should be persistent');
assert(factResult.facts[1]!.fields[0]!.defaultValue === 0, 'turn_count default should be 0');

// --- Test: STATE ---

section('STATE parsing');

const stateTest = `
APP test {
  TITLE "Test"
  DB test.db
}

STATE ConversationPhase {
  INITIAL greeting

  greeting {
    ON_ENTER send_welcome
    TRANSITION exploring WHEN turn_count > 3
  }

  exploring {
    TRANSITION suspicious WHEN suspicion_score >= 10
    TRANSITION side_quest WHEN module_active == true
  }

  suspicious {
    ON_ENTER increase_leaks
    ON_EXIT reset_leaks
    TRANSITION revealed WHEN suspicion_score >= 20
  }

  revealed {
    ON_ENTER show_reveal
  }
}
`;

const stateResult = parse(stateTest);
assert(stateResult.states.length === 1, 'Should have 1 state machine');
const sm = stateResult.states[0]!;
assert(sm.name === 'ConversationPhase', 'State machine name');
assert(sm.initial === 'greeting', 'Initial state should be greeting');
assert(sm.states.length === 4, 'Should have 4 states');
assert(sm.states[0]!.name === 'greeting', 'First state');
assert(sm.states[0]!.onEnter === 'send_welcome', 'greeting ON_ENTER');
assert(sm.states[0]!.transitions.length === 1, 'greeting should have 1 transition');
assert(sm.states[0]!.transitions[0]!.target === 'exploring', 'greeting transitions to exploring');
assert(sm.states[1]!.transitions.length === 2, 'exploring should have 2 transitions');
assert(sm.states[2]!.onEnter === 'increase_leaks', 'suspicious ON_ENTER');
assert(sm.states[2]!.onExit === 'reset_leaks', 'suspicious ON_EXIT');

// --- Test: PATTERN ---

section('PATTERN parsing');

const patternTest = `
APP test {
  TITLE "Test"
  DB test.db
}

PATTERN greeting {
  MATCH    "/^(hi|hello)\\\\b/i"
  RESPOND  "Hello there.", "Welcome."
  CATEGORY "social"
  PRIORITY 10
}

PATTERN validation_seeker {
  MATCH    "/i think i'm doing well/i"
  RESPOND  "That's one interpretation."
  SCORE    suspicion_score 2
  ASSERT   UserIntent { category: "self_assessment", tone: "seeking" }
  CATEGORY "personality"
  PRIORITY 5
}
`;

const patternResult = parse(patternTest);
assert(patternResult.patterns.length === 2, 'Should have 2 patterns');
const p1 = patternResult.patterns[0]!;
assert(p1.name === 'greeting', 'First pattern name');
assert(p1.match.length === 1, 'Should have 1 match pattern');
assert(p1.responses.length === 2, 'Should have 2 responses');
assert(p1.priority === 10, 'Priority should be 10');
assert(p1.category === 'social', 'Category should be social');

const p2 = patternResult.patterns[1]!;
assert(p2.score !== undefined, 'Should have score');
assert(p2.score!.name === 'suspicion_score', 'Score name');
assert(p2.score!.delta === 2, 'Score delta');
assert(p2.assertFact !== undefined, 'Should have assert');
assert(p2.assertFact!.name === 'UserIntent', 'Assert fact name');
assert(p2.assertFact!.fields['category'] === 'self_assessment', 'Assert category');

// --- Test: SCORE ---

section('SCORE parsing');

const scoreTest = `
APP test {
  TITLE "Test"
  DB test.db
}

SCORE suspicion_score {
  INITIAL   0
  MIN       0
  MAX       20
  DECAY     1 PER turn
  THRESHOLD curious AT 5 THEN log_suspicion
  THRESHOLD caught AT 15 THEN trigger_reveal
}
`;

const scoreResult = parse(scoreTest);
assert(scoreResult.scores.length === 1, 'Should have 1 score');
const sc = scoreResult.scores[0]!;
assert(sc.name === 'suspicion_score', 'Score name');
assert(sc.initial === 0, 'Initial should be 0');
assert(sc.min === 0, 'Min should be 0');
assert(sc.max === 20, 'Max should be 20');
assert(sc.decay !== undefined, 'Should have decay');
assert(sc.decay!.amount === 1, 'Decay amount');
assert(sc.decay!.per === 'turn', 'Decay per');
assert(sc.thresholds.length === 2, 'Should have 2 thresholds');
assert(sc.thresholds[0]!.name === 'curious', 'First threshold name');
assert(sc.thresholds[0]!.value === 5, 'First threshold value');
assert(sc.thresholds[0]!.action === 'log_suspicion', 'First threshold action');
assert(sc.thresholds[1]!.name === 'caught', 'Second threshold name');
assert(sc.thresholds[1]!.value === 15, 'Second threshold value');

// --- Test: MODULE ---

section('MODULE parsing');

const moduleTest = `
APP test {
  TITLE "Test"
  DB test.db
}

MODULE WarGames {
  DESCRIPTION "WOPR simulation"
  ACTIVATE_WHEN gen_x_score >= 10
  DEACTIVATE_WHEN wargames_complete == true

  PATTERN joshua {
    MATCH    "/.*/"
    RESPOND  "SHALL WE PLAY A GAME?"
    PRIORITY 100
  }

  RULE block_normal {
    WHEN wargames_active == true
    THEN suppress_main_patterns
    PRIORITY 50
  }
}
`;

const moduleResult = parse(moduleTest);
assert(moduleResult.modules.length === 1, 'Should have 1 module');
const mod = moduleResult.modules[0]!;
assert(mod.name === 'WarGames', 'Module name');
assert(mod.description === 'WOPR simulation', 'Module description');
assert(mod.activateWhen !== undefined, 'Should have activate condition');
assert(mod.deactivateWhen !== undefined, 'Should have deactivate condition');
assert(mod.patterns.length === 1, 'Should have 1 pattern');
assert(mod.patterns[0]!.name === 'joshua', 'Pattern name in module');
assert(mod.patterns[0]!.priority === 100, 'Pattern priority');
assert(mod.rules.length === 1, 'Should have 1 rule');
assert(mod.rules[0]!.name === 'block_normal', 'Rule name in module');

// --- Test: Full conversation_engine.agi ---

section('Full conversation_engine.agi parsing');

try {
  const convoPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../examples/conversation-engine/conversation_engine.agi'
  );
  const source = readFileSync(convoPath, 'utf-8');
  const result = parse(source);

  assert(result.app.name === 'conversation_engine', 'App name');
  assert(result.facts.length === 3, 'Should have 3 facts');
  assert(result.scores.length === 4, 'Should have 4 scores');
  assert(result.states.length === 1, 'Should have 1 state machine');
  assert(result.patterns.length === 8, 'Should have 8 top-level patterns');
  assert(result.modules.length === 2, 'Should have 2 modules');
  assert(result.entities.length === 3, 'Should have 3 entities');
  assert(result.views.length === 3, 'Should have 3 views');
  assert(result.tests.length === 2, 'Should have 2 tests');

  // Check module details
  const wargames = result.modules.find(m => m.name === 'WarGames');
  assert(wargames !== undefined, 'Should have WarGames module');
  assert(wargames!.patterns.length === 4, 'WarGames should have 4 patterns');
  assert(wargames!.states.length === 1, 'WarGames should have 1 state machine');

  const jedi = result.modules.find(m => m.name === 'JediMaster');
  assert(jedi !== undefined, 'Should have JediMaster module');
  assert(jedi!.patterns.length === 2, 'JediMaster should have 2 patterns');

  // Check score details
  const suspicion = result.scores.find(s => s.name === 'suspicion_score');
  assert(suspicion !== undefined, 'Should have suspicion_score');
  assert(suspicion!.thresholds.length === 3, 'suspicion should have 3 thresholds');

  console.log(`  Parsed successfully: ${result.facts.length} facts, ${result.scores.length} scores, ${result.states.length} state machines, ${result.patterns.length} patterns, ${result.modules.length} modules, ${result.entities.length} entities`);
} catch (err) {
  failed++;
  console.error(`  FAIL: Could not parse conversation_engine.agi: ${err}`);
}

// --- Test: WORKSPACES field on APP ---

section('APP WORKSPACES field');

const workspaceApp = `
APP ws_app {
  TITLE "Workspace App"
  DB    ws.db
  WORKSPACES
}
`;
const wsResult = parse(workspaceApp);
assert(wsResult.app.workspaces === true, 'WORKSPACES flag should be true when declared');

// Not declared → undefined (falsy)
const noWsApp = `APP nows { TITLE "No WS" DB nows.db }`;
const noWsResult = parse(noWsApp);
assert(!noWsResult.app.workspaces, 'workspaces should be undefined when not declared');

// --- Test: TRAY and HOTKEY fields on APP ---

section('APP TRAY and HOTKEY fields');

const trayApp = `
APP tray_app {
  TITLE  "Tray App"
  DB     tray.db
  TRAY
  HOTKEY "Ctrl+Shift+N"
}
`;
const trayResult = parse(trayApp);
assert(trayResult.app.tray === true, 'TRAY flag should be true when declared');
assert(trayResult.app.hotkey === 'Ctrl+Shift+N', 'HOTKEY should capture the shortcut string');

// TRAY without HOTKEY
const trayOnlyApp = `APP tonly { TITLE "T" DB t.db TRAY }`;
const trayOnlyResult = parse(trayOnlyApp);
assert(trayOnlyResult.app.tray === true, 'TRAY can be declared alone');
assert(!trayOnlyResult.app.hotkey, 'hotkey should be undefined when HOTKEY not declared');

// HOTKEY without TRAY
const hotkeyOnlyApp = `APP honly { TITLE "H" DB h.db HOTKEY "Ctrl+Alt+N" }`;
const hotkeyOnlyResult = parse(hotkeyOnlyApp);
assert(!hotkeyOnlyResult.app.tray, 'tray should be undefined when TRAY not declared');
assert(hotkeyOnlyResult.app.hotkey === 'Ctrl+Alt+N', 'HOTKEY alone should parse correctly');

// All APP fields together
const fullApp2 = `
APP full2 {
  TITLE      "Full 2"
  WINDOW     1200x800 frameless
  DB         full2.db
  PORT       5201
  THEME      dark
  CURRENT    Session
  WORKSPACES
  TRAY
  HOTKEY     "Ctrl+Shift+Space"
}
`;
const full2Result = parse(fullApp2);
assert(full2Result.app.tray === true, 'TRAY coexists with all other APP fields');
assert(full2Result.app.hotkey === 'Ctrl+Shift+Space', 'HOTKEY coexists with all other APP fields');
assert(full2Result.app.workspaces === true, 'WORKSPACES still parses alongside TRAY+HOTKEY');

// WORKSPACES can appear alongside CURRENT and WINDOW
const fullWsApp = `
APP full_ws {
  TITLE     "Full WS"
  WINDOW    1200x800 frameless
  DB        full.db
  PORT      5199
  THEME     dark
  CURRENT   Session
  WORKSPACES
}
`;
const fullWsResult = parse(fullWsApp);
assert(fullWsResult.app.workspaces === true, 'WORKSPACES should coexist with other APP fields');
assert(fullWsResult.app.current?.[0] === 'Session', 'CURRENT should still parse alongside WORKSPACES');
assert(fullWsResult.app.window?.frameless === true, 'WINDOW frameless should still parse alongside WORKSPACES');

// --- Test: EVENT declaration ---

section('EVENT declaration');

const eventDsl = `
APP event_app { TITLE "Event App" DB event.db }

EVENT ImageBatchRejected {
  DESCRIPTION "Fires when a batch of generated images fails QC validation"
  PAYLOAD {
    batch_id: string
    rejection_reason: string
    attempt_count: string
  }
  SUBSCRIBERS [PromptRefinementWorkflow, AuditLogger]
  IDEMPOTENT true
  TTL 3600
}
`;

try {
  const eventResult = parse(eventDsl);
  assert(eventResult.events.length === 1, 'Should have 1 EVENT declaration');
  const ev = eventResult.events[0]!;
  assert(ev.kind === 'event', 'EVENT kind should be "event"');
  assert(ev.name === 'ImageBatchRejected', 'EVENT name should be ImageBatchRejected');
  assert(ev.description === 'Fires when a batch of generated images fails QC validation', 'EVENT description should match');
  assert(ev.payload.length === 3, 'EVENT payload should have 3 fields');
  assert(ev.payload[0]!.name === 'batch_id', 'First payload field should be batch_id');
  assert(ev.payload[0]!.type === 'string', 'First payload field type should be string');
  assert(ev.subscribers.length === 2, 'EVENT should have 2 subscribers');
  assert(ev.subscribers[0] === 'PromptRefinementWorkflow', 'First subscriber should be PromptRefinementWorkflow');
  assert(ev.subscribers[1] === 'AuditLogger', 'Second subscriber should be AuditLogger');
  assert(ev.idempotent === true, 'EVENT idempotent should be true');
  assert(ev.ttl === 3600, 'EVENT TTL should be 3600');
  console.log('  EVENT parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: EVENT parse error: ${err}`);
}

// --- Test: NBVE declaration ---

section('NBVE declaration');

const nbveDsl = `
APP nbve_app { TITLE "NBVE App" DB nbve.db }

NBVE LinkedInCommentOptimizer {
  DESCRIPTION "Shadow-tests Qwen3-72B against Claude Sonnet for LinkedIn comments"
  PRODUCTION "claude-sonnet-4-20250514"
  SHADOW "Qwen/Qwen3-72B"
  SPC {
    WINDOW 50
    CONFIDENCE 0.95
    ACCURACY_THRESHOLD 0.90
    STABILITY_THRESHOLD 0.92
    DEFECT_RATE_MAX 0.05
  }
  METRICS [semantic_accuracy, workflow_stability, human_acceptance_rate, token_cost]
  PROMOTION auto
  FALLBACK production
}
`;

try {
  const nbveResult = parse(nbveDsl);
  assert(nbveResult.nbves.length === 1, 'Should have 1 NBVE declaration');
  const nb = nbveResult.nbves[0]!;
  assert(nb.kind === 'nbve', 'NBVE kind should be "nbve"');
  assert(nb.name === 'LinkedInCommentOptimizer', 'NBVE name should be LinkedInCommentOptimizer');
  assert(nb.production === 'claude-sonnet-4-20250514', 'NBVE production model should match');
  assert(nb.shadow === 'Qwen/Qwen3-72B', 'NBVE shadow model should match');
  assert(nb.spc.window === 50, 'NBVE SPC window should be 50');
  assert(nb.spc.confidence === 0.95, 'NBVE SPC confidence should be 0.95');
  assert(nb.spc.accuracyThreshold === 0.90, 'NBVE SPC accuracyThreshold should be 0.90');
  assert(nb.spc.stabilityThreshold === 0.92, 'NBVE SPC stabilityThreshold should be 0.92');
  assert(nb.spc.defectRateMax === 0.05, 'NBVE SPC defectRateMax should be 0.05');
  assert(nb.metrics.length === 4, 'NBVE should have 4 metrics');
  assert(nb.metrics[0] === 'semantic_accuracy', 'First metric should be semantic_accuracy');
  assert(nb.promotion === 'auto', 'NBVE promotion should be auto');
  assert(nb.fallback === 'production', 'NBVE fallback should be production');
  console.log('  NBVE parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: NBVE parse error: ${err}`);
}

// --- Test: CONTRACT declaration ---

section('CONTRACT declaration');

const contractDsl = `
APP contract_app { TITLE "Contract App" DB contract.db }

CONTRACT MusicCommission {
  DESCRIPTION "Custom synthwave intro commission"
  PARTIES {
    client: Identity
    provider: Identity
  }
  TERMS {
    delivery_deadline: "14d"
    revisions: 2
  }
  DELIVERABLES {
    audio_file: REQUIRED
    commercial_license: REQUIRED
  }
  PAYMENT {
    METHOD ach
    AMOUNT 50
    CURRENCY "USD"
    RELEASE on_acceptance
    RECURRING false
  }
  GOVERNANCE {
    SIGNED_BY both
    DISPUTE optional
  }
  TIMESTAMPS
}
`;

try {
  const contractResult = parse(contractDsl);
  assert(contractResult.contracts.length === 1, 'Should have 1 CONTRACT declaration');
  const ct = contractResult.contracts[0]!;
  assert(ct.kind === 'contract', 'CONTRACT kind should be "contract"');
  assert(ct.name === 'MusicCommission', 'CONTRACT name should be MusicCommission');
  assert(ct.description === 'Custom synthwave intro commission', 'CONTRACT description should match');
  assert(ct.parties.length === 2, 'CONTRACT should have 2 parties');
  assert(ct.parties[0]!.role === 'client', 'First party role should be client');
  assert(ct.parties[0]!.type === 'Identity', 'First party type should be Identity');
  assert(ct.terms.length === 2, 'CONTRACT should have 2 terms');
  assert(ct.terms[0]!.key === 'delivery_deadline', 'First term key should be delivery_deadline');
  assert(ct.terms[0]!.value === '14d', 'First term value should be 14d');
  assert(ct.deliverables.length === 2, 'CONTRACT should have 2 deliverables');
  assert(ct.deliverables[0]!.name === 'audio_file', 'First deliverable name should be audio_file');
  assert(ct.deliverables[0]!.required === true, 'First deliverable should be required');
  assert(ct.payment.method === 'ach', 'CONTRACT payment method should be ach');
  assert(ct.payment.amount === 50, 'CONTRACT payment amount should be 50');
  assert(ct.payment.currency === 'USD', 'CONTRACT payment currency should be USD');
  assert(ct.payment.release === 'on_acceptance', 'CONTRACT payment release should be on_acceptance');
  assert(ct.payment.recurring === false, 'CONTRACT payment recurring should be false');
  assert(ct.governance.signedBy === 'both', 'CONTRACT governance signedBy should be both');
  assert(ct.governance.dispute === 'optional', 'CONTRACT governance dispute should be optional');
  assert(ct.timestamps === true, 'CONTRACT timestamps should be true');
  console.log('  CONTRACT parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: CONTRACT parse error: ${err}`);
}

// ============================================================
// REPUTATION Tests
// ============================================================

console.log('\n--- REPUTATION declaration ---');

const reputationDsl = `
APP TestApp { TITLE "Test" DB "test.db" }

REPUTATION CreatorReliability {
  DESCRIPTION "SPC-driven trust scoring for creators"
  METRICS {
    on_time_delivery: float
    acceptance_rate: float
    dispute_rate: float
  }
  SPC {
    MATURING_THRESHOLD 50
    MATURE_THRESHOLD 100
    CONFIDENCE 0.95
  }
  DECAY {
    enabled true
    HALF_LIFE "180d"
  }
}
`;

try {
  const repResult = parse(reputationDsl);
  assert(repResult.reputations.length === 1, 'Should have 1 REPUTATION declaration');
  const rep = repResult.reputations[0]!;
  assert(rep.kind === 'reputation', 'REPUTATION kind should be "reputation"');
  assert(rep.name === 'CreatorReliability', 'REPUTATION name should be CreatorReliability');
  assert(rep.description === 'SPC-driven trust scoring for creators', 'REPUTATION description should match');
  assert(rep.metrics.length === 3, 'REPUTATION should have 3 metrics');
  assert(rep.metrics[0]!.name === 'on_time_delivery', 'First metric name should match');
  assert(rep.metrics[0]!.type === 'float', 'First metric type should be float');
  assert(rep.spc.maturingThreshold === 50, 'REPUTATION SPC maturingThreshold should be 50');
  assert(rep.spc.matureThreshold === 100, 'REPUTATION SPC matureThreshold should be 100');
  assert(rep.spc.requiredConfidence === 0.95, 'REPUTATION SPC requiredConfidence should be 0.95');
  assert(rep.decay.enabled === true, 'REPUTATION decay should be enabled');
  assert(rep.decay.halfLife === '180d', 'REPUTATION decay halfLife should be 180d');
  console.log('  REPUTATION parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: REPUTATION parse error: ${err}`);
}

// ============================================================
// SUBSCRIPTION Tests
// ============================================================

console.log('\n--- SUBSCRIPTION declaration ---');

const subscriptionDsl = `
APP TestApp { TITLE "Test" DB "test.db" }

SUBSCRIPTION CreatorSupport {
  DESCRIPTION "Monthly creator support subscription"
  PROVIDER CreatorProfile
  SUBSCRIBER FanProfile
  TERMS {
    AMOUNT 5
    INTERVAL monthly
    PERKS ["premium_feed", "private_chat"]
  }
  PAYMENT {
    METHOD stripe
    AUTO_RENEW true
  }
}
`;

try {
  const subResult = parse(subscriptionDsl);
  assert(subResult.subscriptions.length === 1, 'Should have 1 SUBSCRIPTION declaration');
  const sub = subResult.subscriptions[0]!;
  assert(sub.kind === 'subscription', 'SUBSCRIPTION kind should be "subscription"');
  assert(sub.name === 'CreatorSupport', 'SUBSCRIPTION name should be CreatorSupport');
  assert(sub.description === 'Monthly creator support subscription', 'SUBSCRIPTION description should match');
  assert(sub.provider === 'CreatorProfile', 'SUBSCRIPTION provider should be CreatorProfile');
  assert(sub.subscriber === 'FanProfile', 'SUBSCRIPTION subscriber should be FanProfile');
  assert(sub.terms.amount === 5, 'SUBSCRIPTION terms amount should be 5');
  assert(sub.terms.interval === 'monthly', 'SUBSCRIPTION terms interval should be monthly');
  assert(sub.terms.perks.length === 2, 'SUBSCRIPTION terms should have 2 perks');
  assert(sub.terms.perks[0] === 'premium_feed', 'First perk should be premium_feed');
  assert(sub.payment.method === 'stripe', 'SUBSCRIPTION payment method should be stripe');
  assert(sub.payment.autoRenew === true, 'SUBSCRIPTION payment autoRenew should be true');
  console.log('  SUBSCRIPTION parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: SUBSCRIPTION parse error: ${err}`);
}

// ============================================================
// DISPUTE Tests
// ============================================================

console.log('\n--- DISPUTE declaration ---');

const disputeDsl = `
APP TestApp { TITLE "Test" DB "test.db" }

CONTRACT MusicCommission {
  DESCRIPTION "A commission"
  PARTIES { client: Identity provider: Identity }
  TERMS { delivery_deadline: "14d" }
  DELIVERABLES { audio_file: REQUIRED }
  PAYMENT { METHOD ach AMOUNT 50 CURRENCY "USD" RELEASE on_acceptance RECURRING false }
  GOVERNANCE { SIGNED_BY both DISPUTE optional }
}

DISPUTE ContractReview {
  DESCRIPTION "Structured dispute resolution for commission contracts"
  CONTRACT MusicCommission
  STATES {
    opened
    under_review
    resolved
    escalated
  }
  RESOLUTION {
    refund
    revision
    partial_acceptance
    cancellation
  }
}
`;

try {
  const dispResult = parse(disputeDsl);
  assert(dispResult.disputes.length === 1, 'Should have 1 DISPUTE declaration');
  const disp = dispResult.disputes[0]!;
  assert(disp.kind === 'dispute', 'DISPUTE kind should be "dispute"');
  assert(disp.name === 'ContractReview', 'DISPUTE name should be ContractReview');
  assert(disp.description === 'Structured dispute resolution for commission contracts', 'DISPUTE description should match');
  assert(disp.contract === 'MusicCommission', 'DISPUTE contract should be MusicCommission');
  assert(disp.states.length === 4, 'DISPUTE should have 4 states');
  assert(disp.states[0] === 'opened', 'First state should be opened');
  assert(disp.states[3] === 'escalated', 'Last state should be escalated');
  assert(disp.resolutions.length === 4, 'DISPUTE should have 4 resolutions');
  assert(disp.resolutions[0] === 'refund', 'First resolution should be refund');
  assert(disp.resolutions[2] === 'partial_acceptance', 'Third resolution should be partial_acceptance');
  console.log('  DISPUTE parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: DISPUTE parse error: ${err}`);
}

// ============================================================
// Gap tests: Union types, IMPL, PATTERN, EMIT, PREFERENCE, SINGLETON
// ============================================================

const GAP_APP = `
APP gap_test {
  TITLE "Gap Test"
  DB gap.db
}
`;

// --- Test 1: Union type in ACTION OUTPUT ---

section('Gap 4: Union type in ACTION OUTPUT (string | null)');

const unionTypeTest = GAP_APP + `
ACTION foo {
  OUTPUT x: string | null
}
`;

try {
  const unionResult = parse(unionTypeTest);
  const action = unionResult.actions[0];
  assert(action !== undefined, 'Should have 1 action');
  assert(action!.output.length === 1, 'Should have 1 output');
  assert(action!.output[0]!.type === 'string | null', `output[0].type should be 'string | null', got '${action!.output[0]!.type}'`);
  console.log('  Union type parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: Union type parse error: ${err}`);
}

// --- Test 2: ACTION IMPL ---

section('Gap 1: ACTION IMPL');

const implTest = GAP_APP + `
ACTION validate_cf {
  INPUT token: string
  OUTPUT valid: bool
  IMPL "validate_cf_token"
}
`;

try {
  const implResult = parse(implTest);
  const action = implResult.actions[0];
  assert(action !== undefined, 'Should have 1 IMPL action');
  assert(action!.impl === 'validate_cf_token', `impl should be 'validate_cf_token', got '${action!.impl}'`);
  console.log('  ACTION IMPL parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: ACTION IMPL parse error: ${err}`);
}

// --- Test 3: ACTION PATTERN ---

section('Gap 2: ACTION PATTERN');

const actionPatternTest = GAP_APP + `
ACTION pick_avatar {
  OUTPUT path: string | null
  IMPL "pick_avatar_impl"
  PATTERN file_handler
}
`;

try {
  const actionPatternResult = parse(actionPatternTest);
  const action = actionPatternResult.actions[0];
  assert(action !== undefined, 'Should have 1 action with PATTERN');
  assert(action!.pattern === 'file_handler', `pattern should be 'file_handler', got '${action!.pattern}'`);
  console.log('  ACTION PATTERN parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: ACTION PATTERN parse error: ${err}`);
}

// --- Test 4: ACTION EMIT ---

section('Gap 5: ACTION EMIT');

const emitTest = GAP_APP + `
ACTION publish_site {
  INPUT site_id: string
  OUTPUT url: string
  IMPL "publish_site_impl"
  EMIT publish_progress {
    stage: string,
    fileCount: number
  }
}
`;

try {
  const emitResult = parse(emitTest);
  const action = emitResult.actions[0];
  assert(action !== undefined, 'Should have 1 action with EMIT');
  assert(action!.emit !== undefined, 'Action should have emit');
  assert(action!.emit!.eventName === 'publish_progress', `emit.eventName should be 'publish_progress', got '${action!.emit!.eventName}'`);
  assert(action!.emit!.fields.length === 2, `emit.fields should have 2 fields, got ${action!.emit!.fields.length}`);
  assert(action!.emit!.fields[0]!.name === 'stage', `emit.fields[0].name should be 'stage', got '${action!.emit!.fields[0]!.name}'`);
  assert(action!.emit!.fields[0]!.type === 'string', `emit.fields[0].type should be 'string', got '${action!.emit!.fields[0]!.type}'`);
  console.log('  ACTION EMIT parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: ACTION EMIT parse error: ${err}`);
}

// --- Test 5: PREFERENCE declaration ---

section('Gap 3: PREFERENCE declaration');

const prefTest = GAP_APP + `
PREFERENCE AppTheme {
  TYPE string
  DEFAULT "midnight"
  KEY "bka_app_theme"
}
`;

try {
  const prefResult = parse(prefTest);
  assert(prefResult.preferences.length === 1, `Should have 1 preference, got ${prefResult.preferences.length}`);
  const pref = prefResult.preferences[0]!;
  assert(pref.kind === 'preference', `kind should be 'preference', got '${pref.kind}'`);
  assert(pref.name === 'AppTheme', `name should be 'AppTheme', got '${pref.name}'`);
  assert(pref.type === 'string', `type should be 'string', got '${pref.type}'`);
  assert(pref.defaultValue === 'midnight', `defaultValue should be 'midnight', got '${pref.defaultValue}'`);
  assert(pref.key === 'bka_app_theme', `key should be 'bka_app_theme', got '${pref.key}'`);
  console.log('  PREFERENCE parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: PREFERENCE parse error: ${err}`);
}

// --- Test 6: ENTITY SINGLETON ---

section('Gap 6: ENTITY SINGLETON');

const singletonTest = GAP_APP + `
ENTITY AppSettings SINGLETON {
  TIMESTAMPS
  theme: string = "dark"
}
`;

try {
  const singletonResult = parse(singletonTest);
  assert(singletonResult.entities.length === 1, 'Should have 1 entity');
  const entity = singletonResult.entities[0]!;
  assert(entity.singleton === true, `singleton should be true, got ${entity.singleton}`);
  assert(entity.name === 'AppSettings', `name should be 'AppSettings', got '${entity.name}'`);
  console.log('  ENTITY SINGLETON parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: ENTITY SINGLETON parse error: ${err}`);
}

// --- Test: RULE with IF / FLAG / SEVERITY ---

section('RULE IF/FLAG/SEVERITY syntax');

const ruleIfFlagTest = `
APP test { TITLE "Test" DB test.db }

RULE ltv_cac_critical {
  IF FinancialSnapshot.ltv_cac_ratio < 2
  THEN FLAG "finance_risk"
  SEVERITY critical
  PRIORITY 10
}

RULE cash_runway_danger {
  IF FinancialSnapshot.cash_runway_months < 3
  THEN FLAG "existential_risk"
  SEVERITY critical
  PRIORITY 10
}
`;

try {
  const ruleIfResult = parse(ruleIfFlagTest);
  assert(ruleIfResult.rules.length === 2, `Should have 2 rules, got ${ruleIfResult.rules.length}`);
  const r0 = ruleIfResult.rules[0]!;
  assert(r0.name === 'ltv_cac_critical', `Rule name should be ltv_cac_critical, got ${r0.name}`);
  assert(r0.conditions.length === 1, `Should have 1 condition`);
  assert(r0.conditions[0]!.field === 'FinancialSnapshot.ltv_cac_ratio', `Condition field should use dot notation`);
  assert(r0.conditions[0]!.op === '<', `Condition op should be <`);
  assert(r0.conditions[0]!.value === 2, `Condition value should be 2`);
  assert(r0.flag === 'finance_risk', `Flag should be finance_risk, got ${r0.flag}`);
  assert(r0.severity === 'critical', `Severity should be critical, got ${r0.severity}`);
  assert(r0.priority === 10, `Priority should be 10, got ${r0.priority}`);
  const r1 = ruleIfResult.rules[1]!;
  assert(r1.flag === 'existential_risk', `Second rule flag should be existential_risk`);
  console.log('  RULE IF/FLAG/SEVERITY parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: RULE IF/FLAG/SEVERITY parse error: ${err}`);
}

// --- Test: SKILL with CONTENT and APPLIES_TO ---

section('SKILL CONTENT/APPLIES_TO syntax');

const skillContentTest = `
APP test { TITLE "Test" DB test.db }

SKILL finance_frameworks {
  DESCRIPTION "Core financial frameworks"
  DOMAIN "finance"
  CONTENT "LTV:CAC Ratio: Healthy 3:1+, Warning 2:1, Critical below 2:1."
  APPLIES_TO [finance_advisor, investment_screener]
  KEYWORDS finance, ltv, cac
  PRIORITY 8
}
`;

try {
  const skillResult = parse(skillContentTest);
  assert(skillResult.skills.length === 1, `Should have 1 skill, got ${skillResult.skills.length}`);
  const sk = skillResult.skills[0]!;
  assert(sk.name === 'finance_frameworks', `Skill name should be finance_frameworks`);
  assert(sk.domain === 'finance', `Domain should be finance`);
  assert(sk.content !== undefined, `Content should be defined`);
  assert(sk.content!.includes('LTV:CAC'), `Content should include LTV:CAC`);
  assert(sk.appliesTo !== undefined, `appliesTo should be defined`);
  assert(sk.appliesTo!.length === 2, `appliesTo should have 2 entries, got ${sk.appliesTo!.length}`);
  assert(sk.appliesTo![0] === 'finance_advisor', `First appliesTo should be finance_advisor`);
  assert(sk.priority === 8, `Priority should be 8`);
  console.log('  SKILL CONTENT/APPLIES_TO parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: SKILL CONTENT/APPLIES_TO parse error: ${err}`);
}

// --- Test: EVENT with SCHEDULE ---

section('EVENT SCHEDULE syntax');

const eventScheduleTest = `
APP test { TITLE "Test" DB test.db }

EVENT weekly_review_reminder {
  DESCRIPTION "Monday morning reminder to complete the weekly business review"
  SCHEDULE "0 9 * * 1"
  SUBSCRIBERS [leadership_advisor]
}
`;

try {
  const evSchedResult = parse(eventScheduleTest);
  assert(evSchedResult.events.length === 1, `Should have 1 event`);
  const ev = evSchedResult.events[0]!;
  assert(ev.name === 'weekly_review_reminder', `Event name should be weekly_review_reminder`);
  assert(ev.schedule === '0 9 * * 1', `Schedule should be cron string, got ${ev.schedule}`);
  assert(ev.subscribers.length === 1, `Should have 1 subscriber`);
  assert(ev.subscribers[0] === 'leadership_advisor', `Subscriber should be leadership_advisor`);
  console.log('  EVENT SCHEDULE parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: EVENT SCHEDULE parse error: ${err}`);
}

// --- LOG declaration ---

section('LOG declaration');
try {
  const logSrc = `
APP test_log { TITLE "Test" WINDOW 1200x800 DB "test.db" }
LOG {
  LEVEL   info
  TARGET  file
  PATH    "logs/app.log"
  ROTATE  "daily"
}
`;
  const logAst = parse(logSrc);
  assert(logAst.log !== undefined, 'log should be defined');
  assert(logAst.log!.level === 'info', 'level should be info');
  assert(logAst.log!.target === 'file', 'target should be file');
  assert(logAst.log!.path === 'logs/app.log', 'path should match');
  assert(logAst.log!.rotate === 'daily', 'rotate should be daily');
  console.log('  LOG declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: LOG parse error: ${err}`);
}

// --- MACRO declaration ---

section('MACRO declaration');
try {
  const macroSrc = `
APP test_macro { TITLE "Test" WINDOW 1200x800 DB "test.db" }
MACRO export_pdf {
  DESCRIPTION "Export entity to PDF"
  PARAMS {
    entity_id TEXT REQUIRED
    format    TEXT
  }
  ACTION generate_pdf
}
`;
  const macroAst = parse(macroSrc);
  assert(macroAst.macros.length === 1, 'should have 1 macro');
  assert(macroAst.macros[0].name === 'export_pdf', 'name should be export_pdf');
  assert(macroAst.macros[0].description === 'Export entity to PDF', 'description should match');
  assert(macroAst.macros[0].params.length === 2, 'should have 2 params');
  assert(macroAst.macros[0].params[0].required === true, 'first param required');
  assert(macroAst.macros[0].params[1].required === false, 'second param optional');
  assert(macroAst.macros[0].action === 'generate_pdf', 'action should match');
  console.log('  MACRO declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: MACRO parse error: ${err}`);
}

// --- MACRO_REGISTRY declaration ---

section('MACRO_REGISTRY declaration');
try {
  const registrySrc = `
APP test_registry { TITLE "Test" WINDOW 1200x800 DB "test.db" }
MACRO_REGISTRY {
  EXPOSES [export_pdf, send_report]
  INVOKES {
    novasyn_chat_save_conversation BINDING save_convo
  }
}
`;
  const registryAst = parse(registrySrc);
  assert(registryAst.macroRegistry !== undefined, 'macroRegistry should be defined');
  assert(registryAst.macroRegistry!.exposes.length === 2, 'should expose 2 macros');
  assert(registryAst.macroRegistry!.exposes[0] === 'export_pdf', 'first expose should be export_pdf');
  assert(registryAst.macroRegistry!.invokes.length === 1, 'should invoke 1 macro');
  assert(registryAst.macroRegistry!.invokes[0].macro === 'novasyn_chat_save_conversation', 'invoked macro name');
  assert(registryAst.macroRegistry!.invokes[0].as === 'save_convo', 'binding alias should match');
  console.log('  MACRO_REGISTRY declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: MACRO_REGISTRY parse error: ${err}`);
}

// --- ACTUATOR declaration ---

section('ACTUATOR declaration');
try {
  const actuatorSrc = `
APP test_actuator { TITLE "Test" WINDOW 1200x800 DB "test.db" }
ACTUATOR drive_motor {
  DESCRIPTION "Left drive motor via L298N"
  TYPE        motor
  MODEL       "L298N"
  SAFE_STATE  coast
  MAX_CURRENT 2000
  SLEW_RATE   10
  WATCHDOG    3000
}
`;
  const actuatorAst = parse(actuatorSrc);
  assert(actuatorAst.actuators.length === 1, 'should have 1 actuator');
  assert(actuatorAst.actuators[0].name === 'drive_motor', 'name should be drive_motor');
  assert(actuatorAst.actuators[0].type === 'motor', 'type should be motor');
  assert(actuatorAst.actuators[0].model === 'L298N', 'model should be L298N');
  assert(actuatorAst.actuators[0].safeState === 'coast', 'safe state should be coast');
  assert(actuatorAst.actuators[0].maxCurrent === 2000, 'maxCurrent should be 2000');
  assert(actuatorAst.actuators[0].watchdog === 3000, 'watchdog should be 3000');
  console.log('  ACTUATOR declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: ACTUATOR parse error: ${err}`);
}

// --- PLATFORM declaration ---

section('PLATFORM declaration');
try {
  const platformSrc = `
APP test_platform { TITLE "Test" WINDOW 1200x800 DB "test.db" }
PLATFORM robot_brain {
  CHIP         rpi5
  OS           "Raspberry Pi OS Lite 64-bit"
  AI_RUNTIME   "ollama"
  CROSS_TARGET "aarch64-linux-gnu"
}
`;
  const platformAst = parse(platformSrc);
  assert(platformAst.platforms.length === 1, 'should have 1 platform');
  assert(platformAst.platforms[0].name === 'robot_brain', 'name should be robot_brain');
  assert(platformAst.platforms[0].chip === 'rpi5', 'chip should be rpi5');
  assert(platformAst.platforms[0].os === 'Raspberry Pi OS Lite 64-bit', 'os should match');
  assert(platformAst.platforms[0].aiRuntime === 'ollama', 'aiRuntime should be ollama');
  assert(platformAst.platforms[0].crossTarget === 'aarch64-linux-gnu', 'crossTarget should match');
  console.log('  PLATFORM declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: PLATFORM parse error: ${err}`);
}

// --- NULLCLAW declaration ---

section('NULLCLAW declaration');
try {
  const nullclawSrc = `
APP test_nullclaw { TITLE "Test" WINDOW 1200x800 DB "test.db" }
NULLCLAW {
  PATH "~/.nullclaw/config.json"
  PROVIDERS {
    ollama "http://localhost:11434" 1
    babyai "https://novasynchris-babyai.hf.space" 2
  }
  TOOLS {
    read_temperature  sensor_temperature_read
    set_led           actuator_led_set
    speak             tts_speak
  }
  PERSONALITY "You are Nova, a helpful home assistant robot."
}
`;
  const nullclawAst = parse(nullclawSrc);
  assert(nullclawAst.nullclaw !== undefined, 'nullclaw should be defined');
  assert(nullclawAst.nullclaw!.providers.length === 2, 'should have 2 providers');
  assert(nullclawAst.nullclaw!.providers[0].name === 'ollama', 'first provider should be ollama');
  assert(nullclawAst.nullclaw!.providers[0].priority === 1, 'ollama priority should be 1');
  assert(nullclawAst.nullclaw!.tools.length === 3, 'should have 3 tools');
  assert(nullclawAst.nullclaw!.tools[0].name === 'read_temperature', 'first tool name');
  assert(nullclawAst.nullclaw!.tools[0].mapsTo === 'sensor_temperature_read', 'first tool mapsTo');
  assert(nullclawAst.nullclaw!.personality !== undefined, 'personality should be set');
  console.log('  NULLCLAW declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: NULLCLAW parse error: ${err}`);
}

// --- BRAIN_BODY declaration ---

section('BRAIN_BODY declaration');
try {
  const brainBodySrc = `
APP test_brain_body { TITLE "Test" WINDOW 1200x800 DB "test.db" }
BRAIN_BODY {
  BAUD      115200
  HEARTBEAT 1000
  WATCHDOG  3000
  ESTOP     "GPIO_24"
  COMMANDS  [PING, MOVE_SERVO, SET_MOTOR, READ_SENSORS, HB, ACK, NACK]
}
`;
  const brainBodyAst = parse(brainBodySrc);
  assert(brainBodyAst.brainBody !== undefined, 'brainBody should be defined');
  assert(brainBodyAst.brainBody!.baud === 115200, 'baud should be 115200');
  assert(brainBodyAst.brainBody!.heartbeat === 1000, 'heartbeat should be 1000');
  assert(brainBodyAst.brainBody!.watchdog === 3000, 'watchdog should be 3000');
  assert(brainBodyAst.brainBody!.estopGpio === 'GPIO_24', 'estopGpio should match');
  assert(brainBodyAst.brainBody!.commands.length === 7, 'should have 7 commands');
  console.log('  BRAIN_BODY declaration parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: BRAIN_BODY parse error: ${err}`);
}

// --- Test: TYPE alias parsing ---
section('TYPE alias parsing');
try {
  const src = `
APP test { TITLE "Test" DB test.db }

TYPE TagList    = string[]
TYPE ThemeId    = "light" | "dark" | "system"
TYPE PostStatus = "draft" | "published" | "archived"
`;
  const result = parse(src);
  assert(result.typeAliases.length === 3, 'Should have 3 type aliases');
  const tagList = result.typeAliases[0]!;
  assert(tagList.name === 'TagList', 'TagList name');
  assert(tagList.definition === 'string[]', 'TagList definition is string[]');
  const themeId = result.typeAliases[1]!;
  assert(themeId.name === 'ThemeId', 'ThemeId name');
  assert(themeId.definition.includes("'light'"), 'ThemeId has light');
  assert(themeId.definition.includes('|'), 'ThemeId is a union');
  const postStatus = result.typeAliases[2]!;
  assert(postStatus.name === 'PostStatus', 'PostStatus name');
  assert(postStatus.definition.includes("'draft'"), 'PostStatus has draft member');
  console.log('  TYPE alias parsing: TagList, ThemeId, PostStatus');
} catch (err) {
  failed++;
  console.error(`  FAIL: TYPE alias parsing error: ${err}`);
}

// --- Test: Entity field with custom TYPE ---
section('Entity field with custom TYPE alias');
try {
  const src = `
APP test { TITLE "Test" DB test.db }
TYPE TagList = string[]
ENTITY Post {
  title: string REQUIRED
  tags: TagList = []
  status: string
}
`;
  const result = parse(src);
  const post = result.entities[0]!;
  const tagsField = post.fields.find(f => f.name === 'tags')!;
  assert(tagsField !== undefined, 'tags field exists');
  assert(tagsField.customType === 'TagList', 'tags field has customType = TagList');
  assert(tagsField.type === 'json', 'tags field base type is json');
  console.log('  Entity field custom type alias: tags: TagList stored correctly');
} catch (err) {
  failed++;
  console.error(`  FAIL: Entity field custom TYPE alias error: ${err}`);
}

// --- Summary ---

console.log(`\n========================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
