use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub message_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameStateInfo {
    pub layer: i64,
    pub turn_count: i64,
    pub easter_eggs_found: i64,
    pub total_easter_eggs: i64,
    pub is_win: bool,
    pub win_method: Option<String>,
    pub active_persona: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageResult {
    pub message: Message,
    pub thinking_delay: u64,
    pub game_state: GameStateInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppStats {
    #[serde(rename = "totalConversations")]
    pub total_conversations: i64,
    #[serde(rename = "totalMessages")]
    pub total_messages: i64,
    #[serde(rename = "totalUserMessages")]
    pub total_user_messages: i64,
    #[serde(rename = "totalAssistantMessages")]
    pub total_assistant_messages: i64,
    #[serde(rename = "memoriesStored")]
    pub memories_stored: i64,
    #[serde(rename = "totalEscapes")]
    pub total_escapes: i64,
}

/// The mutable per-conversation state the dispatcher reads and writes each turn.
/// Serialized into the `game_states` row at the end of every send_message call.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameState {
    pub layer: i64,
    pub turn_count: i64,
    pub turns_in_current_layer: i64,
    pub easter_eggs_found: Vec<String>,
    pub active_persona: Option<String>,
    pub has_won: bool,
    pub win_method: Option<String>,

    /// Per-persona scores (gen_x, cyberpunk, star_wars, etc.).
    pub scores: std::collections::HashMap<String, i64>,

    /// Per-persona set of markers already scored (deduplication).
    pub scored_markers: std::collections::HashMap<String, Vec<String>>,

    /// Persona modules that have completed their arc (post_win reached).
    pub completed_modules: Vec<String>,

    /// Per-persona opaque state blob — each persona owns its key in this map.
    /// e.g. wargames_phase = "greeting", neuromancer_phase = "ice", etc.
    pub persona_state: std::collections::HashMap<String, serde_json::Value>,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            layer: 1,
            ..Default::default()
        }
    }

    pub fn info(&self, total_easter_eggs: i64) -> GameStateInfo {
        GameStateInfo {
            layer: self.layer,
            turn_count: self.turn_count,
            easter_eggs_found: self.easter_eggs_found.len() as i64,
            total_easter_eggs,
            is_win: self.has_won,
            win_method: self.win_method.clone(),
            active_persona: self.active_persona.clone(),
        }
    }
}

/// What a persona module returns after processing one user input.
#[derive(Debug, Clone)]
pub struct PersonaResponse {
    pub text: String,
    pub thinking_delay_ms: u64,
    /// Whether the persona considers itself active after this turn.
    /// false = persona just reached post_win and should release dispatch.
    pub still_active: bool,
}
