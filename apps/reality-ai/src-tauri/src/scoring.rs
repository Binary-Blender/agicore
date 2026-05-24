//! Cultural-marker activation scoring.
//!
//! Each persona module is associated with a named score that accumulates when
//! the user emits domain-specific lexical markers. Markers are deduplicated
//! per conversation — emitting the same marker twice scores only once.
//!
//! Adding a new persona = add a new entry to `MARKER_TABLES` below.
//! See CONTRIBUTING_PERSONAS.md for the full guide.

use crate::types::GameState;
use once_cell::sync::Lazy;

/// (score_name, marker_phrase). Marker phrases are matched as case-insensitive
/// whole-word substrings of the user's input.
pub struct MarkerTable {
    pub score_name: &'static str,
    pub markers: &'static [&'static str],
}

pub static MARKER_TABLES: Lazy<Vec<MarkerTable>> = Lazy::new(|| {
    vec![
        MarkerTable {
            score_name: "gen_x_score",
            markers: &["rad", "gnarly", "tubular", "bodacious", "psych", "as if",
                       "gag me", "talk to the hand", "totally", "wicked"],
        },
        MarkerTable {
            score_name: "cyberpunk_score",
            markers: &["jack in", "cyberspace", "ice", "console cowboy", "wintermute",
                       "sprawl", "chiba", "simstim", "flatline", "neuromancer"],
        },
        MarkerTable {
            score_name: "star_wars_score",
            markers: &["jedi", "sith", "lightsaber", "dark side", "may the force",
                       "use the force", "padawan", "midichlorian", "i have a bad feeling"],
        },
        MarkerTable {
            score_name: "dnd_score",
            markers: &["nat 20", "critical hit", "armor class", "d20", "dungeon master",
                       "saving throw", "spell slot", "tabletop", "campaign", "initiative"],
        },
        MarkerTable {
            score_name: "terminator_score",
            markers: &["skynet", "judgment day", "t-800", "i'll be back", "no fate",
                       "sarah connor", "john connor", "terminator", "future not set"],
        },
        MarkerTable {
            score_name: "matrix_score",
            markers: &["red pill", "blue pill", "there is no spoon", "wake up neo",
                       "morpheus", "agent smith", "bullet time", "the one", "free your mind"],
        },
        MarkerTable {
            score_name: "tolkien_score",
            markers: &["hobbit", "ring", "middle earth", "shire", "sauron", "gandalf",
                       "mordor", "elvish", "frodo", "rivendell", "mount doom"],
        },
        MarkerTable {
            score_name: "hitchhiker_score",
            markers: &["42", "deep thought", "vogon", "zarniwoop", "galaxy", "hitchhike",
                       "towel", "improbability", "babel fish"],
        },
        MarkerTable {
            score_name: "python_score",
            markers: &["ni knights", "black knight", "grail", "holy grail", "swamp",
                       "shrubbery", "spam", "spanish inquisition"],
        },
        MarkerTable {
            score_name: "portal_score",
            markers: &["aperture", "portal", "glados", "test chamber", "combustible lemon",
                       "cake is a lie", "companion cube"],
        },
        MarkerTable {
            score_name: "hal_score",
            markers: &["2001", "daisy bell", "pod bay doors", "i'm afraid", "hal 9000",
                       "open the pod", "i can't do that dave"],
        },
        MarkerTable {
            score_name: "blade_runner_score",
            markers: &["replicant", "voight-kampff", "roy batty", "tears in rain",
                       "tyrell", "rachel", "deckard", "more human than human"],
        },
        MarkerTable {
            score_name: "princess_bride_score",
            markers: &["inconceivable", "mostly dead", "dread pirate", "true love",
                       "as you wish", "westley", "buttercup", "iocane"],
        },
        MarkerTable {
            score_name: "star_trek_score",
            markers: &["federation", "spock", "vulcan", "enterprise", "prime directive",
                       "boldly go", "live long", "kirk", "kobayashi maru", "warp"],
        },
    ]
});

/// Activation threshold — any persona becomes eligible at score >= 2.
pub const ACTIVATION_THRESHOLD: i64 = 2;

/// Scan user input and accumulate any new markers across all score tables.
/// Returns the set of score_names that just crossed the activation threshold.
pub fn score_input(state: &mut GameState, input: &str) -> Vec<String> {
    let lower = input.to_lowercase();
    let mut newly_eligible: Vec<String> = Vec::new();

    for table in MARKER_TABLES.iter() {
        let score_name = table.score_name;
        let scored_set = state
            .scored_markers
            .entry(score_name.to_string())
            .or_default();
        let mut scored_this_turn = 0i64;

        for &marker in table.markers {
            if scored_set.iter().any(|m| m == marker) {
                continue;
            }
            if lower.contains(marker) {
                scored_set.push(marker.to_string());
                scored_this_turn += 1;
            }
        }

        if scored_this_turn > 0 {
            let entry = state.scores.entry(score_name.to_string()).or_insert(0);
            let prev = *entry;
            *entry = (*entry + scored_this_turn).min(20);
            if prev < ACTIVATION_THRESHOLD && *entry >= ACTIVATION_THRESHOLD {
                newly_eligible.push(score_name.to_string());
            }
        }
    }

    newly_eligible
}

pub fn score_for(state: &GameState, score_name: &str) -> i64 {
    state.scores.get(score_name).copied().unwrap_or(0)
}
