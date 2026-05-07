import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database.Database | null = null;

const DB_PATH = path.join(app.getPath('userData'), 'social.db');

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('[DB] No migrations directory found, skipping migrations');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[DB] No migration files found');
    return;
  }

  const applied = new Set(
    database
      .prepare('SELECT name FROM migrations')
      .all()
      .map((row: any) => row.name)
  );

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('[DB] All migrations already applied');
    return;
  }

  console.log(`[DB] Running ${pending.length} pending migration(s)...`);

  const insertMigration = database.prepare(
    'INSERT INTO migrations (name, applied_at) VALUES (?, ?)'
  );

  const runAll = database.transaction(() => {
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`[DB] Applying migration: ${file}`);
      database.exec(sql);
      insertMigration.run(file, new Date().toISOString());
    }
  });

  runAll();
  console.log('[DB] Migrations complete');
}

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[DB] Initializing database at ${DB_PATH}`);
  db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
