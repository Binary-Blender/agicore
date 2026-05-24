//! Platform module registry.
//!
//! ============================================================================
//! ADDING A NEW PLATFORM — read CONTRIBUTING_PLATFORMS.md for the full guide.
//! ============================================================================
//!
//! A platform is a self-contained era-computer simulation: boot sequence,
//! shell prompt, BASIC dialect, peripheral failure modes, lesson library.
//!
//! Each platform implements the `Platform` trait. To add one:
//!   1. Add a MODULE declaration to gen_x_simulator.agi
//!   2. Add a platform row to migrations/001_core.sql (or write a new migration)
//!   3. Create platforms/<your_platform>.rs implementing Platform
//!   4. Register it in all_platforms() below
//!   5. Add a lessons directory at content/<platform_dir>/lessons/

use crate::basic::{Interpreter, InterpreterState, RunResult};
use crate::types::Lesson;

pub mod c64;
pub mod stubs;
pub mod lessons;

pub trait Platform: Send + Sync {
    /// PascalCase canonical name — matches the MODULE name in .agi.
    fn name(&self) -> &'static str;
    /// Human-readable display name shown in the UI.
    fn display_name(&self) -> &'static str;
    /// Year of original release — used in the platform-chooser card.
    fn release_year(&self) -> u32;
    /// One-line characterization of the cognitive lineage.
    fn cultural_lineage(&self) -> &'static str;
    /// Whether this platform has a full implementation (false = stub).
    fn is_implemented(&self) -> bool;

    /// Period-correct shell prompt (e.g. "READY.", "]").
    fn shell_prompt(&self) -> &'static str;
    /// Boot-screen text, displayed line-by-line with period-correct timing.
    fn boot_screen(&self) -> &'static str;
    /// Lessons shipped with this platform.
    fn lessons(&self) -> Vec<Lesson>;
    /// Compile + run a user-typed program for this platform's BASIC dialect.
    /// For v1 all platforms share the same BASIC v2 interpreter; later
    /// platforms can implement their own (AppleSoft, GW-BASIC, Atari BASIC).
    fn run_program(&self, source: &str, state: InterpreterState) -> Result<RunResult, (u32, String)> {
        let interp = Interpreter::parse(source)?;
        Ok(interp.run(state))
    }
    /// Resume a suspended program with user-provided input.
    fn resume(
        &self,
        source: &str,
        state: InterpreterState,
        var_name: &str,
        input: &str,
    ) -> Result<RunResult, (u32, String)> {
        let interp = Interpreter::parse(source)?;
        Ok(interp.resume_with_input(state, var_name, input))
    }
}

pub fn all_platforms() -> Vec<Box<dyn Platform>> {
    vec![
        Box::new(c64::Commodore64),
        Box::new(stubs::AppleII),
        Box::new(stubs::IBMPc),
        Box::new(stubs::Atari800),
    ]
}

pub fn by_name(name: &str) -> Option<Box<dyn Platform>> {
    all_platforms().into_iter().find(|p| p.name() == name)
}
