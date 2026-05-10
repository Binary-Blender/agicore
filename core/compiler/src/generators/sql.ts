// SQL Migration Generator
// Generates SQLite migration files from ENTITY declarations

import type { AgiFile, EntityDecl, FieldDef, AgiType } from '@agicore/parser';
import { toTableName, toForeignKey, toSnakeCase } from '../naming.js';

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
  const migration = pragmas + tables.join('\n\n');

  files.set('src-tauri/migrations/001_initial.sql', migration);

  return files;
}
