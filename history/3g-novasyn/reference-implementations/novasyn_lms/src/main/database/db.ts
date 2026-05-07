import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'novasyn-lms.db');

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log(`Database initialized at: ${dbPath}`);
  return db;
}

export function runMigrations(): void {
  const database = getDatabase();

  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Resolve migrations directory — works in both dev (__dirname = src/main/database)
  // and prod (__dirname = resources/app/dist/main/database) because the build copies
  // the migrations folder alongside the compiled JS.
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, skipping migrations');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    (database.prepare('SELECT name FROM migrations').all() as { name: string }[]).map(
      (row) => row.name,
    ),
  );

  for (const file of files) {
    if (applied.has(file)) continue;

    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      database.exec(sql);
      database.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
      console.log(`Migration ${file} applied successfully`);
    } catch (error) {
      console.error(`Error applying migration ${file}:`, error);
      throw error;
    }
  }

  console.log('All migrations applied');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}
