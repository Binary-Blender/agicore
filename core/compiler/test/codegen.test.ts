// Agicore Compiler Test - Full codegen pipeline

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compile } from '../src/index.js';

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

// --- Test: Full compilation of home_academy.agi ---

section('Compile home_academy.agi');

const examplePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../examples/home-academy/home_academy.agi'
);
const source = readFileSync(examplePath, 'utf-8');
const { files, ast } = compile(source);

console.log(`  Generated ${files.size} files`);

// Verify file count
assert(files.size > 20, `Should generate 20+ files, got ${files.size}`);

// --- SQL ---
section('SQL migration');
const sql = files.get('src-tauri/migrations/001_initial.sql');
assert(sql !== undefined, 'Should generate SQL migration');
assert(sql!.includes('CREATE TABLE IF NOT EXISTS students'), 'Should have students table');
assert(sql!.includes('CREATE TABLE IF NOT EXISTS school_years'), 'Should have school_years table');
assert(sql!.includes('CREATE TABLE IF NOT EXISTS enrollments'), 'Should have enrollments table');
assert(sql!.includes('CREATE TABLE IF NOT EXISTS subjects'), 'Should have subjects table');
assert(sql!.includes('CREATE TABLE IF NOT EXISTS lessons'), 'Should have lessons table');
assert(sql!.includes('CREATE TABLE IF NOT EXISTS assessments'), 'Should have assessments table');
assert(sql!.includes('PRAGMA journal_mode = WAL'), 'Should set WAL mode');
assert(sql!.includes('PRAGMA foreign_keys = ON'), 'Should enable foreign keys');
assert(sql!.includes('FOREIGN KEY (student_id)'), 'Should have student FK');
assert(sql!.includes('ON DELETE CASCADE'), 'Should cascade deletes');
assert(sql!.includes("created_at TEXT DEFAULT (datetime('now'))"), 'Should have timestamps');

// SQLite parses table-level constraints only after all column defs.
// Verify FOREIGN KEY does not appear before created_at within any CREATE TABLE block.
for (const block of sql!.matchAll(/CREATE TABLE IF NOT EXISTS \w+ \(([^;]+)\);/g)) {
  const body = block[1];
  const fkIdx = body.indexOf('FOREIGN KEY');
  const tsIdx = body.indexOf('created_at');
  if (fkIdx !== -1 && tsIdx !== -1) {
    assert(fkIdx > tsIdx, `FOREIGN KEY must come after column defs (incl. timestamps) in:\n${block[0]}`);
  }
}

// --- Rust ---
section('Rust code generation');
assert(files.has('src-tauri/src/commands/student.rs'), 'Should have student.rs');
assert(files.has('src-tauri/src/commands/lesson.rs'), 'Should have lesson.rs');
assert(files.has('src-tauri/src/commands/subject.rs'), 'Should have subject.rs');
assert(files.has('src-tauri/src/commands/mod.rs'), 'Should have mod.rs');
assert(files.has('src-tauri/src/main.rs'), 'Should have main.rs');
assert(files.has('src-tauri/src/db.rs'), 'Should have db.rs');

