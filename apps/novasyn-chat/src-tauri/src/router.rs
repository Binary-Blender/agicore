// Agicore Generated — DO NOT EDIT BY HAND
// Re-run `agicore generate` to regenerate.
// Router commands: broadcast_chat, council_chat

#![allow(unused_variables, dead_code)]

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Window};
use crate::ai_service::ApiKeyStore;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelResult {
    pub model: String,
    pub content: String,
    pub ok: bool,
    pub error: Option<String>,
}

async fn call_anthropic_sync(
    model: &str,
    messages: Vec<serde_json::Value>,
    system: &str,
    api_key: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 4096,
        "stream": false,
        "system": system,
        "messages": messages,
    });
    let res = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    json["content"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("anthropic: unexpected response: {:?}", json))
}

async fn call_openai_compat_sync(
    url: &str,
    model: &str,
    messages: Vec<serde_json::Value>,
    system: &str,
    api_key: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut msgs = vec![serde_json::json!({"role": "system", "content": system})];
    msgs.extend(messages);
    let body = serde_json::json!({
        "model": model,
        "stream": false,
        "messages": msgs,
    });
    let res = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("openai-compat ({}): unexpected response: {:?}", url, json))
}

async fn call_google_sync(
    model: &str,
    messages: Vec<serde_json::Value>,
    system: &str,
    api_key: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let contents: Vec<serde_json::Value> = messages.iter().map(|m| {
        let role = m["role"].as_str().unwrap_or("user");
        let text = m["content"].as_str().unwrap_or("");
        serde_json::json!({
            "role": if role == "assistant" { "model" } else { "user" },
            "parts": [{"text": text}]
        })
    }).collect();
    let body = serde_json::json!({
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 4096}
    });
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("google: unexpected response: {:?}", json))
}

fn provider_from_model(model_id: &str) -> &'static str {
    match model_id {
        "Qwen/Qwen3-8B" | "meta-llama/Llama-3.1-8B-Instruct" | "Qwen/Qwen2.5-Coder-7B-Instruct" => "huggingface",
        m if m.starts_with("claude-") => "anthropic",
        m if m.starts_with("gpt-") => "openai",
        _ => "huggingface",
    }
}

async fn call_model_sync(
    model_id: &str,
    messages: Vec<serde_json::Value>,
    system: String,
    keys: &HashMap<String, String>,
) -> Result<String, String> {
    let provider = provider_from_model(model_id);
    let empty = String::new();
    match provider {
        "anthropic" => {
            let key = keys.get("anthropic").unwrap_or(&empty);
            call_anthropic_sync(model_id, messages, &system, key).await
        }
        "openai" => {
            let key = keys.get("openai").unwrap_or(&empty);
            call_openai_compat_sync(
                "https://api.openai.com/v1/chat/completions",
                model_id, messages, &system, key,
            ).await
        }
        "google" => {
            let key = keys.get("google").unwrap_or(&empty);
            call_google_sync(model_id, messages, &system, key).await
        }
        "xai" => {
            let key = keys.get("xai").unwrap_or(&empty);
            call_openai_compat_sync(
                "https://api.x.ai/v1/chat/completions",
                model_id, messages, &system, key,
            ).await
        }
        _ => {
            // huggingface (free tier via router.huggingface.co)
            let key = keys.get("babyai").unwrap_or(&empty);
            call_openai_compat_sync(
                "https://router.huggingface.co/v1/chat/completions",
                model_id, messages, &system, key,
            ).await
        }
    }
}

// ── broadcast_chat ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BroadcastChatInput {
    pub user_message: String,
    pub model_ids: serde_json::Value,
    pub system_prompt: String,
    pub context_folder_ids: serde_json::Value,
}

