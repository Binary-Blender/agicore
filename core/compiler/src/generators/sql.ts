// SQL Migration Generator
// Generates SQLite migration files from ENTITY declarations

import type { AgiFile, EntityDecl, FieldDef, AgiType, LiteralValue } from '@agicore/parser';
import { toTableName, toForeignKey, toSnakeCase } from '../naming.js';

/**
 * Format a SEED literal value as a SQLite SQL literal.
 *  - strings: single-quoted; embedded `'` doubled to `''` (SQLite escape).
 *  - bools:   1 / 0 (SQLite has no native bool — INTEGER, same as bool fields).
 *  - numbers: bare literal.
 */
function sqlSeedLiteral(val: LiteralValue): string {
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'boolean') return val ? '1' : '0';
  return String(val);
}

function sqlType(agiType: AgiType): string {
  switch (agiType) {
    case 'string':   return 'TEXT';
    case 'number':   return 'INTEGER';
    case 'float':    return 'REAL';
    case 'bool':     return 'INTEGER';
    case 'date':     return 'TEXT';
    case 'datetime': return 'TEXT';
    case 'json':     return 'TEXT';
    case 'id':       return 'TEXT';
  }
}

function sqlDefault(field: FieldDef): string {
  if (field.defaultValue === undefined) return '';
  const val = field.defaultValue;
  if (typeof val === 'boolean') return ` DEFAULT ${val ? 1 : 0}`;
  if (typeof val === 'number') return ` DEFAULT ${val}`;
  return ` DEFAULT '${val}'`;
}

function generateEntityTable(entity: EntityDecl, allEntities: EntityDecl[]): string {
  const tableName = toTableName(entity.name);
  const lines: string[] = [];

  lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);

  // SQLite requires all columns first, then all table-level constraints
  // (PRIMARY KEY at the column level is fine; FOREIGN KEY must come last).
  const columns: string[] = [];
  const constraints: string[] = [];

  columns.push('  id TEXT PRIMARY KEY');

  // Fields
  for (const field of entity.fields) {
    const colName = toSnakeCase(field.name);
    let col = `  ${colName} ${sqlType(field.type)}`;
    if (field.modifiers.includes('REQUIRED')) col += ' NOT NULL';
    if (field.modifiers.includes('UNIQUE')) col += ' UNIQUE';
    col += sqlDefault(field);
    columns.push(col);
  }

  // Foreign-key columns + their table-level constraints
  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      const fkCol = toForeignKey(rel.target);
      const targetTable = toTableName(rel.target);
      columns.push(`  ${fkCol} TEXT NOT NULL`);
      constraints.push(`  FOREIGN KEY (${fkCol}) REFERENCES ${targetTable}(id) ON DELETE CASCADE`);
    }
  }

  // Timestamps
  if (entity.timestamps) {
    columns.push("  created_at TEXT DEFAULT (datetime('now'))");
    columns.push("  updated_at TEXT DEFAULT (datetime('now'))");
  }

  lines.push([...columns, ...constraints].join(',\n'));
  lines.push(');');

  // Indexes
  for (const field of entity.fields) {
    if (field.modifiers.includes('INDEX')) {
      const colName = toSnakeCase(field.name);
      lines.push(`\nCREATE INDEX IF NOT EXISTS idx_${tableName}_${colName} ON ${tableName}(${colName});`);
    }
  }

  // Foreign key indexes
  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      const fkCol = toForeignKey(rel.target);
      lines.push(`\nCREATE INDEX IF NOT EXISTS idx_${tableName}_${fkCol} ON ${tableName}(${fkCol});`);
    }
  }

  return lines.join('\n');
}

export function generateSql(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  // Generate pragmas
  const pragmas = [
    '-- Agicore Generated Migration',
    `-- App: ${ast.app.name}`,
    `-- Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
    'PRAGMA journal_mode = WAL;',
    'PRAGMA foreign_keys = ON;',
    '',
  ].join('\n');

  // Generate all tables in one migration file
  const tables = ast.entities.map(e => generateEntityTable(e, ast.entities));
  let migration = pragmas + tables.join('\n\n');

  // Append SEED-driven INSERT OR IGNORE statements AFTER every CREATE TABLE /
  // CREATE INDEX, so the migration runs schema-first then seed-second.
  // `execute_batch`-on-every-boot + INSERT OR IGNORE => idempotent: the row
  // is created on first run and silently no-ops thereafter.
  const seedLines: string[] = [];
  for (const entity of ast.entities) {
    if (!entity.seeds || entity.seeds.length === 0) continue;
    const table = toTableName(entity.name);
    for (const seed of entity.seeds) {
      // Preserve insertion order so generated SQL is stable across runs.
      const cols = Array.from(seed.fields.keys());
      const vals = cols.map(c => sqlSeedLiteral(seed.fields.get(c)!));
      // Auto-fill timestamps with datetime('now') when the entity has
      // TIMESTAMPS and the SEED block didn't specify them explicitly.
      if (entity.timestamps) {
        if (!seed.fields.has('created_at')) { cols.push('created_at'); vals.push("datetime('now')"); }
        if (!seed.fields.has('updated_at')) { cols.push('updated_at'); vals.push("datetime('now')"); }
      }
      seedLines.push(
        `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`
      );
    }
  }
  if (seedLines.length > 0) {
    migration += '\n\n-- SEED: idempotent INSERT OR IGNORE rows from ENTITY SEED blocks\n';
    migration += seedLines.join('\n');
  }

  files.set('src-tauri/migrations/001_initial.sql', migration);

  return files;
}
