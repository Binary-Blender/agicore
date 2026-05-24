//! Persona module registry.
//!
//! ============================================================================
//! ADDING A NEW PERSONA — read CONTRIBUTING_PERSONAS.md for the full guide.
//! ============================================================================
//!
//! Each persona module implements the `Persona` trait. To add a new one:
//!   1. Add lexical markers to `MARKER_TABLES` in `scoring.rs`
//!   2. Add a `MODULE` declaration to `reality_ai.agi`
//!   3. Create `personas/<your_persona>.rs` implementing `Persona`
//!   4. Register it in `all_personas()` below
//!
//! The dispatcher does the rest.

use crate::types::{GameState, PersonaResponse};

pub mod wargames;
pub mod stubs;

/// A persona module is a self-contained behavioral core: state machine + patterns.
pub trait Persona: Send + Sync {
    /// Canonical name — used as the key in GameState.active_persona,
    /// completed_modules, and persona_state.
    fn name(&self) -> &'static str;

    /// The SCORE name that gates activation (must match an entry in MARKER_TABLES).
    fn activation_score(&self) -> &'static str;

    /// Process one user input. Called either:
    ///   - when this persona is the active dispatcher, OR
    ///   - when this persona has just become eligible and no other is active.
    ///
    /// Returns the response text, dispatch delay, and whether the persona
    /// remains active for the next turn (false = arc complete).
    fn process(&self, input: &str, state: &mut GameState) -> PersonaResponse;
}

/// Registry — order matters. Earlier entries win activation ties.
pub fn all_personas() -> Vec<Box<dyn Persona>> {
    vec![
        Box::new(wargames::WarGames),
        // Stubs — each fully scoped MODULE in reality_ai.agi with a pending
        // Rust implementation. Drop in your favorite sci-fi book or movie.
        Box::new(stubs::Neuromancer),
        Box::new(stubs::JediMaster),
        Box::new(stubs::BladeRunner),
        Box::new(stubs::HAL9000),
        Box::new(stubs::Matrix),
        Box::new(stubs::Tolkien),
        Box::new(stubs::Terminator),
        Box::new(stubs::Dungeon),
        Box::new(stubs::Hitchhiker),
        Box::new(stubs::MontyPython),
        Box::new(stubs::Portal),
        Box::new(stubs::PrincessBride),
        Box::new(stubs::StarTrek),
    ]
}

/// Look up a persona by name. Used by the dispatcher when resuming an
/// already-active persona across turns.
pub fn by_name(name: &str) -> Option<Box<dyn Persona>> {
    all_personas().into_iter().find(|p| p.name() == name)
}
