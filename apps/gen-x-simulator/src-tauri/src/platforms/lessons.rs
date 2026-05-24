//! Lesson loader — embeds lesson JSON files at compile time so the app
//! ships standalone with no filesystem dependency at runtime.

use crate::types::Lesson;

/// Load every lesson JSON file in `content/<platform_dir>/lessons/` at
/// compile time. Adding a new lesson is a single JSON file + a single
/// `include_str!` line here.
pub fn lessons_for(platform: &str) -> Vec<Lesson> {
    match platform {
        "Commodore64" => c64_lessons(),
        _ => Vec::new(),
    }
}

fn c64_lessons() -> Vec<Lesson> {
    let sources: &[&str] = &[
        include_str!("../../content/c64/lessons/01_multiplication.json"),
    ];
    sources
        .iter()
        .filter_map(|s| serde_json::from_str(s).ok())
        .collect()
}
