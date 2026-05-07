import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'forge.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log(`Database initialized at: ${dbPath}`);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) { db.close(); db = null; console.log('Database closed'); }
}

export function runMigrations(): void {
  const database = getDatabase();
  const migrationsPath = path.join(__dirname, 'migrations');
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  if (!fs.existsSync(migrationsPath)) { console.log('No migrations directory found'); return; }
  const migrationFiles = fs.readdirSync(migrationsPath).filter((f) => f.endsWith('.sql')).sort();
  const applied = new Set((database.prepare('SELECT name FROM migrations').all() as { name: string }[]).map((m) => m.name));
  for (const file of migrationFiles) {
    if (!applied.has(file)) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
      try {
        database.exec(sql);
        database.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        console.log(`Migration ${file} applied`);
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        throw error;
      }
    }
  }
  console.log('All migrations applied');
}