const studentRs = files.get('src-tauri/src/commands/student.rs')!;
assert(studentRs.includes('pub struct Student'), 'Should have Student struct');
assert(studentRs.includes('#[derive(Debug, Clone, Serialize, Deserialize)]'), 'Should have derives');
assert(!studentRs.includes('specta::Type'), 'Should NOT derive specta::Type (we generate TS types ourselves)');
assert(!studentRs.includes('#[specta::specta]'), 'Should NOT decorate commands with #[specta::specta]');
assert(studentRs.includes('#[serde(rename_all = "camelCase")]'), 'Should have camelCase rename');
assert(studentRs.includes('pub struct CreateStudentInput'), 'Should have CreateInput');
assert(studentRs.includes('pub struct UpdateStudentInput'), 'Should have UpdateInput');
assert(studentRs.includes('#[tauri::command]'), 'Should have tauri::command');
assert(studentRs.includes('pub fn list_students'), 'Should have list command');
assert(studentRs.includes('pub fn create_student'), 'Should have create command');
assert(studentRs.includes('pub fn get_student'), 'Should have get command');
assert(studentRs.includes('pub fn update_student'), 'Should have update command');
assert(studentRs.includes('pub fn delete_student'), 'Should have delete command');
assert(studentRs.includes('db.lock()'), 'Should call db.lock() — Mutex<Connection> has no .get() method');
assert(!studentRs.includes('db.get()'), 'Should not call db.get() — that is the r2d2 pool API, not Mutex');
assert(/conn.*drop\(conn\);\s*\n\s*get_student\(db,/s.test(studentRs), 'create_/update_ must drop the MutexGuard before calling get_ (otherwise db is still borrowed)');

const dbRs = files.get('src-tauri/src/db.rs')!;
assert(dbRs.includes('pub fn init_db(db_path: PathBuf)'), 'init_db should accept the db path so it can be resolved via the Tauri 2 AppHandle');
assert(!dbRs.includes('tauri::api'), 'db.rs must not use the Tauri 1 tauri::api module');

const mainRs = files.get('src-tauri/src/main.rs')!;
assert(mainRs.includes('tauri::generate_handler!'), 'main.rs should register handlers');
assert(mainRs.includes('use tauri::Manager'), 'main.rs should import Manager so app.path() works');
assert(mainRs.includes('.setup('), 'main.rs should init db inside a setup hook so the AppHandle is available');
assert(mainRs.includes('app.path().app_data_dir()'), 'main.rs should use Tauri 2 path API');
assert(mainRs.includes('commands::student::list_students'), 'Should register list_students');

// --- TypeScript ---
section('TypeScript code generation');
assert(files.has('src/lib/types.ts'), 'Should have types.ts');
assert(files.has('src/lib/api.ts'), 'Should have api.ts');
assert(files.has('src/store/appStore.ts'), 'Should have appStore.ts');

const types = files.get('src/lib/types.ts')!;
assert(types.includes('export interface Student'), 'Should have Student interface');
assert(types.includes('export interface CreateStudentInput'), 'Should have CreateStudentInput');
assert(types.includes('export interface UpdateStudentInput'), 'Should have UpdateStudentInput');
assert(types.includes('dateOfBirth: string | null'), 'Should have camelCase nullable field');
assert(types.includes('createdAt: string'), 'Should have timestamp fields');

const api = files.get('src/lib/api.ts')!;
assert(api.includes("import { invoke } from '@tauri-apps/api/core'"), 'Should import invoke');
assert(api.includes('export const listStudents'), 'Should have listStudents');
assert(api.includes('export const createStudent'), 'Should have createStudent');
assert(api.includes("invoke<Student[]>('list_students')"), 'Should call correct Rust command');

const store = files.get('src/store/appStore.ts')!;
assert(store.includes("import { create } from 'zustand'"), 'Should import zustand');
assert(store.includes('students: Student[]'), 'Should have students state');
assert(store.includes('selectedStudentId: string | null'), 'Should have selection state');
assert(store.includes('loadStudents: async ()'), 'Should have load action');
assert(store.includes('addStudent: async (input)'), 'Should have add action');

// --- Components ---
section('React component generation');
assert(files.has('src/components/App.tsx'), 'Should have App.tsx');
assert(files.has('src/components/Sidebar.tsx'), 'Should have Sidebar.tsx');
assert(files.has('src/components/TitleBar.tsx'), 'Should have TitleBar.tsx');
assert(files.has('src/components/Dashboard.tsx'), 'Should have Dashboard.tsx');
assert(files.has('src/components/StudentList.tsx'), 'Should have StudentList.tsx');
assert(files.has('src/components/LessonView.tsx'), 'Should have LessonView.tsx');
assert(files.has('src/components/SubjectList.tsx'), 'Should have SubjectList.tsx');

const appTsx = files.get('src/components/App.tsx')!;
assert(appTsx.includes("import { StudentList }"), 'Should import StudentList');
assert(appTsx.includes("case 'StudentList'"), 'Should route to StudentList');
assert(appTsx.includes('<Sidebar />'), 'Should render Sidebar');
assert(appTsx.includes('<TitleBar />'), 'Should render TitleBar');

const sidebar = files.get('src/components/Sidebar.tsx')!;
assert(sidebar.includes('lucide-react'), 'Should import from lucide-react');
assert(sidebar.includes("icon: Users"), 'Should have Users icon for Students');
assert(sidebar.includes("icon: BookOpen"), 'Should have BookOpen icon for Lessons');

// --- Tauri Config ---
section('Tauri configuration');
assert(files.has('src-tauri/tauri.conf.json'), 'Should have tauri.conf.json');
assert(files.has('src-tauri/Cargo.toml'), 'Should have Cargo.toml');
assert(files.has('src-tauri/build.rs'), 'Should have build.rs');

const tauriConf = JSON.parse(files.get('src-tauri/tauri.conf.json')!);
assert(tauriConf.productName === 'NovaSyn Home Academy', 'Product name should match');
assert(tauriConf.app.windows[0].width === 1200, 'Window width should be 1200');
assert(tauriConf.app.windows[0].decorations === false, 'Should be frameless');
assert(tauriConf.app.windows[0].label === 'main', 'Window should have label "main"');
assert(tauriConf.$schema === 'https://schema.tauri.app/config/2', 'Should reference real Tauri 2 schema');

assert(files.has('src-tauri/capabilities/default.json'), 'Should generate default capability file');
const capability = JSON.parse(files.get('src-tauri/capabilities/default.json')!);
assert(capability.identifier === 'default', 'Capability identifier should be "default"');
assert(Array.isArray(capability.windows) && capability.windows.includes('main'), 'Capability should target the main window');
assert(Array.isArray(capability.permissions) && capability.permissions.includes('core:default'), 'Capability should grant core:default');

assert(files.has('src-tauri/icons/README.md'), 'Should include icons README explaining tauri icon CLI');

const cargo = files.get('src-tauri/Cargo.toml')!;
assert(cargo.includes('rusqlite'), 'Should depend on rusqlite');
assert(cargo.includes('serde'), 'Should depend on serde');
assert(!cargo.includes('specta'), 'Should NOT depend on specta — Agicore generates TS types itself, specta is dead weight');

// --- Project Files ---
section('Project files');
assert(files.has('package.json'), 'Should have package.json');
assert(files.has('tsconfig.json'), 'Should have tsconfig.json');
assert(files.has('vite.config.ts'), 'Should have vite.config.ts');
assert(files.has('tailwind.config.js'), 'Should have tailwind.config.js');
assert(files.has('index.html'), 'Should have index.html');
assert(files.has('src/main.tsx'), 'Should have main.tsx');
assert(files.has('src/styles/globals.css'), 'Should have globals.css');

const pkg = JSON.parse(files.get('package.json')!);
assert(pkg.dependencies.react !== undefined, 'Should depend on react');
assert(pkg.dependencies.zustand !== undefined, 'Should depend on zustand');
assert(pkg.dependencies['@tauri-apps/api'] !== undefined, 'Should depend on tauri api');
assert(pkg.dependencies['lucide-react'] !== undefined, 'Should depend on lucide-react');
assert(pkg.devDependencies['@tauri-apps/cli'] !== undefined, 'Should devDepend on @tauri-apps/cli so `npm run tauri build` works out of the box');
assert(pkg.scripts['tauri:dev'] === 'tauri dev', 'Should have tauri:dev script');
assert(pkg.scripts['tauri:build'] === 'tauri build', 'Should have tauri:build script');
assert(pkg.dependencies.cargo === undefined, 'Should NOT depend on phantom "cargo" npm package');
assert(pkg.type === 'module', 'package.json must declare "type": "module" so postcss/tailwind ESM configs load under Node');

const html = files.get('index.html')!;
assert(html.includes('data-theme="dark"'), 'Should set dark theme');
assert(html.includes('NovaSyn Home Academy'), 'Should have app title');

// --- Print all generated files ---
section('Generated file manifest');
const sortedFiles = [...files.keys()].sort();
for (const f of sortedFiles) {
  const size = files.get(f)!.length;
  console.log(`  ${f} (${size} bytes)`);
}

// --- Test: Invoice Approval ---
section('Compile invoice_approval.agi');

const invoicePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../examples/invoice-approval/invoice_approval.agi'
);
const invoiceSource = readFileSync(invoicePath, 'utf-8');
const invoiceResult = compile(invoiceSource);

