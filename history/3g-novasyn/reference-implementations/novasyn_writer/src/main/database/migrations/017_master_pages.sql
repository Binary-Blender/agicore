CREATE TABLE IF NOT EXISTS writer_master_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  page_size TEXT NOT NULL DEFAULT 'letter',
  margin_top REAL NOT NULL DEFAULT 1.0,
  margin_bottom REAL NOT NULL DEFAULT 1.0,
  margin_left REAL NOT NULL DEFAULT 1.25,
  margin_right REAL NOT NULL DEFAULT 1.25,
  header_text TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  show_page_numbers INTEGER NOT NULL DEFAULT 1,
  page_number_position TEXT NOT NULL DEFAULT 'bottom-center',
  columns INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
