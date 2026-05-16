// CHANNEL runtime — typed message passing with PACKET validation

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use crate::db::DbPool;

// ─── PACKET validation engine ─────────────────────────────────────────────────

struct PacketFieldDef {
    name: &'static str,
    type_: &'static str,   // "string" | "number" | "boolean" | "object" | "array"
    required: bool,
}

struct PacketValidationRuleDef {
    name: &'static str,
    condition: &'static str, // e.g. "output.length > 0", "confidence > 0.5"
}

struct PacketSchemaDef {
    name: &'static str,
    fields: &'static [PacketFieldDef],
    rules: &'static [PacketValidationRuleDef],
    ttl_seconds: Option<i64>,
}

struct ChannelPacketMapping {
    channel_name: &'static str,
    packet_name: &'static str,
}

const PACKET_SCHEMAS: &[PacketSchemaDef] = &[
    PacketSchemaDef {
        name: "SummaryRequest",
        fields: &[
            PacketFieldDef { name: "reason", type_: "string", required: false },
        ],
        rules: &[],
        ttl_seconds: Some(3600),
    },
    PacketSchemaDef {
        name: "GapAnalysisRequest",
        fields: &[
            PacketFieldDef { name: "context", type_: "string", required: false },
        ],
        rules: &[],
        ttl_seconds: Some(3600),
    },
    PacketSchemaDef {
        name: "SessionSummaryRequest",
        fields: &[
            PacketFieldDef { name: "session_id", type_: "string", required: false },
        ],
        rules: &[],
        ttl_seconds: Some(3600),
    },
    PacketSchemaDef {
        name: "ReasonerOutput",
        fields: &[
            PacketFieldDef { name: "reasoner_name", type_: "string", required: false },
            PacketFieldDef { name: "output", type_: "string", required: true },
        ],
        rules: &[
            PacketValidationRuleDef { name: "has_content", condition: "output.length > 0" },
        ],
        ttl_seconds: Some(86400),
    },
];

const CHANNEL_PACKETS: &[ChannelPacketMapping] = &[
    ChannelPacketMapping { channel_name: "summary_request",         packet_name: "SummaryRequest" },
    ChannelPacketMapping { channel_name: "gap_analysis_request",    packet_name: "GapAnalysisRequest" },
    ChannelPacketMapping { channel_name: "session_summary_request", packet_name: "SessionSummaryRequest" },
    ChannelPacketMapping { channel_name: "analysis_ready",          packet_name: "ReasonerOutput" },
];

fn resolve_json_field<'a>(val: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    // Supports simple dotted paths: "output", "user.id"
    let parts: Vec<&str> = path.split('.').collect();
    let mut cur = val;
    for part in &parts {
        cur = cur.get(part)?;
    }
    Some(cur)
}

fn evaluate_condition(payload: &serde_json::Value, condition: &str) -> bool {
    // Handles: "field op value" and "field.length op value"
    let tokens: Vec<&str> = condition.splitn(3, ' ').collect();
    if tokens.len() != 3 { return true; } // unparseable → pass
    let (field_expr, op, expected) = (tokens[0], tokens[1], tokens[2]);

    // field.length shortcut
    let (field_path, use_length) = if field_expr.ends_with(".length") {
        (&field_expr[..field_expr.len() - 7], true)
    } else {
        (field_expr, false)
    };

    let field_val = match resolve_json_field(payload, field_path) {
        Some(v) => v,
        None => return op == "==" && expected == "null",
    };

    let lhs: f64 = if use_length {
        match field_val {
            serde_json::Value::String(s) => s.len() as f64,
            serde_json::Value::Array(a)  => a.len() as f64,
            _                            => 0.0,
        }
    } else {
        match field_val {
            serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
            serde_json::Value::Bool(b)   => if *b { 1.0 } else { 0.0 },
            serde_json::Value::String(s) => s.parse::<f64>().unwrap_or(0.0),
            serde_json::Value::Null      => return op == "==" && expected == "null",
            _                            => 0.0,
        }
    };

    let rhs: f64 = expected.parse::<f64>().unwrap_or(0.0);
    match op {
        ">"  => lhs > rhs,
        "<"  => lhs < rhs,
        ">=" => lhs >= rhs,
        "<=" => lhs <= rhs,
        "==" => (lhs - rhs).abs() < f64::EPSILON,
        "!=" => (lhs - rhs).abs() >= f64::EPSILON,
        _    => true,
    }
}