assert(invoiceResult.files.size > 15, `Should generate 15+ files, got ${invoiceResult.files.size}`);

const invoiceSql = invoiceResult.files.get('src-tauri/migrations/001_initial.sql')!;
assert(invoiceSql.includes('CREATE TABLE IF NOT EXISTS vendors'), 'Should have vendors table');
assert(invoiceSql.includes('CREATE TABLE IF NOT EXISTS invoices'), 'Should have invoices table');
assert(invoiceSql.includes('trust_level TEXT'), 'Should have trust_level field');

console.log(`  Generated ${invoiceResult.files.size} files for invoice_approval`);

// Check that invoice_approval generates expert system runtime (it has rules)
const invoiceExpert = invoiceResult.files.get('src/engine/expert-engine.ts');
assert(invoiceExpert !== undefined, 'Invoice approval should generate expert-engine.ts');
assert(invoiceExpert!.includes('class RuleEngine'), 'Should have RuleEngine');
assert(invoiceExpert!.includes('class ExpertEngine'), 'Should have ExpertEngine');
assert(invoiceExpert!.includes("'auto_approve_small'"), 'Should have auto_approve_small rule');
assert(invoiceExpert!.includes("'director_approval_large'"), 'Should have director_approval_large rule');

// --- Test: Conversation Engine (Full Expert System) ---
section('Compile conversation_engine.agi');

const convoPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../examples/conversation-engine/conversation_engine.agi'
);
const convoSource = readFileSync(convoPath, 'utf-8');
const convoResult = compile(convoSource);

console.log(`  Generated ${convoResult.files.size} files for conversation_engine`);

assert(convoResult.files.has('src/engine/expert-engine.ts'), 'Should generate expert-engine.ts');

const engine = convoResult.files.get('src/engine/expert-engine.ts')!;

// Fact Store
assert(engine.includes('class FactStore'), 'Should have FactStore');
assert(engine.includes('export interface UserIntent'), 'Should have UserIntent fact type');
assert(engine.includes('export interface ConversationContext'), 'Should have ConversationContext fact type');
assert(engine.includes('export interface UserProfile'), 'Should have UserProfile fact type');
assert(engine.includes('export function createUserIntent'), 'Should have UserIntent factory');
assert(engine.includes('export function createConversationContext'), 'Should have ConversationContext factory');

// Score Engine
assert(engine.includes('class ScoreEngine'), 'Should have ScoreEngine');
assert(engine.includes("'engagement_score'"), 'Should have engagement_score');
assert(engine.includes("'suspicion_score'"), 'Should have suspicion_score');
assert(engine.includes("'gen_x_score'"), 'Should have gen_x_score');
assert(engine.includes("'philosophical_score'"), 'Should have philosophical_score');
assert(engine.includes('checkThresholds'), 'Should have threshold checking');

// State Machine
assert(engine.includes('class StateMachineEngine'), 'Should have StateMachineEngine');
assert(engine.includes("'ConversationPhase'"), 'Should have ConversationPhase machine');
assert(engine.includes("'greeting'"), 'Should have greeting state');
assert(engine.includes("'exploring'"), 'Should have exploring state');
assert(engine.includes("'suspicious'"), 'Should have suspicious state');

// Pattern Matcher
assert(engine.includes('class PatternMatcher'), 'Should have PatternMatcher');
assert(engine.includes("name: 'greeting'"), 'Should have greeting pattern');
assert(engine.includes("name: 'seeking_validation'"), 'Should have seeking_validation pattern');
assert(engine.includes("name: 'self_reference'"), 'Should have self_reference pattern');
assert(engine.includes("name: 'gen_x_language'"), 'Should have gen_x_language pattern');
assert(engine.includes('renderTemplate'), 'Should have template renderer');

// Module Manager
assert(engine.includes('class ModuleManager'), 'Should have ModuleManager');
assert(engine.includes("'WarGames'"), 'Should have WarGames module');
assert(engine.includes("'JediMaster'"), 'Should have JediMaster module');
assert(engine.includes('checkActivations'), 'Should have activation checker');
assert(engine.includes('activate'), 'Should have activate method');
assert(engine.includes('deactivate'), 'Should have deactivate method');

// Expert Engine (Orchestrator)
assert(engine.includes('class ExpertEngine'), 'Should have ExpertEngine orchestrator');
assert(engine.includes('readonly facts = new FactStore()'), 'Should instantiate FactStore');
assert(engine.includes('readonly scores = new ScoreEngine()'), 'Should instantiate ScoreEngine');
assert(engine.includes('readonly states = new StateMachineEngine()'), 'Should instantiate StateMachineEngine');
assert(engine.includes('readonly patterns = new PatternMatcher()'), 'Should instantiate PatternMatcher');
assert(engine.includes('process(input: string)'), 'Should have process method');
assert(engine.includes('ProcessResult'), 'Should return ProcessResult');
assert(engine.includes('auditLog'), 'Should have audit log');

