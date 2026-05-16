// PACKET codegen — emits typed validation engine, migration, and schema registry

import type { AgiFile, PacketDecl, PacketField, PacketValidationRule } from '@agicore/parser';

export function generatePacket(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.packets.length === 0) return files;

  files.set('src-tauri/src/commands/packet.rs', buildPacketRs(ast));
  files.set('migrations/packets.sql', buildMigrationSql());

  return files;
}

// ─── AgiType → Rust type string ───────────────────────────────────────────────

function agiTypeToValidatorStr(type_: unknown): string {
  if (typeof type_ === 'string') {
    switch (type_) {
      case 'string': return 'string';
      case 'int':
      case 'float':
      case 'number': return 'number';
      case 'bool':
      case 'boolean': return 'boolean';
      default: return 'string';
    }
  }
  // AgiType objects like { kind: 'list', element: 'string' }
  const t = type_ as { kind?: string };
  if (t?.kind === 'list' || t?.kind === 'array') return 'array';
  if (t?.kind === 'object' || t?.kind === 'map') return 'object';
  return 'string';
}

// ─── Rust runtime ─────────────────────────────────────────────────────────────

function buildPacketRs(ast: AgiFile): string {
  const schemaBlocks = ast.packets.map(p => buildSchemaDef(p)).join('\n');

  // Build channel→packet mappings from CHANNEL declarations
  const channelMappings = ast.channels
    .filter(ch => ch.packet)
    .map(ch => `    ChannelPacketMapping { channel_name: "${ch.name}", packet_name: "${ch.packet}" },`)
    .join('\n');

  return `// PACKET validation engine — typed payload validation for channel messages
// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)

use serde::Serialize;
use tauri::State;
use crate::db::DbPool;

// ─── Validator structures ─────────────────────────────────────────────────────

struct PacketFieldDef {
    name: &'static str,
    type_: &'static str,
    required: bool,
}

struct PacketValidationRuleDef {
    name: &'static str,
    condition: &'static str,
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

// ─── Schema registry ──────────────────────────────────────────────────────────

const PACKET_SCHEMAS: &[PacketSchemaDef] = &[
${schemaBlocks}
];

const CHANNEL_PACKETS: &[ChannelPacketMapping] = &[
${channelMappings}
];

// ─── Validation engine ────────────────────────────────────────────────────────

fn resolve_json_field<'a>(val: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    let parts: Vec<&str> = path.split('.').collect();
    let mut cur = val;
    for part in &parts { cur = cur.get(part)?; }
    Some(cur)
}

fn evaluate_condition(payload: &serde_json::Value, condition: &str) -> bool {
    let tokens: Vec<&str> = condition.splitn(3, ' ').collect();
    if tokens.len() != 3 { return true; }
    let (field_expr, op, expected) = (tokens[0], tokens[1], tokens[2]);
    let (field_path, use_length) = if field_expr.ends_with(".length") {
        (&field_expr[..field_expr.len() - 7], true)
    } else { (field_expr, false) };
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
    match op { ">" => lhs > rhs, "<" => lhs < rhs, ">=" => lhs >= rhs, "<=" => lhs <= rhs,
               "==" => (lhs - rhs).abs() < f64::EPSILON, "!=" => (lhs - rhs).abs() >= f64::EPSILON, _ => true }
}

fn validate_packet_payload(schema: &PacketSchemaDef, payload: &str) -> Vec<String> {
    let mut errors: Vec<String> = Vec::new();
    let json: serde_json::Value = match serde_json::from_str(payload) {
        Ok(v) => v,
        Err(_) => {
            if schema.fields.iter().any(|f| f.required) {
                errors.push("Payload is not valid JSON; required fields cannot be validated".to_string());
            }
            return errors;
        }
    };
    for field in schema.fields {
        match resolve_json_field(&json, field.name) {
            None => { if field.required { errors.push(format!("Required field '{}' is missing", field.name)); } }
            Some(val) => {
                let type_ok = match field.type_ {
                    "string" => val.is_string(), "number" => val.is_number(), "boolean" => val.is_boolean(),
                    "object" => val.is_object(), "array" => val.is_array(), _ => true,
                };
                if !type_ok {
                    let actual = match val {
                        serde_json::Value::String(_) => "string", serde_json::Value::Number(_) => "number",
                        serde_json::Value::Bool(_) => "boolean", serde_json::Value::Object(_) => "object",
                        serde_json::Value::Array(_) => "array", serde_json::Value::Null => "null",
                    };
                    errors.push(format!("Field '{}' expected '{}' but got '{}'", field.name, field.type_, actual));
                }
            }
        }
    }
    for rule in schema.rules {
        if !evaluate_condition(&json, rule.condition) {
            errors.push(format!("Rule '{}' failed: {}", rule.name, rule.condition));
        }
    }
    errors
}

pub fn validate_channel_message(channel: &str, packet_type: Option<&str>, payload: &str) -> Vec<String> {
    let schema_name = packet_type.or_else(|| {
        CHANNEL_PACKETS.iter().find(|m| m.channel_name == channel).map(|m| m.packet_name)
    });
    let schema_name = match schema_name { Some(s) => s, None => return vec![] };
    let schema = match PACKET_SCHEMAS.iter().find(|s| s.name == schema_name) { Some(s) => s, None => return vec![] };
    validate_packet_payload(schema, payload)
}

pub fn schema_ttl_for_channel(channel: &str, packet_type: Option<&str>) -> Option<i64> {
    let schema_name = packet_type.or_else(|| {
        CHANNEL_PACKETS.iter().find(|m| m.channel_name == channel).map(|m| m.packet_name)
    })?;
    PACKET_SCHEMAS.iter().find(|s| s.name == schema_name).and_then(|s| s.ttl_seconds)
}

// ─── Types for commands ───────────────────────────────────────────────────────

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

// ─── Tauri commands ───────────────────────────────────────────────────────────

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
                name: f.name.to_string(), type_: f.type_.to_string(), required: f.required,
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
        let v = stmt.query_map(rusqlite::params![ch, lim], |row| Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?, "channelName": row.get::<_, String>(1)?,
            "packetType": row.get::<_, String>(2)?, "payload": row.get::<_, String>(3)?,
            "errors": row.get::<_, String>(4)?, "validatedAt": row.get::<_, String>(5)?,
        }))).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, channel_name, packet_type, payload, errors, validated_at FROM packet_validation_log ORDER BY validated_at DESC LIMIT ?"
        ).map_err(|e| e.to_string())?;
        let v = stmt.query_map([lim], |row| Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?, "channelName": row.get::<_, String>(1)?,
            "packetType": row.get::<_, String>(2)?, "payload": row.get::<_, String>(3)?,
            "errors": row.get::<_, String>(4)?, "validatedAt": row.get::<_, String>(5)?,
        }))).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        v
    };
    Ok(rows)
}
`;
}

function buildSchemaDef(p: PacketDecl): string {
  const fields = p.payload.map(f => {
    const type_ = agiTypeToValidatorStr(f.type);
    const req = f.required ? 'true' : 'false';
    return `        PacketFieldDef { name: "${f.name}", type_: "${type_}", required: ${req} },`;
  }).join('\n');

  const rules = p.validation.map(r => {
    const cond = r.condition.replace(/"/g, '\\"');
    return `        PacketValidationRuleDef { name: "${r.name}", condition: "${cond}" },`;
  }).join('\n');

  const ttl = p.ttl > 0 ? `Some(${p.ttl})` : 'None';

  return `    PacketSchemaDef {
        name: "${p.name}",
        fields: &[
${fields}
        ],
        rules: &[
${rules}
        ],
        ttl_seconds: ${ttl},
    },`;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function buildMigrationSql(): string {
  return `-- PACKET: validation audit log (channel_messages gets validation_errors column via ALTER TABLE)
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS validation_errors TEXT;

CREATE TABLE IF NOT EXISTS packet_validation_log (
  id TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  packet_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  errors TEXT NOT NULL,
  validated_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_packet_val_channel ON packet_validation_log(channel_name, validated_at DESC);
`;
}
