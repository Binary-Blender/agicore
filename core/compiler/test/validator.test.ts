// Agicore Static Validator Tests

import { validate } from '../src/validators/validate.js';
import { parse } from '@agicore/parser';
import type { ValidationResult } from '../src/validators/validate.js';

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

function errors(results: ValidationResult[]): ValidationResult[] {
  return results.filter((r) => r.severity === 'error');
}

function warnings(results: ValidationResult[]): ValidationResult[] {
  return results.filter((r) => r.severity === 'warning');
}

function hasError(results: ValidationResult[], substr: string): boolean {
  return errors(results).some((r) => r.message.includes(substr));
}

function hasWarning(results: ValidationResult[], substr: string): boolean {
  return warnings(results).some((r) => r.message.includes(substr));
}

// ─── Clean file: no diagnostics ───────────────────────────────────────────────

section('Clean file emits no diagnostics');
{
  const src = `
APP MyApp { TITLE "Test App" DB test.db }
ENTITY Project {
  name: string REQUIRED
  TIMESTAMPS
}
VIEW ProjectList {
  LAYOUT table
  ENTITY Project
  FIELDS name
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(results.length === 0, `Clean file should have 0 diagnostics, got ${results.length}: ${results.map(r => r.message).join(', ')}`);
}

// ─── Duplicate names ──────────────────────────────────────────────────────────

section('Duplicate entity name');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project { name: string }
ENTITY Project { title: string }
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "Duplicate entity name 'Project'"), 'Should report duplicate entity');
}

section('Duplicate view name');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project { name: string TIMESTAMPS }
VIEW ProjectList { ENTITY Project LAYOUT table FIELDS name }
VIEW ProjectList { ENTITY Project LAYOUT table FIELDS name }
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "Duplicate view name 'ProjectList'"), 'Should report duplicate view');
}

// ─── Undefined entity references ─────────────────────────────────────────────

section('BELONGS_TO references undefined entity');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Task {
  title: string
  BELONGS_TO Ghost
  TIMESTAMPS
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "BELONGS_TO references undefined entity 'Ghost'"), 'Should report undefined BELONGS_TO target');
}

section('HAS_MANY references undefined entity');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project {
  name: string
  HAS_MANY Ghost
  TIMESTAMPS
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "HAS_MANY references undefined entity 'Ghost'"), 'Should report undefined HAS_MANY target');
}

section('BELONGS_TO valid entity is OK');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project { name: string TIMESTAMPS }
ENTITY Task {
  title: string
  BELONGS_TO Project
  TIMESTAMPS
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasError(results, 'BELONGS_TO'), 'Valid BELONGS_TO should produce no error');
}

section('VIEW ENTITY references undefined entity');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
VIEW GhostList {
  LAYOUT table
  ENTITY Ghost
  FIELDS name
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "ENTITY 'Ghost' is not declared"), 'Should report undefined view entity');
}

section('APP CURRENT references undefined entity');
{
  const src = `
APP MyApp {
  TITLE "T"
  DB t.db
  CURRENT Ghost
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "APP CURRENT 'Ghost'"), 'Should report undefined APP CURRENT entity');
}

section('APP CURRENT valid entity is OK');
{
  const src = `
APP MyApp {
  TITLE "T"
  DB t.db
  CURRENT Project
}
ENTITY Project { name: string TIMESTAMPS }
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasError(results, 'APP CURRENT'), 'Valid APP CURRENT should produce no error');
}

// ─── Layout validation ────────────────────────────────────────────────────────

section('table layout without ENTITY is an error');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
VIEW NakedTable {
  LAYOUT table
  FIELDS name
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "layout 'table' requires an ENTITY"), 'Should require ENTITY for table layout');
}

section('cards layout without ENTITY is an error');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
VIEW NakedCards {
  LAYOUT cards
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "layout 'cards' requires an ENTITY"), 'Should require ENTITY for cards layout');
}

section('custom layout without ENTITY is OK');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
VIEW Dashboard {
  LAYOUT custom
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasError(results, 'layout'), 'Custom layout should not require ENTITY');
}

section('settings layout without ENTITY is OK');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
VIEW SettingsView {
  LAYOUT settings
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasError(results, 'layout'), 'Settings layout should not require ENTITY');
}

// ─── VIEW FIELDS warnings ─────────────────────────────────────────────────────

section('VIEW FIELDS unknown field emits warning');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project {
  name: string REQUIRED
  TIMESTAMPS
}
VIEW ProjectList {
  LAYOUT table
  ENTITY Project
  FIELDS name, ghost_field
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasWarning(results, "FIELD 'ghost_field' is not declared"), 'Should warn about unknown view field');
  assert(!hasError(results, 'ghost_field'), 'Unknown view field should be a warning, not an error');
}

section('VIEW FIELDS all valid produces no warning');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project {
  name: string REQUIRED
  description: string
  TIMESTAMPS
}
VIEW ProjectList {
  LAYOUT table
  ENTITY Project
  FIELDS name, description
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasWarning(results, 'FIELD'), 'All-valid VIEW FIELDS should produce no warning');
}

// ─── SEED field warnings ──────────────────────────────────────────────────────

section('SEED with unknown field emits warning');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project {
  name: string REQUIRED
  TIMESTAMPS
  SEED {
    id: "seed-1"
    name: "Default Project"
    ghost_field: "oops"
  }
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasWarning(results, "SEED field 'ghost_field' is not declared"), 'Should warn about unknown SEED field');
}

section('SEED with valid fields and builtins is OK');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
ENTITY Project {
  name: string REQUIRED
  TIMESTAMPS
  SEED {
    id: "seed-1"
    name: "Default Project"
    created_at: "2026-01-01"
  }
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasWarning(results, 'SEED field'), 'id/name/created_at are all valid — no SEED warning expected');
}

// ─── AI_SERVICE DEFAULT provider ──────────────────────────────────────────────

section('AI_SERVICE DEFAULT not in PROVIDERS emits error');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
AI_SERVICE {
  PROVIDERS openai, anthropic
  DEFAULT ghost_provider
  KEYS_FILE ".env"
  MODELS {
    openai "gpt-4o"
    anthropic "claude-opus-4-5" DEFAULT
  }
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(hasError(results, "DEFAULT provider 'ghost_provider'"), 'Should error when DEFAULT provider not in PROVIDERS');
}

section('AI_SERVICE DEFAULT in PROVIDERS is OK');
{
  const src = `
APP MyApp { TITLE "T" DB t.db }
AI_SERVICE {
  PROVIDERS openai, anthropic
  DEFAULT anthropic
  KEYS_FILE ".env"
  MODELS {
    openai "gpt-4o"
    anthropic "claude-opus-4-5" DEFAULT
  }
}
`;
  const ast = parse(src);
  const results = validate(ast);
  assert(!hasError(results, 'DEFAULT provider'), 'Valid DEFAULT provider should produce no error');
}

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n=== Validator Tests: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