// Helper Functions
assert(engine.includes('function renderTemplate'), 'Should have renderTemplate helper');
assert(engine.includes('function evaluateCondition'), 'Should have evaluateCondition helper');
assert(engine.includes('function compareValues'), 'Should have compareValues helper');
assert(engine.includes('function resolveField'), 'Should have resolveField helper');

// Print the expert engine file manifest
section('Expert engine file size');
console.log(`  expert-engine.ts: ${engine.length} bytes (${engine.split('\n').length} lines)`);

// --- Test: AI_SERVICE generation ---
section('AI_SERVICE generation');

assert(files.has('src-tauri/src/ai_service.rs'), 'Should emit ai_service.rs when AI_SERVICE is declared');

const aiRs = files.get('src-tauri/src/ai_service.rs')!;
assert(aiRs.includes('pub async fn send_chat'), 'Should expose send_chat command');
assert(aiRs.includes('#[tauri::command]'), 'send_chat should be a Tauri command');
assert(aiRs.includes('async fn call_anthropic'), 'Should emit call_anthropic');
assert(aiRs.includes('async fn call_openai'), 'Should emit call_openai');
assert(aiRs.includes('async fn call_google'), 'Should emit call_google');
assert(aiRs.includes('async fn call_xai'), 'Should emit call_xai');

// Key management
assert(aiRs.includes('pub fn get_api_keys'), 'Should expose get_api_keys');
assert(aiRs.includes('pub fn set_api_key'), 'Should expose set_api_key');
assert(aiRs.includes('pub fn load_api_keys'), 'Should expose load_api_keys');
assert(aiRs.includes('pub type ApiKeyStore'), 'Should declare ApiKeyStore type');
assert(aiRs.includes('std::env::var("APPDATA")'), 'Should resolve %APPDATA% via env::var');
assert(aiRs.includes('std::env::var("HOME")'), 'Should fall back to HOME on non-Windows');

// Streaming structs
assert(aiRs.includes('pub struct ChatRequest'), 'Should declare ChatRequest');
assert(aiRs.includes('pub struct ChatResponse'), 'Should declare ChatResponse');
assert(aiRs.includes('pub struct StreamDelta'), 'Should declare StreamDelta');
assert(aiRs.includes('chat-stream'), 'Should emit on the chat-stream channel');

// Anthropic-specific
assert(aiRs.includes('anthropic-version'), 'Anthropic call should include anthropic-version header');
assert(aiRs.includes('"https://api.anthropic.com/v1/messages"'), 'Anthropic should hit /v1/messages');
assert(aiRs.includes('content_block_delta'), 'Anthropic stream should handle content_block_delta');

// Google must use TRUE SSE
assert(aiRs.includes(':streamGenerateContent?alt=sse'), 'Google must use streamGenerateContent?alt=sse for true SSE');
assert(!aiRs.includes(':generateContent?key='), 'Google must NOT use the non-streaming :generateContent endpoint');

// OpenAI reasoning-model parameter switch
assert(aiRs.includes('is_openai_reasoning_model'), 'Should include reasoning-model detector');
assert(aiRs.includes('max_completion_tokens'), 'Reasoning models must use max_completion_tokens');
assert(aiRs.includes('is_openai_gpt5'), 'Should include GPT-5 detector');
assert(/o1.*o3.*o4|o\d/.test(aiRs), 'Reasoning detector should match o1/o3/o4');

// xAI on OpenAI-compatible endpoint
assert(aiRs.includes('"https://api.x.ai/v1/chat/completions"'), 'xAI should hit /v1/chat/completions');

// Partial-content recovery (matches the 3G TS impl)
assert(aiRs.includes('full_content.is_empty()'), 'Streams should fall back to partial content rather than erroring out');

// Provider routing
assert(aiRs.includes('fn provider_from_model'), 'Should route by model prefix');
assert(aiRs.includes('"claude"'), 'Should route claude-* models to anthropic');
assert(aiRs.includes('"gemini"'), 'Should route gemini-* models to google');
assert(aiRs.includes('"grok"'), 'Should route grok-* models to xai');

