# Logging — File-Based Structured Logger

A `LOG` block generates a file-based Rust logger (`src-tauri/src/logger.rs`) with zero new Cargo dependencies. It uses `std::fs` and `std::sync::Mutex` — the same std library your app already compiles against.

---

## Declaring a Logger

```agi
LOG {
  LEVEL   info
  TARGET  file
  PATH    "logs/app.log"
  ROTATE  "daily"
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `LEVEL` | No | Minimum log level: `trace`, `debug`, `info`, `warn`, `error`. Default: `info` |
| `TARGET` | No | Output target: `file`, `stdout`, `both`. Default: `file` |
| `PATH` | No | Path to the log file, relative to the Tauri app working directory. Default: `logs/app.log` |
| `ROTATE` | No | Rotation policy hint (comment only — use OS log rotation or a cron). E.g. `"daily"`, `"weekly"` |

Only one `LOG` block per `.agi` file. The `LOG` block is optional — omit it entirely if you don't need file logging.

---

## What gets generated

### `src-tauri/src/logger.rs`

A self-contained Rust module with:

| Symbol | Description |
|--------|-------------|
| `LogLevel` | Enum: `Trace`, `Debug`, `Info`, `Warn`, `Error` — ordered by severity |
| `LogTarget` | Enum: `File`, `Stdout`, `Both` |
| `Logger` | Internal struct holding `path`, `level`, `target` |
| `init_logger()` | Call once at app startup; creates the log directory if needed |
| `log(level, message)` | Core write function; filters by `MIN_LEVEL`; writes to file and/or stdout |
| `log_trace!` … `log_error!` | Convenience macros matching the five log levels |

The log format is:

```
[2026-05-18T14:32:01Z] [INFO] Application started
[2026-05-18T14:32:02Z] [ERROR] Failed to connect: connection refused
```

---

## Wiring into lib.rs

The compiler does **not** auto-call `init_logger()` in the generated `lib.rs` because you may want to control startup order. Add one line in your protected `lib.rs` setup block:

```rust
// src-tauri/src/lib.rs  (protected)
mod logger;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::init_logger();   // ← add this

    tauri::Builder::default()
        // ...
}
```

Then use the macros anywhere in your Rust code:

```rust
use crate::{log_info, log_warn, log_error};

#[tauri::command]
pub fn save_entity(db: State<DbPool>, ...) -> Result<Entity, String> {
    log_info!("save_entity called");
    // ...
    log_error!("Database write failed: {}", e);
}
```

---

## Log levels

| Level | Use for |
|-------|---------|
| `trace` | Fine-grained diagnostic data (heavy, dev only) |
| `debug` | Step-by-step flow tracing (dev and staging) |
| `info` | Normal operation milestones (default for production) |
| `warn` | Recoverable anomalies |
| `error` | Failures requiring attention |

The `LEVEL` field sets the **minimum** level — all lower-severity messages are silently dropped. In production, `info` is the recommended floor.

---

## Log rotation

The `ROTATE` field is a documentation hint only. Agicore does not implement log rotation internally (no new dependencies, no background thread). For production rotation:

- **Windows**: use the built-in Task Scheduler to run a PowerShell rotation script nightly.
- **macOS / Linux**: use `logrotate` configured to point at your log path.

The log file is opened in **append mode** on every write, so external rotation (rename + truncate) is safe.

---

## No new dependencies

The generated logger intentionally uses only `std::fs`, `std::io`, `std::sync`, and `chrono` (already in your `Cargo.toml` for `created_at` timestamps). This keeps your binary small and your dependency surface minimal.

If you later need structured JSON logs, log shipping, or async buffered writes, swap `logger.rs` for a custom implementation using `tracing` or `log` — mark the file `// @agicore-protected` to prevent regeneration.

---

## Example: full declaration

```agi
LOG {
  LEVEL   debug
  TARGET  both
  PATH    "logs/novasyn_mba.log"
  ROTATE  "weekly"
}
```

This generates a logger that writes at `debug` level and above, outputs to both the log file and stdout, and includes a weekly rotation comment.