#[tauri::command]
pub async fn broadcast_chat(
    input: BroadcastChatInput,
    store: tauri::State<'_, ApiKeyStore>,
) -> Result<serde_json::Value, String> {
    let keys: HashMap<String, String> = {
        let guard = store.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };
    let model_ids: Vec<String> = serde_json::from_value(input.model_ids)
        .map_err(|e| e.to_string())?;

    let mut handles = Vec::new();
    for model_id in model_ids {
        let msg = input.user_message.clone();
        let sys = input.system_prompt.clone();
        let keys_clone = keys.clone();
        let model_clone = model_id.clone();
        handles.push(tokio::spawn(async move {
            let messages = vec![serde_json::json!({"role": "user", "content": msg})];
            match call_model_sync(&model_clone, messages, sys, &keys_clone).await {
                Ok(content) => ModelResult {
                    model: model_clone, content, ok: true, error: None,
                },
                Err(e) => ModelResult {
                    model: model_clone, content: String::new(), ok: false, error: Some(e),
                },
            }
        }));
    }

    let mut results: Vec<ModelResult> = Vec::new();
    for handle in handles {
        results.push(handle.await.map_err(|e| e.to_string())?);
    }

    serde_json::to_value(results).map_err(|e| e.to_string())
}

// ── council_chat ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CouncilChatInput {
    pub user_message: String,
    pub model_ids: serde_json::Value,
    pub system_prompt: String,
    pub synthesis_model: String,
}

#[tauri::command]
pub async fn council_chat(
    input: CouncilChatInput,
    window: Window,
    store: tauri::State<'_, ApiKeyStore>,
) -> Result<serde_json::Value, String> {
    let keys: HashMap<String, String> = {
        let guard = store.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };
    let model_ids: Vec<String> = serde_json::from_value(input.model_ids)
        .map_err(|e| e.to_string())?;

    // Phase 1: fan-out to all models in parallel (non-streaming)
    let mut handles = Vec::new();
    for model_id in &model_ids {
        let msg = input.user_message.clone();
        let sys = input.system_prompt.clone();
        let keys_clone = keys.clone();
        let model_clone = model_id.clone();
        handles.push(tokio::spawn(async move {
            let messages = vec![serde_json::json!({"role": "user", "content": msg})];
            match call_model_sync(&model_clone, messages, sys, &keys_clone).await {
                Ok(content) => ModelResult {
                    model: model_clone, content, ok: true, error: None,
                },
                Err(e) => ModelResult {
                    model: model_clone, content: String::new(), ok: false, error: Some(e),
                },
            }
        }));
    }
    let mut broadcast_results: Vec<ModelResult> = Vec::new();
    for handle in handles {
        broadcast_results.push(handle.await.map_err(|e| e.to_string())?);
    }

    // Phase 2: synthesize — build council prompt, call synthesis model
    let council_parts: Vec<String> = broadcast_results.iter()
        .filter(|r| r.ok)
        .map(|r| format!("## {} responded:\n{}", r.model, r.content))
        .collect();
    let synthesis_prompt = format!(
        "Original question: {}\n\n{}\n\nSynthesize these responses into a single comprehensive answer.",
        input.user_message,
        council_parts.join("\n\n"),
    );
    let synthesis_system = "You are a council synthesizer. Multiple AI models have responded to the same prompt. Provide a clear, comprehensive synthesis that captures the best insights from each.";
    let synthesis_messages = vec![serde_json::json!({"role": "user", "content": synthesis_prompt})];
    let synthesis = call_model_sync(
        &input.synthesis_model,
        synthesis_messages,
        synthesis_system.to_string(),
        &keys,
    ).await.unwrap_or_else(|e| format!("[Synthesis failed: {}]", e));

    // Emit a council-result event so the frontend can update the UI
    window.emit("council-result", serde_json::json!({
        "synthesis": synthesis,
        "results": broadcast_results,
    })).ok();

    serde_json::to_value(serde_json::json!({
        "synthesis": synthesis,
        "results": broadcast_results,
    })).map_err(|e| e.to_string())
}
