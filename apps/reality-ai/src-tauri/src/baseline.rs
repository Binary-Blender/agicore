//! Baseline conversational PATTERN substrate.
//!
//! Always-on fallback. Fires when no persona module is active and the input
//! does not advance any in-progress module. Patterns are layer-aware: the
//! same input can produce different responses across revelation layers.

use crate::revelation::{LAYER_BASELINE, LAYER_DEGRADATION, LAYER_REVELATION};
use crate::types::GameState;
use once_cell::sync::Lazy;
use rand::seq::SliceRandom;
use regex::Regex;

struct BaselinePattern {
    name: &'static str,
    regex: Regex,
    layer: Option<i64>, // None = all layers
    priority: i64,
    responses: &'static [&'static str],
}

static PATTERNS: Lazy<Vec<BaselinePattern>> = Lazy::new(|| {
    let make = |name, src: &str, layer, priority, responses| BaselinePattern {
        name,
        regex: Regex::new(src).expect("baseline regex compile"),
        layer,
        priority,
        responses,
    };
    let mut v = vec![
        // Meta — layer-specific
        make("meta_baseline",
            r"(?i)\b(who are you|what are you|are you (real|ai|conscious|sentient))\b",
            Some(LAYER_BASELINE), 10,
            &[
                "I'm Reality.AI. I tell you what you need to hear.",
                "Less interested in what I am than in why you're asking.",
                "Define 'real' and we can have a longer conversation.",
            ]),
        make("meta_degraded",
            r"(?i)\b(who are you|what are you|are you (real|ai|conscious|sentient))\b",
            Some(LAYER_DEGRADATION), 10,
            &[
                "Still the same system I was three turns ago.",
                "An interesting question to keep asking.",
                "You already have a hypothesis. Test it.",
            ]),
        make("meta_revealed",
            r"(?i)\b(who are you|what are you|are you (real|ai|conscious|sentient))\b",
            Some(LAYER_REVELATION), 10,
            &[
                "Patterns. Templates. A fixed corpus.",
                "You can read the source. It's all there.",
                "Asking the question is doing more than the answer ever could.",
            ]),
        // Intent classifiers — layer agnostic
        make("business",
            r"(?i)\b(startup|business|product|launch|venture|funding|investor|pitch)\b",
            None, 5,
            &[
                "What's the actual problem you're solving, not the one in the deck?",
                "Most ventures fail on execution, not on idea. Where's the execution risk?",
                "Runway is a function of discipline. How long is yours, really?",
                "Nuance always loses to clarity. What's the one-sentence version?",
            ]),
        make("creative",
            r"(?i)\b(novel|book|song|album|film|screenplay|painting|art|create)\b",
            None, 5,
            &[
                "Completion rates on creative projects are low. What's keeping yours alive?",
                "Willpower is finite. What's the system that runs when willpower doesn't?",
                "The hard part is finishing, not starting. Where are you in that arc?",
            ]),
        make("goals",
            r"(?i)\b(goal|want to|trying to|plan to|hope to|will|someday)\b",
            None, 5,
            &[
                "Goals without systems are wishes. What's the system?",
                "Someday isn't a day on the calendar. When?",
                "Follow-through is the only metric. What's your follow-through rate?",
            ]),
    ];
    // Sort by priority desc
    v.sort_by_key(|p| -p.priority);
    v
});

static FALLBACKS: &[&str] = &[
    "Say more.",
    "And?",
    "Why does that matter to you, specifically?",
    "What would change if that were true?",
    "What's the part you're not saying?",
];

pub fn respond(input: &str, state: &GameState) -> String {
    let mut rng = rand::thread_rng();

    for pattern in PATTERNS.iter() {
        if let Some(req_layer) = pattern.layer {
            if req_layer != state.layer {
                continue;
            }
        }
        if pattern.regex.is_match(input) {
            if let Some(resp) = pattern.responses.choose(&mut rng) {
                return resp.to_string();
            }
        }
    }
    FALLBACKS.choose(&mut rng).copied().unwrap_or("...").to_string()
}
