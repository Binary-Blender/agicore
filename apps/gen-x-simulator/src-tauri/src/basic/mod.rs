//! Period-correct Commodore 64 BASIC v2 interpreter (subset).
//!
//! Implements enough of BASIC v2 to run the type-in programs commonly
//! found in 1984 magazines: PRINT, INPUT, LET, IF/THEN, FOR/NEXT,
//! GOTO, GOSUB/RETURN, END, REM, line numbers, integer math, string
//! variables, basic built-ins (CHR$, INT, RND, LEN, ABS, STR$, VAL,
//! ASC).
//!
//! **Strictness is a feature.** Real typos must break with real C64
//! error messages (`?SYNTAX ERROR IN <line>`) so that the lesson's
//! debugging loop functions correctly. Do not add forgiving fallbacks.
//!
//! Contributors adding a new platform: implement a sibling interpreter
//! for the target BASIC dialect (AppleSoft for Apple II, GW-BASIC for
//! IBM PC, Atari BASIC for Atari 800) and register it via the Platform
//! trait. The shared AST and runtime should serve as reference.

pub mod ast;
pub mod lexer;
pub mod parser;
pub mod runtime;

pub use runtime::{Interpreter, InterpreterState, RunFrame, RunResult, RuntimeError};
