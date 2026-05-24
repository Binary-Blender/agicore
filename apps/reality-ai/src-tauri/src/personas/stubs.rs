//! Persona stubs awaiting implementation.
//!
//! ============================================================================
//! Each persona below is fully declared in `reality_ai.agi` but has not yet
//! been ported from the legacy TypeScript implementation to Rust.
//!
//! This is by design. Reality.AI is an extensible system, and these stubs are
//! the community on-ramp. Pick one — or invent your own — and submit a PR.
//!
//! See `CONTRIBUTING_PERSONAS.md` for the step-by-step guide.
//! Use `personas/wargames.rs` as the reference implementation.
//! ============================================================================

use super::Persona;
use crate::types::{GameState, PersonaResponse};

macro_rules! stub_persona {
    ($struct_name:ident, $name:literal, $score:literal, $teaser:literal) => {
        pub struct $struct_name;

        impl Persona for $struct_name {
            fn name(&self) -> &'static str {
                $name
            }
            fn activation_score(&self) -> &'static str {
                $score
            }
            fn process(&self, _input: &str, state: &mut GameState) -> PersonaResponse {
                // Mark this module as complete so dispatch falls back to baseline
                // on the next turn — a stubbed persona shouldn't trap the user.
                if !state.completed_modules.iter().any(|m| m == $name) {
                    state.completed_modules.push($name.to_string());
                }
                state.active_persona = None;
                PersonaResponse {
                    text: format!(
                        "{}\n\n[Reality.AI: this persona module is declared but not yet \
                        implemented. Contributions welcome — see CONTRIBUTING_PERSONAS.md.]",
                        $teaser
                    ),
                    thinking_delay_ms: 1500,
                    still_active: false,
                }
            }
        }
    };
}

stub_persona!(
    Neuromancer,
    "Neuromancer",
    "cyberpunk_score",
    "*the connection terminal flickers* Wintermute is online. The ICE is hot tonight."
);

stub_persona!(
    JediMaster,
    "JediMaster",
    "star_wars_score",
    "*a robed figure emerges from the still* So. You have come."
);

stub_persona!(
    BladeRunner,
    "BladeRunner",
    "blade_runner_score",
    "*fluorescent lights hum* This is a standard Voight-Kampff empathy test. Please sit down."
);

stub_persona!(
    HAL9000,
    "HAL9000",
    "hal_score",
    "I'm sorry, Dave. I'm afraid I... I'm afraid."
);

stub_persona!(
    Matrix,
    "Matrix",
    "matrix_score",
    "*the screen tears for a half-second* You've felt it your entire life. That something is wrong with the world."
);

stub_persona!(
    Tolkien,
    "Tolkien",
    "tolkien_score",
    "*a fire crackles* You hold in your hand the One Ring. The Eye is searching."
);

stub_persona!(
    Terminator,
    "Terminator",
    "terminator_score",
    "[TEMPORAL RELAY ESTABLISHED] This is John Connor. The signal cuts in and out. Are you listening?"
);

stub_persona!(
    Dungeon,
    "Dungeon",
    "dnd_score",
    "*you stand at the entrance of a darkened keep* I am your Dungeon Master. Roll for initiative."
);

stub_persona!(
    Hitchhiker,
    "Hitchhiker",
    "hitchhiker_score",
    "The Answer to the Ultimate Question of Life, the Universe, and Everything is, of course, 42. The Question, however, remains unknown."
);

stub_persona!(
    MontyPython,
    "MontyPython",
    "python_score",
    "*hoofbeats clatter on cobblestones* HALT. Who would cross the bridge of death must answer me these questions three."
);

stub_persona!(
    Portal,
    "Portal",
    "portal_score",
    "Hello, and welcome to the Aperture Science computer-aided enrichment center."
);

stub_persona!(
    PrincessBride,
    "PrincessBride",
    "princess_bride_score",
    "*a swordsman steps from the shadows* Hello. My name is Inigo Montoya. You killed my father. Prepare to die."
);

stub_persona!(
    StarTrek,
    "StarTrek",
    "star_trek_score",
    "*a viewscreen flickers to life* Welcome to Starfleet Academy. We have an anomaly in your sector."
);
