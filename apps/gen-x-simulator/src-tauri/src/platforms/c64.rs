//! Commodore 64 platform module.
//!
//! Period-correct boot screen, READY. prompt, BASIC v2 dialect.
//! Reference implementation — use as a template when adding other platforms.

use super::Platform;
use crate::types::Lesson;

pub struct Commodore64;

const BOOT_SCREEN: &str = "\n    **** COMMODORE 64 BASIC V2 ****\n\n 64K RAM SYSTEM  38911 BASIC BYTES FREE\n\nREADY.\n";

impl Platform for Commodore64 {
    fn name(&self) -> &'static str { "Commodore64" }
    fn display_name(&self) -> &'static str { "Commodore 64" }
    fn release_year(&self) -> u32 { 1982 }
    fn cultural_lineage(&self) -> &'static str {
        "Blue-collar polyglot: BASIC + assembly + gaming. 17 million sold."
    }
    fn is_implemented(&self) -> bool { true }
    fn shell_prompt(&self) -> &'static str { "READY." }
    fn boot_screen(&self) -> &'static str { BOOT_SCREEN }
    fn lessons(&self) -> Vec<Lesson> {
        super::lessons::lessons_for("Commodore64")
    }
}
