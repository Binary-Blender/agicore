# Testing in Agicore

Agicore generates real integration tests from `TEST` declarations in your `.agi` file. These are `#[cfg(test)]` Rust tests that run against an in-memory SQLite database using the exact same migration your production app uses. No mocking. No faking. The database is the database.

---

## Writing a TEST declaration

```agi
TEST student_crud {
  GIVEN Student { name: "Alice", grade: "5th" }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> name == "Alice"
}

TEST student_with_classroom {
  GIVEN Classroom { name: "Room 12", grade: "5th" }
  GIVEN Student { name: "Bob", grade: "5th" }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> grade == "5th"
}
```

### GIVEN

Each `GIVEN` block inserts one row into the database before assertions run. Fields not listed use their defaults (or a generated placeholder for `REQUIRED` fields without a default).

When multiple `GIVEN` blocks reference entities with `BELONGS_TO` relationships, the compiler automatically wires the FK from parent to child — you don't supply `classroom_id` manually.

```agi
GIVEN Classroom { name: "Room 12" }   // inserted first, id captured
GIVEN Student { name: "Bob" }         // classroom_id = Room 12's id (auto-wired)
```

### EXPECT

The primary entity for assertions is the **last** GIVEN. Assertions run against the row inserted by that GIVEN.

| Operation | What it tests |
|-----------|--------------|
| `create` | The row was inserted (asserts on the inserted row's fields) |
| `get_by_id` | A SELECT by the generated id returns the expected field values |
| `update` | After an update, field value matches assertion |

Supported assertion operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `IS NOT NULL`, `IS NULL`, `CONTAINS`

```agi
EXPECT create    -> id IS NOT NULL
EXPECT create    -> name == "Alice"
EXPECT get_by_id -> active == true
EXPECT get_by_id -> score > 0
EXPECT get_by_id -> notes CONTAINS "important"
```

---

## What gets generated

The compiler writes `src-tauri/src/tests.rs` — a single Rust module with one `#[test]` function per `TEST` declaration.

**Example — generated output for `student_crud`:**

```rust
#[cfg(test)]
mod entity_tests {
    use rusqlite::Connection;
    use uuid::Uuid;

    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch(include_str!("../migrations/001_initial.sql"))
            .expect("migration failed");
        conn
    }

    #[test]
    fn student_crud() {
        let conn = test_db();
        let now = chrono::Utc::now().to_rfc3339();

        // GIVEN Student { name: "Alice", grade: "5th" }
        let student_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO students (id, name, grade, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![&student_id, "Alice".to_string(), "5th".to_string(), &now, &now],
        ).expect("insert Student");

        // EXPECT create -> id IS NOT NULL
        assert!(!student_id.is_empty(), "id should not be empty");

        // EXPECT get_by_id -> name == "Alice"
        let name_val: String = conn.query_row(
            "SELECT name FROM students WHERE id = ?", [&student_id],
            |r| r.get(0)).expect("query name");
        assert_eq!(name_val, "Alice".to_string(), "name should be Alice");
    }
}
```

Key properties of generated tests:
- **In-memory SQLite** — fast, no filesystem side effects, no cleanup needed
- **Real migrations** — `include_str!("../migrations/001_initial.sql")` runs your actual schema
- **Real UUIDs** — every GIVEN row gets a real UUID; FKs are wired correctly
- **No Tauri State machinery** — tests the data layer directly, not the Tauri command layer

---

## Running tests

```bash
cd apps/<your-app>/src-tauri
cargo test
```

All generated tests run. Output:

```
running 3 tests
test entity_tests::student_crud ... ok
test entity_tests::student_with_classroom ... ok
test entity_tests::invoice_approval_flow ... ok

test result: ok. 3 passed; 0 failed; 0 ignored
```

To run a single test by name:

```bash
cargo test student_crud
```

To see stdout (useful when debugging a failing test):

```bash
cargo test -- --nocapture
```

---

## How many tests to write

Write a TEST for every ENTITY that has business rules or non-trivial relationships. At minimum:

- One `create` + field assertion per ENTITY
- One parent/child relationship test per `BELONGS_TO`
- One test per business invariant (e.g., `score > 0`, `status == "active"`)

The framework tests the compiler — your TEST declarations test your application's data model.

---

## What TEST declarations do NOT cover

- **Tauri command layer** — the Rust `#[tauri::command]` functions are not called by generated tests; tests go directly to SQL
- **TypeScript / React** — UI tests are out of scope for generated tests
- **AI action correctness** — AI responses are not deterministic and cannot be asserted in this test style
- **IMPL action logic** — protected stub files contain your custom logic; write your own `#[test]` blocks inside those files if needed

For IMPL stubs, add tests directly in the stub file:

```rust
// src-tauri/src/commands/export_report.rs
// @agicore-protected

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_path_construction() {
        // your custom test here
    }
}
```

---

## Example: full test suite for a small app

```agi
TEST student_created {
  GIVEN Student { name: "Alice", grade: "5th" }
  EXPECT create -> id IS NOT NULL
  EXPECT create -> name == "Alice"
}

TEST student_defaults {
  GIVEN Student { name: "Bob", grade: "3rd" }
  EXPECT create -> active == true
}

TEST lesson_belongs_to_student {
  GIVEN Student { name: "Carol", grade: "4th" }
  GIVEN Lesson { title: "Fractions", subject: "Math" }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> title == "Fractions"
}

TEST progress_tracked {
  GIVEN Student { name: "Dave", grade: "6th" }
  GIVEN Progress { completed: true, score: 95 }
  EXPECT create -> score > 90
}
```

This generates four Rust tests, each verifying a different layer of your data model. Run with `cargo test` after generating the app.
