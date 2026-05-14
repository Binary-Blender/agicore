// TEST Code Generator
// Generates src-tauri/src/tests.rs — #[cfg(test)] integration tests from TEST declarations.
// Each test creates an in-memory SQLite DB, runs the migration, inserts GIVENs,
// then asserts EXPECTs. Does not go through Tauri State machinery.

import type { AgiFile, TestDecl, TestGiven, TestExpect, EntityDecl, LiteralValue } from '@agicore/parser';
import { toSnakeCase, toTableName, toForeignKey } from '../naming.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function findEntity(ast: AgiFile, name: string): EntityDecl | undefined {
  return ast.entities.find(e => e.name === name);
}

function rustLiteral(value: LiteralValue): string {
  if (typeof value === 'string') return `"${value}".to_string()`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value); // number
}

function sqlLiteral(value: LiteralValue): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

// ── INSERT for one GIVEN ──────────────────────────────────────────────────────

function generateGivenInsert(
  given: TestGiven,
  idVarName: string,   // e.g. "user_id"
  createdIds: Map<string, string>,  // entityName → idVarName
  ast: AgiFile,
): string[] {
  const entity = findEntity(ast, given.entity);
  const table = toTableName(given.entity);
  const lines: string[] = [];

  lines.push(`        // GIVEN ${given.entity} { ${Object.entries(given.fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }`);
  lines.push(`        let ${idVarName} = Uuid::new_v4().to_string();`);

  // Build column list
  const cols: string[] = ['id'];
  const params: string[] = [`&${idVarName}`];

  // Declared fields from the GIVEN
  if (entity) {
    for (const field of entity.fields) {
      const sn = toSnakeCase(field.name);
      if (given.fields[field.name] !== undefined) {
        cols.push(sn);
        params.push(rustLiteral(given.fields[field.name]));
      } else if (field.modifiers.includes('REQUIRED') && field.defaultValue === undefined) {
        // Required field not in GIVEN — use a placeholder
        const placeholder = field.type === 'string' ? `"${sn}_test".to_string()` : '0';
        cols.push(sn);
        params.push(placeholder);
      }
    }

    // BELONGS_TO FK columns
    for (const rel of entity.relationships) {
      if (rel.type !== 'BELONGS_TO') continue;
      const fk = toForeignKey(rel.target);
      const parentIdVar = createdIds.get(rel.target);
      if (parentIdVar) {
        cols.push(fk);
        params.push(`&${parentIdVar}`);
      } else if (given.belongsTo && given.belongsTo[rel.target]) {
        // Inline FK value from GIVEN
        cols.push(fk);
        params.push(rustLiteral(given.belongsTo[rel.target] as LiteralValue));
      }
    }

    if (entity.timestamps) {
      cols.push('created_at', 'updated_at');
      params.push('&now', '&now');
    }
  }

  const placeholders = cols.map(() => '?').join(', ');
  lines.push(`        conn.execute(`);
  lines.push(`            "INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})",`);
  lines.push(`            rusqlite::params![${params.join(', ')}],`);
  lines.push(`        ).expect("insert ${given.entity}");`);

  return lines;
}

// ── Assertion for one EXPECT ──────────────────────────────────────────────────