fn validate_packet_payload(schema: &PacketSchemaDef, payload: &str) -> Vec<String> {
    let mut errors: Vec<String> = Vec::new();

    // Parse payload as JSON — plain strings are allowed and treated as { value: "..." }
    let json: serde_json::Value = match serde_json::from_str(payload) {
        Ok(v) => v,
        Err(_) => {
            // Non-JSON payload: only validate if there are required fields
            let has_required = schema.fields.iter().any(|f| f.required);
            if has_required {
                errors.push("Payload is not valid JSON; required fields cannot be validated".to_string());
            }
            return errors;
        }
    };

    // Field presence and type validation
    for field in schema.fields {
        match resolve_json_field(&json, field.name) {
            None => {
                if field.required {
                    errors.push(format!("Required field '{}' is missing", field.name));
                }
            }
            Some(val) => {
                let type_ok = match field.type_ {
                    "string"  => val.is_string(),
                    "number"  => val.is_number(),
                    "boolean" => val.is_boolean(),
                    "object"  => val.is_object(),
                    "array"   => val.is_array(),
                    _         => true,
                };
                if !type_ok {
                    errors.push(format!(
                        "Field '{}' expected type '{}' but got '{}'",
                        field.name, field.type_,
                        match val {
                            serde_json::Value::String(_)  => "string",
                            serde_json::Value::Number(_)  => "number",
                            serde_json::Value::Bool(_)    => "boolean",
                            serde_json::Value::Object(_)  => "object",
                            serde_json::Value::Array(_)   => "array",
                            serde_json::Value::Null       => "null",
                        }
                    ));
                }
            }
        }
    }

    // Validation rules
    for rule in schema.rules {
        if !evaluate_condition(&json, rule.condition) {
            errors.push(format!("Validation rule '{}' failed: {}", rule.name, rule.condition));
        }
    }

    errors
}

pub fn validate_channel_message(channel: &str, packet_type: Option<&str>, payload: &str) -> Vec<String> {
    // Find schema: prefer explicit packet_type, fall back to channel mapping
    let schema_name = packet_type.or_else(|| {
        CHANNEL_PACKETS.iter()
            .find(|m| m.channel_name == channel)
            .map(|m| m.packet_name)
    });

    let schema_name = match schema_name {
        Some(s) => s,
        None => return vec![], // no schema registered → always valid
    };

    let schema = match PACKET_SCHEMAS.iter().find(|s| s.name == schema_name) {
        Some(s) => s,
        None => return vec![], // unknown schema → always valid (forward-compatible)
    };

    validate_packet_payload(schema, payload)
}

fn schema_ttl_for_channel(channel: &str, packet_type: Option<&str>) -> Option<i64> {
    let schema_name = packet_type.or_else(|| {
        CHANNEL_PACKETS.iter()
            .find(|m| m.channel_name == channel)
            .map(|m| m.packet_name)
    })?;
    PACKET_SCHEMAS.iter()
        .find(|s| s.name == schema_name)
        .and_then(|s| s.ttl_seconds)
}

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMessage {
    pub id: String,
    pub channel_name: String,
    pub packet_type: Option<String>,
    pub payload: String,
    pub status: String,
    pub published_at: String,
    pub processed_at: Option<String>,
    pub expires_at: Option<String>,
    pub validation_errors: Option<String>,
    pub created_at: String,
}

