// SQL Migration Generator
// Generates SQLite (desktop) or PostgreSQL (web target) migration files from ENTITY declarations.

import type { AgiFile, EntityDecl, FieldDef, AgiType, LiteralValue } from '@agicore/parser';
import { toTableName, toForeignKey, toSnakeCase } from '../naming.js';
import { telemetrySql } from './telemetry.js';
import { workflowCheckpointsSql } from './workflow.js';

function isWebTarget(ast: AgiFile): boolean {
  return ast.target?.runtime === 'axum';
}

/**
 * Format a SEED literal value as a SQL literal.
 *  - strings: single-quoted; embedded `'` doubled to `''`.
 *  - bools:   true/false (PostgreSQL) or 1/0 (SQLite).
 *  - numbers: bare literal.
 */
function sqlSeedLiteral(val: LiteralValue, pg: boolean): string {
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'boolean') return pg ? (val ? 'true' : 'false') : (val ? '1' : '0');
  return String(val);
}

function sqlType(agiType: AgiType, pg: boolean): string {
  if (pg) {
    switch (agiType) {
      case 'string':   return 'TEXT';
      case 'number':   return 'INTEGER';
      case 'float':    return 'DOUBLE PRECISION';
      case 'bool':     return 'BOOLEAN';
      case 'date':     return 'DATE';
      case 'datetime': return 'TIMESTAMPTZ';
      case 'json':     return 'JSONB';
      case 'id':       return 'UUID';
    }
  }
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

function sqlDefault(field: FieldDef, pg: boolean): string {
  if (field.defaultValue === undefined) return '';
  const val = field.defaultValue;
  if (typeof val === 'boolean') return pg ? ` DEFAULT ${val}` : ` DEFAULT ${val ? 1 : 0}`;
  if (typeof val === 'number') return ` DEFAULT ${val}`;
  return ` DEFAULT '${val}'`;
}

function generateEntityTable(entity: EntityDecl, pg: boolean): string {
  const tableName = toTableName(entity.name);
  const lines: string[] = [];

  lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);

  // Both SQLite and PostgreSQL: columns first, table-level constraints last.
  const columns: string[] = [];
  const constraints: string[] = [];

  if (pg) {
    columns.push('  id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
  } else {
    columns.push('  id TEXT PRIMARY KEY');
  }

  // Fields
  for (const field of entity.fields) {
    const colName = toSnakeCase(field.name);
    let col = `  ${colName} ${sqlType(field.type, pg)}`;
    if (field.modifiers.includes('REQUIRED')) col += ' NOT NULL';
    if (field.modifiers.includes('UNIQUE')) col += ' UNIQUE';
    col += sqlDefault(field, pg);
    columns.push(col);
  }

  // Foreign-key columns + their table-level constraints
  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      const fkCol = toForeignKey(rel.target);
      const targetTable = toTableName(rel.target);
      columns.push(`  ${fkCol} ${pg ? 'UUID' : 'TEXT'} NOT NULL`);
      constraints.push(`  FOREIGN KEY (${fkCol}) REFERENCES ${targetTable}(id) ON DELETE CASCADE`);
    }
  }

  // Timestamps
  if (entity.timestamps) {
    if (pg) {
      columns.push('  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
      columns.push('  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    } else {
      columns.push("  created_at TEXT DEFAULT (datetime('now'))");
      columns.push("  updated_at TEXT DEFAULT (datetime('now'))");
    }
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
  const pg = isWebTarget(ast);

  // Generate header
  const header = pg
    ? [
        '-- Agicore Generated Migration — PostgreSQL dialect',
        `-- App: ${ast.app.name}`,
        `-- Generated: ${new Date().toISOString().split('T')[0]}`,
        '',
      ].join('\n')
    : [
        '-- Agicore Generated Migration',
        `-- App: ${ast.app.name}`,
        `-- Generated: ${new Date().toISOString().split('T')[0]}`,
        '',
        'PRAGMA journal_mode = WAL;',
        'PRAGMA foreign_keys = ON;',
        '',
      ].join('\n');

  // Generate all tables in one migration file
  const tables = ast.entities.map(e => generateEntityTable(e, pg));
  let migration = header + tables.join('\n\n');

  // Append the telemetry table when APP.telemetry is enabled.
  // (Phase 1a of the Andon Loop architecture.)
  const telemetryDdl = telemetrySql(ast);
  if (telemetryDdl) {
    migration += '\n\n' + telemetryDdl;
  }

  // Append workflow_checkpoints + workflow_runs tables when workflow runtime
  // is active (telemetry enabled AND any WORKFLOW declared). Phase 1b.
  const workflowDdl = workflowCheckpointsSql(ast);
  if (workflowDdl) {
    migration += '\n\n' + workflowDdl;
  }

  // Append SEED-driven INSERT statements AFTER every CREATE TABLE / CREATE INDEX,
  // so the migration runs schema-first then seed-second.
  const insertIgnore = pg ? 'INSERT INTO' : 'INSERT OR IGNORE INTO';
  const insertSuffix = pg ? ' ON CONFLICT DO NOTHING' : '';
  const seedLines: string[] = [];
  for (const entity of ast.entities) {
    const table = toTableName(entity.name);
    // Auto-seed singleton entities with id='singleton'
    if (entity.singleton) {
      const cols = ['id'];
      const vals = ["'singleton'"];
      if (entity.timestamps) {
        cols.push('created_at', 'updated_at');
        if (pg) {
          vals.push('NOW()', 'NOW()');
        } else {
          vals.push("datetime('now')", "datetime('now')");
        }
      }
      seedLines.push(
        `${insertIgnore} ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')})${insertSuffix};`
      );
    }
    if (!entity.seeds || entity.seeds.length === 0) continue;
    for (const seed of entity.seeds) {
      // Preserve insertion order so generated SQL is stable across runs.
      const cols = Array.from(seed.fields.keys());
      const vals = cols.map(c => sqlSeedLiteral(seed.fields.get(c)!, pg));
      // Auto-fill timestamps when the entity has TIMESTAMPS and SEED didn't specify them.
      if (entity.timestamps) {
        const tsDefault = pg ? 'NOW()' : "datetime('now')";
        if (!seed.fields.has('created_at')) { cols.push('created_at'); vals.push(tsDefault); }
        if (!seed.fields.has('updated_at')) { cols.push('updated_at'); vals.push(tsDefault); }
      }
      seedLines.push(
        `${insertIgnore} ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')})${insertSuffix};`
      );
    }
  }
  // Top-level SEED blocks (outside any ENTITY)
  const topSeeds = (ast as any).topLevelSeeds ?? [];
  for (const seed of topSeeds) {
    const table = toTableName(seed.entity);
    const cols = Array.from((seed.fields as Map<string, unknown>).keys());
    const vals = (cols as string[]).map((c: string) => sqlSeedLiteral((seed.fields as Map<string, any>).get(c), pg));
    seedLines.push(
      `${insertIgnore} ${table} (${(cols as string[]).join(', ')}) VALUES (${vals.join(', ')})${insertSuffix};`
    );
  }

  if (seedLines.length > 0) {
    migration += '\n\n-- SEED: idempotent insert rows from ENTITY SEED blocks\n';
    migration += seedLines.join('\n');
  }

  const outputPath = pg
    ? 'migrations/001_initial.sql'
    : 'src-tauri/migrations/001_initial.sql';

  files.set(outputPath, migration);

  return files;
}
