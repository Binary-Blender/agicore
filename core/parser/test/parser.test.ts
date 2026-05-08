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
assert(aiResult.aiService!.models[0]!.model === 'claude-sonnet-4-20250514', 'First model should be claude');

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

// --- Summary ---

console.log(`\n========================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
