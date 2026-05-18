// LOG Code Generator
// Generates src-tauri/src/logger.rs with a file-based Rust logger using std::fs.
// No new Cargo dependencies — uses the std library only.
// Activated when ast.log is declared.

import type { AgiFile, LogDecl } from '@agicore/parser';

function levelToRustVariant(level: string): string {
  switch (level) {
    case 'trace': return 'Trace';
    case 'debug': return 'Debug';
    case 'info':  return 'Info';
    case 'warn':  return 'Warn';
    case 'error': return 'Error';
    default:      return 'Info';
  }
}

function rustTarget(target: string): string {
  switch (target) {
    case 'stdout': return 'LogTarget::Stdout';
    case 'both':   return 'LogTarget::Both';
    default:       return 'LogTarget::File';
  }
}

function generateLoggerRs(log: LogDecl): string {
  const levelVariant = levelToRustVariant(log.level);
  const rotateComment = log.rotate
    ? `// Rotation policy: ${log.rotate} (implement via OS log rotation or a cron)`
    : '';
  const writeFile = log.target === 'file' || log.target === 'both';
  const writeStdout = log.target === 'stdout' || log.target === 'both';

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Logger: file-based structured logger using std::fs (no extra dependencies)

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

static LOGGER: Mutex<Option<Logger>> = Mutex::new(None);

${rotateComment}
const LOG_PATH: &str = "${log.path}";
const MIN_LEVEL: LogLevel = LogLevel::${levelVariant};

pub struct Logger {
  path: PathBuf,
  level: LogLevel,
  target: LogTarget,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
  Trace = 0,
  Debug = 1,
  Info  = 2,
  Warn  = 3,
  Error = 4,
}

impl LogLevel {
  fn label(&self) -> &'static str {
    match self {
      Self::Trace => "TRACE",
      Self::Debug => "DEBUG",
      Self::Info  => "INFO",
      Self::Warn  => "WARN",
      Self::Error => "ERROR",
    }
  }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy)]
pub enum LogTarget {
  File,
  Stdout,
  Both,
}

pub fn init_logger() {
  if let Some(parent) = PathBuf::from(LOG_PATH).parent() {
    fs::create_dir_all(parent).ok();
  }
  let logger = Logger {
    path: PathBuf::from(LOG_PATH),
    level: MIN_LEVEL,
    target: ${rustTarget(log.target)},
  };
  *LOGGER.lock().unwrap() = Some(logger);
}

pub fn log(level: LogLevel, message: &str) {
  let guard = LOGGER.lock().unwrap();
  let Some(logger) = guard.as_ref() else { return };
  if level < logger.level { return; }

  let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ");
  let line = format!("[{}] [{}] {}\\n", now, level.label(), message);

${writeFile ? `  if matches!(logger.target, LogTarget::File | LogTarget::Both) {
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&logger.path) {
      let _ = file.write_all(line.as_bytes());
    }
  }` : ''}${writeStdout ? `
  if matches!(logger.target, LogTarget::Stdout | LogTarget::Both) {
    print!("{}", line);
  }` : ''}
}

#[macro_export]
macro_rules! log_trace { ($($arg:tt)*) => { $crate::logger::log($crate::logger::LogLevel::Trace, &format!($($arg)*)) } }
#[macro_export]
macro_rules! log_debug { ($($arg:tt)*) => { $crate::logger::log($crate::logger::LogLevel::Debug, &format!($($arg)*)) } }
#[macro_export]
macro_rules! log_info  { ($($arg:tt)*) => { $crate::logger::log($crate::logger::LogLevel::Info,  &format!($($arg)*)) } }
#[macro_export]
macro_rules! log_warn  { ($($arg:tt)*) => { $crate::logger::log($crate::logger::LogLevel::Warn,  &format!($($arg)*)) } }
#[macro_export]
macro_rules! log_error { ($($arg:tt)*) => { $crate::logger::log($crate::logger::LogLevel::Error, &format!($($arg)*)) } }
`;
}

export function generateLog(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!ast.log) return files;

  files.set('src-tauri/src/logger.rs', generateLoggerRs(ast.log));
  return files;
}
