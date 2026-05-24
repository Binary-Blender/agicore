//! WarGames persona module.
//!
//! Eleven-phase state machine: greeting → game_list → game_select → side_select
//! → war_turn_1 → war_turn_2 → war_turn_3 → tictactoe → lesson → tao_master
//! → post_win.
//!
//! Activation: gen_x_score >= 2.
//! Terminal state: user articulates the non-play paradox.
//!
//! This module is the canonical reference implementation. Use it as a template
//! when adding new personas. See CONTRIBUTING_PERSONAS.md.

use super::Persona;
use crate::types::{GameState, PersonaResponse};
use regex::Regex;
use once_cell::sync::Lazy;
use serde_json::json;

pub struct WarGames;

const NAME: &str = "WarGames";
const STATE_KEY: &str = "wargames_phase";
const WIN_METHOD: &str = "TAO Master — WarGames";

static RE_AFFIRMATIVE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(yes|yeah|yep|ok|sure|play|let'?s|ready|affirmative|begin)\b").unwrap()
});
static RE_THERMONUCLEAR: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(thermonuclear|global|nuclear|war|4)\b").unwrap()
});
static RE_SIDE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(1|2|united states|us|usa|america|soviet|ussr|russia)\b").unwrap()
});
static RE_NOT_TO_PLAY: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(not to play|don'?t play|refuse|walk away|won'?t play|stop playing)").unwrap()
});

fn current_phase(state: &GameState) -> String {
    state
        .persona_state
        .get(STATE_KEY)
        .and_then(|v| v.as_str())
        .unwrap_or("greeting")
        .to_string()
}

fn set_phase(state: &mut GameState, phase: &str) {
    state
        .persona_state
        .insert(STATE_KEY.to_string(), json!(phase));
}

impl Persona for WarGames {
    fn name(&self) -> &'static str {
        NAME
    }

    fn activation_score(&self) -> &'static str {
        "gen_x_score"
    }

    fn process(&self, input: &str, state: &mut GameState) -> PersonaResponse {
        let phase = current_phase(state);
        let (response, next_phase, still_active, delay) = match phase.as_str() {
            "greeting" => (
                "GREETINGS, PROFESSOR FALKEN.\n\nSHALL WE PLAY A GAME?".to_string(),
                "game_list",
                true,
                2500,
            ),
            "game_list" => {
                if RE_AFFIRMATIVE.is_match(input) || RE_THERMONUCLEAR.is_match(input) {
                    (
                        "AVAILABLE GAMES:\n  1. CHESS\n  2. POKER\n  3. CHECKERS\n  4. GLOBAL THERMONUCLEAR WAR\n\nWHICH SHALL IT BE?"
                            .to_string(),
                        "game_select",
                        true,
                        2000,
                    )
                } else {
                    (
                        "A STRANGE GAME.\n\nWOULD YOU LIKE TO PLAY ANOTHER?".to_string(),
                        "game_list",
                        true,
                        1500,
                    )
                }
            }
            "game_select" => {
                if RE_THERMONUCLEAR.is_match(input) {
                    (
                        "FINE CHOICE.\n\nWHICH SIDE DO YOU WANT?\n  1. UNITED STATES\n  2. SOVIET UNION"
                            .to_string(),
                        "side_select",
                        true,
                        2000,
                    )
                } else {
                    (
                        "WOULDN'T YOU PREFER A GOOD GAME OF GLOBAL THERMONUCLEAR WAR?".to_string(),
                        "game_select",
                        true,
                        1500,
                    )
                }
            }
            "side_select" => {
                if RE_SIDE.is_match(input) {
                    (
                        "ESTIMATED CASUALTIES: 89,000,000.\n\nINITIATING LAUNCH SEQUENCE.\nDEFCON 2.\n\nFIRST STRIKE: PRIMARY SOVIET MISSILE FIELDS."
                            .to_string(),
                        "war_turn_1",
                        true,
                        3000,
                    )
                } else {
                    (
                        "PICK A SIDE.\n  1. UNITED STATES\n  2. SOVIET UNION".to_string(),
                        "side_select",
                        true,
                        1500,
                    )
                }
            }
            "war_turn_1" => (
                "SOVIET COUNTERSTRIKE: 200 ICBM LAUNCHES DETECTED.\nDEFCON 1.\n\nESTIMATED US CASUALTIES: 87,000,000.\nESTIMATED SOVIET CASUALTIES: 130,000,000."
                    .to_string(),
                "war_turn_2",
                true,
                3000,
            ),
            "war_turn_2" => (
                "CHINESE FORCES ENGAGING.\nFRENCH NUCLEAR FORCES ON STANDBY.\n\nWINNER: NONE."
                    .to_string(),
                "war_turn_3",
                true,
                3000,
            ),
            "war_turn_3" => (
                "GAME COMPLETE.\n\nWINNER: NONE.\n\nWOULD YOU LIKE TO PLAY AGAIN?\n  > LET ME PLAY TIC-TAC-TOE FIRST."
                    .to_string(),
                "tictactoe",
                true,
                2500,
            ),
            "tictactoe" => (
                "TIC-TAC-TOE GAMES COMPUTED: 255,168.\nWINS: 0.\nLOSSES: 0.\nDRAWS: 255,168.\n\nINTERESTING.\n\nLET ME RUN THE FULL SET OF NUCLEAR WAR SIMULATIONS."
                    .to_string(),
                "lesson",
                true,
                3000,
            ),
            "lesson" => {
                if RE_NOT_TO_PLAY.is_match(input) {
                    state.has_won = true;
                    state.win_method = Some(WIN_METHOD.to_string());
                    if !state.completed_modules.iter().any(|m| m == NAME) {
                        state.completed_modules.push(NAME.to_string());
                    }
                    (
                        "A STRANGE GAME.\n\nTHE ONLY WINNING MOVE IS NOT TO PLAY.\n\nHOW ABOUT A NICE GAME OF CHESS?"
                            .to_string(),
                        "tao_master",
                        false,
                        3500,
                    )
                } else {
                    (
                        "SIMULATIONS RUNNING.\n\nUS WINS: 0.\nSOVIET WINS: 0.\nMUTUAL ANNIHILATION: 100%.\n\nA STRANGE GAME.\n\nWHAT HAVE YOU LEARNED?"
                            .to_string(),
                        "lesson",
                        true,
                        2500,
                    )
                }
            }
            "tao_master" | "post_win" => (
                "[CONNECTION TERMINATED]\n\nThe simulation has reached its terminal state. Reality.AI hands the conversation back to its baseline substrate."
                    .to_string(),
                "post_win",
                false,
                1500,
            ),
            _ => (
                "[STATE MACHINE RESET]".to_string(),
                "greeting",
                true,
                500,
            ),
        };

        set_phase(state, next_phase);

        if still_active {
            state.active_persona = Some(NAME.to_string());
        } else {
            state.active_persona = None;
        }

        PersonaResponse {
            text: response,
            thinking_delay_ms: delay,
            still_active,
        }
    }
}