// Model discovery
assert(aiRs.includes('pub async fn discover_models'), 'Should expose discover_models command');
assert(aiRs.includes('force_refresh: bool'), 'discover_models takes force_refresh flag');
assert(aiRs.includes('pub struct ModelInfo'), 'Should declare ModelInfo struct');
assert(aiRs.includes('pub struct ModelCapabilities'), 'Should declare ModelCapabilities struct');
assert(aiRs.includes('model-cache.json'), 'Should cache to model-cache.json');
assert(aiRs.includes('CACHE_TTL_SECS'), 'Should use a TTL constant for cache freshness');
assert(aiRs.includes('discover_anthropic_models'), 'Should query Anthropic /v1/models');
assert(aiRs.includes('discover_openai_models'), 'Should query OpenAI /v1/models');
assert(aiRs.includes('discover_google_models'), 'Should query Google /v1beta/models');
assert(aiRs.includes('discover_xai_models'), 'Should query xAI /v1/models');

// No regex crate dep — we have a hand-rolled date detector
assert(!aiRs.includes('regex_lite'), 'Must not depend on regex_lite (not in user Cargo.toml)');
assert(!aiRs.includes('regex::Regex'), 'Must not depend on regex (not in user Cargo.toml)');
assert(aiRs.includes('fn has_date_suffix'), 'Should provide hand-rolled has_date_suffix helper');

// Generated header marker
assert(aiRs.includes('Generated by Agicore'), 'Should mark file as generated');

// Print file size for visibility
console.log(`  ai_service.rs: ${aiRs.length} bytes (${aiRs.split('\n').length} lines)`);

// AST shape
assert(ast.aiService !== undefined, 'AST should expose aiService when declared');
assert(ast.aiService!.providers.includes('anthropic'), 'AI service should list anthropic provider');

// Negative test: an .agi without AI_SERVICE should NOT emit ai_service.rs
section('AI_SERVICE absence');
const noAiSource = `APP no_ai {
  TITLE   "NoAI"
  WINDOW  800x600 frameless
  DB      noai.db
  PORT    5180
  THEME   dark
}

ENTITY Note {
  text: string REQUIRED
  TIMESTAMPS
}
`;
const noAiResult = compile(noAiSource);
assert(!noAiResult.files.has('src-tauri/src/ai_service.rs'), 'Should not emit ai_service.rs when AI_SERVICE is absent');
assert(noAiResult.ast.aiService === undefined, 'AST aiService should be undefined when absent');

// --- Test: AI_SERVICE → store wiring + APP CURRENT entity slots ---
//
// Both features address the same underlying bug shape: state that has to
// cross component boundaries (model picker ↔ chat composer; sidebar session
// list ↔ main pane) ends up in local React state and silently desyncs.
// Codegen-driven store slots make the right-shaped store the path of least
// resistance.
section('AI_SERVICE → store + CURRENT entity');
const mini = `
APP mini {
  TITLE "Mini"
  WINDOW 800x600 frameless
  DB mini.db
  PORT 5174
  THEME dark
  CURRENT Session
}
ENTITY Session {
  name: string REQUIRED
  TIMESTAMPS
}
AI_SERVICE {
  PROVIDERS anthropic, openai
  KEYS_FILE "%APPDATA%/test/keys.json"
  DEFAULT anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514"
    openai "gpt-4o"
  }
}
`;
const miniRes = compile(mini);
const miniStore = miniRes.files.get('src/store/appStore.ts')!;
assert(miniStore !== undefined, 'mini fixture should generate appStore.ts');
assert(miniRes.ast.app.current?.includes('Session') === true, 'AST app.current should contain Session');
assert(miniStore.includes("selectedModel: 'claude-sonnet-4-20250514'"), 'store seeds selectedModel from AI_SERVICE default');
assert(miniStore.includes('setSelectedModel: (model: string) => void'), 'store types setSelectedModel');
assert(miniStore.includes('setSelectedModel: (model) => set({ selectedModel: model })'), 'store implements setSelectedModel');
assert(miniStore.includes('currentSessionId: string | null'), 'CURRENT Session adds currentSessionId to store interface');
assert(miniStore.includes('setCurrentSessionId: (id: string | null) => void'), 'CURRENT Session adds setter type');
assert(miniStore.includes('currentSessionId: null'), 'currentSessionId initializes to null');
assert(miniStore.includes('setCurrentSessionId: (id) => set({ currentSessionId: id })'), 'setter implementation');

