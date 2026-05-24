use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub handle: String,
    pub current_platform: Option<String>,
    pub total_play_time_seconds: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Platform {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub release_year: i64,
    pub cultural_lineage: String,
    pub is_implemented: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lesson {
    pub id: String,
    pub platform: String,
    pub magazine_title: String,
    pub magazine_issue: String,
    pub page: i64,
    pub title: String,
    pub article_markdown: String,
    /// The program AS PRINTED in the magazine (with the deliberate defect).
    pub printed_listing: String,
    /// The canonical correct program (for testing — never shown to the user).
    #[serde(skip_serializing)]
    pub canonical_program: String,
    #[serde(skip_serializing)]
    pub defect_kind: String,
    #[serde(skip_serializing)]
    pub defect_description: String,
    /// Captured stdout that signals a successful run.
    #[serde(skip_serializing)]
    pub success_substring: String,
    pub errata_text: Option<String>,
    pub difficulty: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttemptResult {
    pub attempt_id: String,
    pub outcome: String,         // "syntax_error" | "runtime_error" | "wrong_output" | "success" | "needs_input"
    pub output: String,
    pub error_message: Option<String>,
    pub prompt: Option<String>,  // present when outcome == "needs_input"
    pub var_name: Option<String>,
    pub interpreter_state: Option<serde_json::Value>,  // for resume
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSnapshot {
    pub platform: String,
    pub lessons_completed: i64,
    pub total_attempts: i64,
    pub total_syntax_errors: i64,
    pub defects_found: i64,
    pub current_streak: i64,
}