impl ChannelMessage {
    pub fn from_row(row: &rusqlite::Row) -> Self {
        Self {
            id: row.get("id").unwrap(),
            channel_name: row.get("channel_name").unwrap(),
            packet_type: row.get("packet_type").ok(),
            payload: row.get("payload").unwrap(),
            status: row.get("status").unwrap(),
            published_at: row.get("published_at").unwrap(),
            processed_at: row.get("processed_at").ok(),
            expires_at: row.get("expires_at").ok(),
            validation_errors: row.get("validation_errors").ok(),
            created_at: row.get("created_at").unwrap(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelSummary {
    pub name: String,
    pub total_messages: i64,
    pub pending_messages: i64,
    pub rejected_messages: i64,
    pub last_message_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketSchemaInfo {
    pub name: String,
    pub channel: Option<String>,
    pub fields: Vec<PacketFieldInfo>,
    pub rules: Vec<String>,
    pub ttl_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PacketFieldInfo {
    pub name: String,
    pub type_: String,
    pub required: bool,
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/// Publish a message to a channel with PACKET validation.
/// Invalid messages are stored with `status = 'rejected'` rather than rejected entirely,
/// so they appear in the audit log. Trigger dispatcher skips non-'pending' messages.
pub fn publish_message_internal(
    db: &DbPool,
    channel: &str,
    packet_type: Option<&str>,
    payload: &str,
    ttl_seconds: Option<i64>,
) -> Result<ChannelMessage, String> {
    // Validate against packet schema
    let errors = validate_channel_message(channel, packet_type, payload);
    let status = if errors.is_empty() { "pending" } else { "rejected" };
    let errors_json = if errors.is_empty() {
        None
    } else {
        Some(serde_json::to_string(&errors).unwrap_or_default())
    };

    // Use schema TTL if caller didn't supply one
    let effective_ttl = ttl_seconds.or_else(|| schema_ttl_for_channel(channel, packet_type));

    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let expires_at = effective_ttl.map(|ttl| {
        (chrono::Utc::now() + chrono::Duration::seconds(ttl)).to_rfc3339()
    });

    conn.execute(
        "INSERT INTO channel_messages (id, channel_name, packet_type, payload, status, published_at, expires_at, validation_errors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![id, channel, packet_type, payload, status, now, expires_at, errors_json, now],
    ).map_err(|e| e.to_string())?;

    // Log validation failures for audit
    if !errors.is_empty() {
        let log_id = uuid::Uuid::new_v4().to_string();
        let schema_name = packet_type.or_else(|| {
            CHANNEL_PACKETS.iter().find(|m| m.channel_name == channel).map(|m| m.packet_name)
        }).unwrap_or("unknown");
        let _ = conn.execute(
            "INSERT INTO packet_validation_log (id, channel_name, packet_type, payload, errors, validated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![log_id, channel, schema_name, payload, errors_json, now, now],
        );
    }

    Ok(ChannelMessage {
        id,
        channel_name: channel.to_string(),
        packet_type: packet_type.map(|s| s.to_string()),
        payload: payload.to_string(),
        status: status.to_string(),
        published_at: now.clone(),
        processed_at: None,
        expires_at,
        validation_errors: errors_json,
        created_at: now,
    })
}

/// Mark a message as processed (called by trigger dispatcher after firing).
pub fn mark_processed_internal(db: &DbPool, id: &str) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE channel_messages SET status = 'processed', processed_at = ? WHERE id = ?",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn publish_channel_message(
    channel: String,
    packet_type: Option<String>,
    payload: String,
    ttl_seconds: Option<i64>,
    app: AppHandle,
    db: State<'_, DbPool>,
) -> Result<ChannelMessage, String> {
    let msg = publish_message_internal(
        &db,
        &channel,
        packet_type.as_deref(),
        &payload,
        ttl_seconds,
    )?;
    let _ = app.emit("channel-message", &msg);
    Ok(msg)
}

#[tauri::command]
pub fn list_channel_messages(
    channel: String,
    limit: Option<i64>,
    status_filter: Option<String>,
    db: State<'_, DbPool>,
) -> Result<Vec<ChannelMessage>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);

    let rows = if let Some(status) = status_filter {
        let mut stmt = conn.prepare(
            "SELECT * FROM channel_messages WHERE channel_name = ? AND status = ? ORDER BY published_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![channel, status, lim], |row| {
            Ok(ChannelMessage::from_row(row))
        }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT * FROM channel_messages WHERE channel_name = ? ORDER BY published_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![channel, lim], |row| {
            Ok(ChannelMessage::from_row(row))
        }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    };

    Ok(rows)
}

#[tauri::command]
pub fn list_all_channels(db: State<'_, DbPool>) -> Result<Vec<ChannelSummary>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT channel_name,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                MAX(published_at) as last_at
         FROM channel_messages
         GROUP BY channel_name
         ORDER BY last_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(ChannelSummary {
            name: row.get("channel_name")?,
            total_messages: row.get("total")?,
            pending_messages: row.get("pending")?,
            rejected_messages: row.get("rejected")?,
            last_message_at: row.get("last_at").ok(),
        })
    }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn list_packet_schemas() -> Vec<PacketSchemaInfo> {
    PACKET_SCHEMAS.iter().map(|schema| {
        let channel = CHANNEL_PACKETS.iter()
            .find(|m| m.packet_name == schema.name)
            .map(|m| m.channel_name.to_string());
        PacketSchemaInfo {
            name: schema.name.to_string(),
            channel,
            fields: schema.fields.iter().map(|f| PacketFieldInfo {
                name: f.name.to_string(),
                type_: f.type_.to_string(),
                required: f.required,
            }).collect(),
            rules: schema.rules.iter().map(|r| format!("{}: {}", r.name, r.condition)).collect(),
            ttl_seconds: schema.ttl_seconds,
        }
    }).collect()
}

#[tauri::command]
pub fn list_validation_failures(
    channel: Option<String>,
    limit: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);
    let rows = if let Some(ch) = channel {
        let mut stmt = conn.prepare(
            "SELECT id, channel_name, packet_type, payload, errors, validated_at FROM packet_validation_log WHERE channel_name = ? ORDER BY validated_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map(rusqlite::params![ch, lim], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "channelName": row.get::<_, String>(1)?,
                "packetType": row.get::<_, String>(2)?,
                "payload": row.get::<_, String>(3)?,
                "errors": row.get::<_, String>(4)?,
                "validatedAt": row.get::<_, String>(5)?,
            }))
        }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, channel_name, packet_type, payload, errors, validated_at FROM packet_validation_log ORDER BY validated_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([lim], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "channelName": row.get::<_, String>(1)?,
                "packetType": row.get::<_, String>(2)?,
                "payload": row.get::<_, String>(3)?,
                "errors": row.get::<_, String>(4)?,
                "validatedAt": row.get::<_, String>(5)?,
            }))
        }).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}

#[tauri::command]
pub fn clear_channel(channel: String, db: State<'_, DbPool>) -> Result<i64, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count = conn.execute(
        "DELETE FROM channel_messages WHERE channel_name = ?",
        [&channel],
    ).map_err(|e| e.to_string())? as i64;
    Ok(count)
}

#[tauri::command]
pub fn mark_message_processed(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    mark_processed_internal(&db, &id)
}