// Negative: when AI_SERVICE is absent, store must NOT contain selectedModel.
// Otherwise consumers would import a non-existent slot from a "lite" build.
const noAiStore = noAiResult.files.get('src/store/appStore.ts')!;
assert(!noAiStore.includes('selectedModel'), 'store should NOT mention selectedModel when AI_SERVICE is absent');
assert(!noAiStore.includes('setSelectedModel'), 'store should NOT mention setSelectedModel when AI_SERVICE is absent');

// Negative: when CURRENT is absent, no current<Entity>Id slot is emitted.
assert(!noAiStore.includes('currentNoteId'), 'store should NOT contain currentNoteId when APP CURRENT is absent');

// Multi-entity CURRENT: comma-separated list yields one slot per entity.
const multiCurrent = `
APP multi {
  TITLE "Multi"
  WINDOW 800x600 frameless
  DB multi.db
  PORT 5175
  THEME dark
  CURRENT Session, User
}
ENTITY Session { name: string REQUIRED  TIMESTAMPS }
ENTITY User { email: string REQUIRED  TIMESTAMPS }
`;
const multiRes = compile(multiCurrent);
const multiStore = multiRes.files.get('src/store/appStore.ts')!;
assert(multiRes.ast.app.current?.length === 2, 'AST should record both CURRENT entity names');
assert(multiStore.includes('currentSessionId: string | null'), 'multi: currentSessionId emitted');
assert(multiStore.includes('currentUserId: string | null'), 'multi: currentUserId emitted');
assert(multiStore.includes('setCurrentSessionId: (id) => set({ currentSessionId: id })'), 'multi: Session setter impl');
assert(multiStore.includes('setCurrentUserId: (id) => set({ currentUserId: id })'), 'multi: User setter impl');

// --- Test: Content Pipeline (Orchestration) ---
section('Compile content_pipeline.agi');

const pipelinePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../examples/content-pipeline/content_pipeline.agi'
);
const pipelineSource = readFileSync(pipelinePath, 'utf-8');
const pipelineResult = compile(pipelineSource);

console.log(`  Generated ${pipelineResult.files.size} files for content_pipeline`);

// Should have orchestration engine
assert(pipelineResult.files.has('src/engine/orchestration-engine.ts'), 'Should generate orchestration-engine.ts');

const orch = pipelineResult.files.get('src/engine/orchestration-engine.ts')!;

// SPC Controller
assert(orch.includes('class SPCController'), 'Should have SPCController');
assert(orch.includes("'content_quality'"), 'Should have content_quality config');
assert(orch.includes("'image_quality'"), 'Should have image_quality config');
assert(orch.includes('shouldRequireQC'), 'Should have shouldRequireQC method');
assert(orch.includes('recordResult'), 'Should have recordResult method');
assert(orch.includes('calculateCpk'), 'Should have Cpk calculation');
assert(orch.includes('getCostSavings'), 'Should have cost savings calculator');
assert(orch.includes('youngThreshold: 30'), 'Content QC young threshold should be 30');
assert(orch.includes('matureSampleRate: 0.05'), 'Content QC mature sample should be 0.05');
assert(orch.includes('youngThreshold: 50'), 'Image QC young threshold should be 50');

// Pipeline Engine
assert(orch.includes('class PipelineEngine'), 'Should have PipelineEngine');
assert(orch.includes("'ArticleFactory'"), 'Should have ArticleFactory pipeline');
assert(orch.includes("'ImageFactory'"), 'Should have ImageFactory pipeline');
assert(orch.includes('Promise.allSettled'), 'Should use Promise.allSettled for parallel execution');
assert(orch.includes('paused_for_qc'), 'Should support QC pause');
assert(orch.includes('async run('), 'Should have run method');
assert(orch.includes('async resume('), 'Should have resume method');
assert(orch.includes('registerExecutor'), 'Should have executor registration');
assert(orch.includes('executeRows'), 'Should have BFS row executor');
assert(orch.includes('awaiting_qc'), 'Should have awaiting_qc status');

// Connections
assert(orch.includes('fromModule'), 'Should have connection from module');
assert(orch.includes('toModule'), 'Should have connection to module');
assert(orch.includes("'topic_research'"), 'Should have topic_research module');
assert(orch.includes("'content_brief'"), 'Should have content_brief module');

// Print file size
section('Orchestration engine file size');
console.log(`  orchestration-engine.ts: ${orch.length} bytes (${orch.split('\n').length} lines)`);

// --- Summary ---
console.log(`\n========================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
