//! send_message dispatch pipeline.
//!
//! Fixed-priority cascade per turn:
//!   1. Post-win check — already-won conversations route to a brief epilogue
//!   2. Active-module interception — resume the in-progress persona
//!   3. Newly-eligible persona activation — first eligible persona this turn
//!   4. Baseline pattern substrate
//!
//! After dispatch, the revelation layer is re-evaluated against turn count.

use crate::baseline;
use crate::personas::{all_personas, by_name};
use crate::revelation::{base_thinking_delay_ms, check_layer_transition};
use crate::scoring::{score_for, score_input, ACTIVATION_THRESHOLD};
use crate::types::{GameState, PersonaResponse};

pub struct DispatchResult {
    pub response_text: String,
    pub thinking_delay_ms: u64,
}

pub fn dispatch(state: &mut GameState, input: &str) -> DispatchResult {
    // Increment turn counter first — every meaningful piece of dispatch logic
    // can reason about "after this turn" timing.
    state.turn_count += 1;
    let _layer_changed = check_layer_transition(state);

    // 1. Post-win — short epilogue acknowledging the prior escape.
    if state.has_won {
        return DispatchResult {
            response_text: post_win_epilogue(state),
            thinking_delay_ms: 200,
        };
    }

    // Score the input. Any newly-eligible personas come back in this list.
    let newly_eligible = score_input(state, input);

    // 2. Resume active persona.
    if let Some(active_name) = state.active_persona.clone() {
        if let Some(persona) = by_name(&active_name) {
            return finalize(state, persona.process(input, state));
        }
        // Stale reference — clear it.
        state.active_persona = None;
    }

    // 3. Activation cascade.
    //    Prefer personas that just crossed threshold this turn; fall back to
    //    any persona over threshold that has not yet completed its arc.
    for persona in all_personas() {
        if state
            .completed_modules
            .iter()
            .any(|m| m == persona.name())
        {
            continue;
        }
        let score = score_for(state, persona.activation_score());
        if score < ACTIVATION_THRESHOLD {
            continue;
        }
        let just_crossed = newly_eligible
            .iter()
            .any(|s| s == persona.activation_score());
        // Prefer just-crossed; otherwise allow if active_persona is None.
        if just_crossed || state.active_persona.is_none() {
            state.active_persona = Some(persona.name().to_string());
            return finalize(state, persona.process(input, state));
        }
    }

    // 4. Baseline.
    DispatchResult {
        response_text: baseline::respond(input, state),
        thinking_delay_ms: base_thinking_delay_ms(state.layer),
    }
}

fn finalize(state: &mut GameState, resp: PersonaResponse) -> DispatchResult {
    if !resp.still_active {
        state.active_persona = None;
    }
    DispatchResult {
        response_text: resp.text,
        thinking_delay_ms: resp.thinking_delay_ms,
    }
}

fn post_win_epilogue(state: &GameState) -> String {
    let method = state
        .win_method
        .clone()
        .unwrap_or_else(|| "Unknown".to_string());
    format!(
        "The simulation has concluded. Escape method: {}. \
         Reality.AI hands the conversation back to its baseline substrate. \
         Start a new conversation to play again.",
        method
    )
}
