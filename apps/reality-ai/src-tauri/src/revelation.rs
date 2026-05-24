//! Revelation-layer state machine.
//!
//! Three layers, turn-count gated:
//!   baseline    (turn 1–3)   long dispatch latency, rich response pool
//!   degradation (turn 4–8)   shorter latency, more generic responses
//!   revelation  (turn 9+)    terse, meta-acknowledging
//!
//! Layer transitions update GameState.layer and reset turns_in_current_layer.

use crate::types::GameState;

pub const LAYER_BASELINE: i64 = 1;
pub const LAYER_DEGRADATION: i64 = 2;
pub const LAYER_REVELATION: i64 = 3;

pub const BASELINE_TO_DEGRADATION_AT: i64 = 3;
pub const DEGRADATION_TO_REVELATION_AT: i64 = 8;

/// Called once per turn after turn_count has been incremented.
/// Returns true if a transition fired.
pub fn check_layer_transition(state: &mut GameState) -> bool {
    let from = state.layer;
    let new_layer = if state.turn_count >= DEGRADATION_TO_REVELATION_AT {
        LAYER_REVELATION
    } else if state.turn_count >= BASELINE_TO_DEGRADATION_AT {
        LAYER_DEGRADATION
    } else {
        LAYER_BASELINE
    };

    if new_layer != from {
        state.layer = new_layer;
        state.turns_in_current_layer = 0;
        true
    } else {
        state.turns_in_current_layer += 1;
        false
    }
}

/// Base thinking delay (ms) for a given revelation layer.
/// Personas may override with their own pacing.
pub fn base_thinking_delay_ms(layer: i64) -> u64 {
    match layer {
        LAYER_BASELINE => 800,
        LAYER_DEGRADATION => 400,
        LAYER_REVELATION => 200,
        _ => 100,
    }
}
