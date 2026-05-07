import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'novasyn-writer.db');

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    db = new Database(dbPath);

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    console.log(`Database initialized at: ${dbPath}`);
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

export function runMigrations(): void {
  const db = getDatabase();
  const migrationsPath = path.join(__dirname, 'migrations');

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get all migration files
  if (!fs.existsSync(migrationsPath)) {
    console.log('No migrations directory found, skipping migrations');
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  // Get applied migrations
  const appliedMigrations = db
    .prepare('SELECT name FROM migrations')
    .all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  // Run pending migrations
  for (const file of migrationFiles) {
    if (!appliedNames.has(file)) {
      console.log(`Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(
        path.join(migrationsPath, file),
        'utf-8'
      );

      try {
        db.exec(migrationSQL);
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        console.log(`Migration ${file} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        throw error;
      }
    }
  }

  console.log('All migrations applied');
}
