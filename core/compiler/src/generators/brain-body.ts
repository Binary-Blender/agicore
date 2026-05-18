// BRAIN_BODY Code Generator
// Generates Rust UART framing code for the brain-body protocol.
// The brain (RPi) sends framed binary commands to the body (MCU) over UART.
// Activated when ast.brainBody is declared.

import type { AgiFile, BrainBodyDecl } from '@agicore/parser';

// ── Protocol constants ────────────────────────────────────────────────────────

function generateCommandEnum(commands: string[]): string {
  const entries = commands.map((cmd, i) => `    ${cmd} = ${i + 1},`).join('\n');
  return `#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BrainBodyCommand {
${entries}
}`;
}

// ── Rust UART module ──────────────────────────────────────────────────────────

function generateBrainBodyRs(bb: BrainBodyDecl): string {
  const estopInit = bb.estopGpio
    ? `    // E-stop GPIO: ${bb.estopGpio} — hardware cuts motor power, software cannot override
    // Initialize GPIO ${bb.estopGpio} as input with pull-up before opening UART`
    : `    // No E-stop GPIO declared — add ESTOP field to BRAIN_BODY if needed`;

  const commandEnum = generateCommandEnum(bb.commands);

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Brain-body UART protocol for robot split-architecture.
// Brain (RPi) ←→ Body (MCU) at ${bb.baud} baud, framed binary.
// Mark // @agicore-protected to add custom command implementations.

use std::io::{Read, Write};
use std::time::Duration;

// ── Protocol constants ────────────────────────────────────────────────────────

const BAUD_RATE: u32 = ${bb.baud};
const HEARTBEAT_INTERVAL_MS: u64 = ${bb.heartbeat};
const WATCHDOG_TIMEOUT_MS: u64 = ${bb.watchdog};
const FRAME_START: u8 = 0xAA;
const FRAME_END: u8 = 0x55;

${commandEnum}

// ── Frame format ──────────────────────────────────────────────────────────────
// [0xAA][CMD: u8][LEN: u8][PAYLOAD: LEN bytes][CHECKSUM: u8][0x55]
// Checksum: XOR of CMD + LEN + all PAYLOAD bytes

pub struct BrainBodyFrame {
    pub command: BrainBodyCommand,
    pub payload: Vec<u8>,
}

impl BrainBodyFrame {
    pub fn encode(&self) -> Vec<u8> {
        let cmd = self.command as u8;
        let len = self.payload.len() as u8;
        let mut checksum: u8 = cmd ^ len;
        for b in &self.payload { checksum ^= b; }
        let mut frame = vec![FRAME_START, cmd, len];
        frame.extend_from_slice(&self.payload);
        frame.push(checksum);
        frame.push(FRAME_END);
        frame
    }

    pub fn decode(raw: &[u8]) -> Result<Self, String> {
        if raw.len() < 5 { return Err("Frame too short".into()); }
        if raw[0] != FRAME_START { return Err("Bad frame start".into()); }
        let cmd = raw[1];
        let len = raw[2] as usize;
        if raw.len() < 4 + len { return Err("Frame truncated".into()); }
        let payload = raw[3..3 + len].to_vec();
        let received_checksum = raw[3 + len];
        let mut expected: u8 = cmd ^ (len as u8);
        for b in &payload { expected ^= b; }
        if received_checksum != expected { return Err("Checksum mismatch".into()); }
        if raw[4 + len] != FRAME_END { return Err("Bad frame end".into()); }
        // Map cmd byte to enum — simplified; extend for all commands
        let command = match cmd {
            1 => BrainBodyCommand::${bb.commands[0] ?? 'PING'},
            _ => return Err(format!("Unknown command: {}", cmd)),
        };
        Ok(Self { command, payload })
    }
}

// ── Heartbeat sender ──────────────────────────────────────────────────────────

${estopInit}

pub struct BrainBodyLink {
    // Wrap a serialport or tokio_serial connection here
    // port: Box<dyn serialport::SerialPort>,
}

impl BrainBodyLink {
    pub fn send(&mut self, frame: BrainBodyFrame) -> Result<(), String> {
        let encoded = frame.encode();
        // TODO: write encoded to serial port
        // self.port.write_all(&encoded).map_err(|e| e.to_string())
        let _ = encoded; // suppress unused warning until implemented
        Ok(())
    }

    /// Send heartbeat — body expects this every ${bb.heartbeat}ms.
    /// Missing 3 heartbeats (${bb.watchdog}ms) triggers body safe mode.
    pub fn heartbeat(&mut self) -> Result<(), String> {
        self.send(BrainBodyFrame {
            command: BrainBodyCommand::${bb.commands[0] ?? 'PING'},
            payload: vec![],
        })
    }
}

// ── Tauri commands (wired by lib.rs) ─────────────────────────────────────────

#[tauri::command]
pub async fn brain_body_send(command: String, payload: Vec<u8>) -> Result<(), String> {
    // TODO: route command string to BrainBodyCommand enum, send via BrainBodyLink
    Ok(())
}

#[tauri::command]
pub async fn brain_body_status() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "baud": BAUD_RATE,
        "heartbeat_ms": HEARTBEAT_INTERVAL_MS,
        "watchdog_ms": WATCHDOG_TIMEOUT_MS,
        "status": "disconnected",
    }))
}
`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function generateBrainBody(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (!ast.brainBody) return files;

  files.set('src-tauri/src/embedded/brain_body.rs', generateBrainBodyRs(ast.brainBody));
  return files;
}