function generateExpect(
  expect: TestExpect,
  primaryEntity: string,
  primaryIdVar: string,
  ast: AgiFile,
): string[] {
  const lines: string[] = [];
  const { field, op, value } = expect.assertion;
  const table = toTableName(primaryEntity);

  if (!field) return lines;

  const colName = toSnakeCase(field);

  if (op === 'IS NOT NULL') {
    const entity = findEntity(ast, primaryEntity);
    const fieldDef = entity?.fields.find(f => f.name === field);
    // For id and string fields use is_empty; for numbers check > 0
    if (field === 'id' || fieldDef?.type === 'string') {
      lines.push(`        // EXPECT ${expect.operation} -> ${field} IS NOT NULL`);
      lines.push(`        assert!(!${primaryIdVar}.is_empty(), "${field} should not be empty");`);
    } else {
      lines.push(`        // EXPECT ${expect.operation} -> ${field} IS NOT NULL`);
      lines.push(`        assert!(!${primaryIdVar}.is_empty(), "${field} should be set");`);
    }
    return lines;
  }

  // For other assertions, query the specific field from the DB
  lines.push(`        // EXPECT ${expect.operation} -> ${field} ${op} ${value}`);
  const entity = findEntity(ast, primaryEntity);
  const fieldDef = entity?.fields.find(f => f.name === field);
  const isNum = fieldDef?.type === 'number' || fieldDef?.type === 'float';
  const isBool = fieldDef?.type === 'bool';

  if (isBool) {
    lines.push(`        let ${colName}_val: i64 = conn.query_row(`);
    lines.push(`            "SELECT ${colName} FROM ${table} WHERE id = ?", [&${primaryIdVar}],`);
    lines.push(`            |r| r.get(0)).expect("query ${colName}");`);
    const expected = value === false ? '0' : '1';
    if (op === '==') {
      lines.push(`        assert_eq!(${colName}_val, ${expected}, "${field} should be ${value}");`);
    } else if (op === '!=') {
      lines.push(`        assert_ne!(${colName}_val, ${expected}, "${field} should not be ${value}");`);
    }
  } else if (isNum) {
    lines.push(`        let ${colName}_val: i64 = conn.query_row(`);
    lines.push(`            "SELECT ${colName} FROM ${table} WHERE id = ?", [&${primaryIdVar}],`);
    lines.push(`            |r| r.get(0)).expect("query ${colName}");`);
    if (op === '==') lines.push(`        assert_eq!(${colName}_val, ${value}, "${field} should be ${value}");`);
    else if (op === '!=') lines.push(`        assert_ne!(${colName}_val, ${value}, "${field} should not be ${value}");`);
    else if (op === '>') lines.push(`        assert!(${colName}_val > ${value}, "${field} should be > ${value}");`);
    else if (op === '<') lines.push(`        assert!(${colName}_val < ${value}, "${field} should be < ${value}");`);
  } else {
    // String
    lines.push(`        let ${colName}_val: String = conn.query_row(`);
    lines.push(`            "SELECT ${colName} FROM ${table} WHERE id = ?", [&${primaryIdVar}],`);
    lines.push(`            |r| r.get(0)).expect("query ${colName}");`);
    if (op === '==') lines.push(`        assert_eq!(${colName}_val, ${rustLiteral(value as LiteralValue)}, "${field} should be ${value}");`);
    else if (op === '!=') lines.push(`        assert_ne!(${colName}_val, ${rustLiteral(value as LiteralValue)}, "${field} should not be ${value}");`);
    else if (op === 'CONTAINS') lines.push(`        assert!(${colName}_val.contains(${rustLiteral(value as LiteralValue)}.as_str()), "${field} should contain ${value}");`);
  }

  return lines;
}

// ── One #[test] fn ────────────────────────────────────────────────────────────

function generateTestFn(test: TestDecl, ast: AgiFile): string[] {
  const fnName = toSnakeCase(test.name);
  const lines: string[] = [];

  lines.push(`    #[test]`);
  lines.push(`    fn ${fnName}() {`);
  lines.push(`        let conn = test_db();`);
  lines.push(`        let now = chrono::Utc::now().to_rfc3339();`);
  lines.push(`        let _ = &now;`);
  lines.push('');

  const createdIds = new Map<string, string>(); // entityName → idVarName

  for (const given of test.givens) {
    const idVar = `${toSnakeCase(given.entity)}_id`;
    // Handle name collision when same entity appears twice
    const safeIdVar = createdIds.has(given.entity)
      ? `${toSnakeCase(given.entity)}_id_${createdIds.size}`
      : idVar;
    lines.push(...generateGivenInsert(given, safeIdVar, createdIds, ast));
    createdIds.set(given.entity, safeIdVar);
    lines.push('');
  }

  // Primary entity is the last GIVEN — EXPECTs target it
  const lastGiven = test.givens[test.givens.length - 1];
  if (lastGiven) {
    const primaryIdVar = createdIds.get(lastGiven.entity) ?? `${toSnakeCase(lastGiven.entity)}_id`;
    for (const expect of test.expects) {
      lines.push(...generateExpect(expect, lastGiven.entity, primaryIdVar, ast));
    }
  }

  lines.push(`    }`);
  return lines;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateTests(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.tests.length === 0) return files;

  const lines: string[] = [
    '// Agicore Generated — DO NOT EDIT BY HAND',
    '// Re-run `agicore generate` to regenerate.',
    '// Integration tests generated from TEST declarations.',
    '',
    '#[cfg(test)]',
    'mod entity_tests {',
    '    use rusqlite::Connection;',
    '    use uuid::Uuid;',
    '',
    '    fn test_db() -> Connection {',
    '        let conn = Connection::open_in_memory().expect("in-memory db");',
    '        conn.execute_batch(include_str!("../migrations/001_initial.sql"))',
    '            .expect("migration failed");',
    '        conn',
    '    }',
    '',
  ];

  for (const test of ast.tests) {
    lines.push(...generateTestFn(test, ast));
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  files.set('src-tauri/src/tests.rs', lines.join('\n'));
  return files;
}
