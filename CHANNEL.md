# Channels — Typed Message Passing

A CHANNEL is a named, typed message bus backed by SQLite. Channels let different parts of an Agicore app (or different apps sharing a database) publish and consume typed messages in a decoupled way. Unlike direct Tauri command calls (which are synchronous request/response), channels are persistent queues — messages survive app restarts and can be processed later.

---

## Declaring a Channel

Channels reference a PACKET type that defines the message schema. Declare the PACKET first:

```agi
PACKET AnalysisResult {
  FIELDS {
    business_id   INTEGER  REQUIRED
    analysis_type TEXT     REQUIRED
    summary       TEXT     REQUIRED
    flags         TEXT
    severity      TEXT
  }
  TTL 86400
}

CHANNEL advisor_results {
  DESCRIPTION "Results from AI advisor actions, queued for dashboard display"
  PACKET      AnalysisResult
  PROTOCOL    local
  DIRECTION   outbound
  RETRY       3
  TIMEOUT     30000
}
```

### CHANNEL fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | Human-readable description |
| `PACKET` | Yes | The PACKET declaration this channel carries |
| `PROTOCOL` | No | `local` (default), `http`, `websocket` |
| `DIRECTION` | No | `outbound`, `inbound`, `bidirectional` (default) |
| `RETRY` | No | Retry count on send failure (default: 3) |
| `TIMEOUT` | No | Timeout in milliseconds (default: 30000) |
| `AUTHORITY` | No | AUTHORITY declaration for signed/verified channels |
| `ENDPOINT` | No | Remote endpoint URL (for non-local protocols) |
| `ORDERING` | No | `fifo`, `priority`, `unordered` |
| `DEAD_LETTER` | No | Channel name to route failed messages to |

### PACKET fields

| Field | Required | Description |
|-------|----------|-------------|
| `FIELDS` | Yes | Field definitions (same syntax as ENTITY FIELDS) |
| `TTL` | No | Time-to-live in seconds; messages expire after this |
| `SIGNING` | No | `none` (default), `required`, `optional` |
| `VALIDATION` | No | Validation rule string |

---

## What gets generated

### `migrations/channels.sql`

```sql
CREATE TABLE IF NOT EXISTS channel_messages (
  id           TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  packet_type  TEXT,
  payload      TEXT NOT NULL,          -- JSON-serialized packet
  status       TEXT NOT NULL DEFAULT 'pending',
  published_at TEXT NOT NULL,
  processed_at TEXT,
  expires_at   TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel
  ON channel_messages(channel_name, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_status
  ON channel_messages(status, channel_name);
```

All channels share one table, partitioned by `channel_name`. Status values: `pending`, `processed`.

### `src-tauri/src/commands/channel.rs`

Generated Tauri commands:

| Command | Description |
|---------|-------------|
| `publish_channel_message` | Publish a message to a named channel; emits `channel-message` Tauri event |
| `list_channel_messages` | List messages for a channel, with optional status filter and limit |
| `list_all_channels` | List all declared channels with message counts and last-message timestamp |
| `clear_channel` | Delete all messages from a channel; returns deleted count |
| `mark_message_processed` | Mark a message as processed (moves it out of the pending queue) |

The `publish_channel_message` command also fires a Tauri event (`channel-message`) so any listening React component updates in real time.

### `src/components/ChannelView.tsx` *(protected)*

A monitoring UI showing all declared channels with message counts and live updates. Generated with `// @agicore-protected` — customize freely.

---

## Publishing and consuming from TypeScript

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Publish a message
await invoke('publish_channel_message', {
  channel: 'advisor_results',
  packetType: 'AnalysisResult',
  payload: JSON.stringify({
    businessId: 1,
    analysisType: 'finance',
    summary: 'LTV:CAC ratio is healthy at 3.2. Cash runway is 9 months.',
    flags: null,
    severity: null,
  }),
  ttlSeconds: 86400,  // optional, overrides PACKET TTL
});

// Read pending messages
const messages = await invoke<ChannelMessage[]>('list_channel_messages', {
  channel: 'advisor_results',
  limit: 20,
  statusFilter: 'pending',
});

// Mark processed after handling
await invoke('mark_message_processed', { id: messages[0].id });

// Listen for real-time updates (Tauri event fired on every publish)
const unlisten = await listen('channel-message', (event) => {
  const msg = event.payload as ChannelMessage;
  console.log('New message on', msg.channelName, msg.payload);
});

// Cleanup
unlisten();
```

### TypeScript types (generated)

```typescript
export interface ChannelMessage {
  id: string;
  channelName: string;
  packetType: string | null;
  payload: string;      // JSON string — parse to your packet type
  status: 'pending' | 'processed';
  publishedAt: string;
  processedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ChannelSummary {
  name: string;
  description: string;
  protocol: string;
  direction: string;
  packet: string;
  totalMessages: number;
  pendingMessages: number;
  lastMessageAt: string | null;
}
```

---

## Relationship to EVENT and TRIGGER

| Declaration | What it models |
|-------------|---------------|
| `CHANNEL` | A persistent named queue for typed messages (SQLite-backed) |
| `PACKET` | The schema of a message — what fields a channel message carries |
| `EVENT` | A business event that happened — may be scheduled (cron) or data-driven |
| `TRIGGER` | A binding: when an event fires on a channel, run a workflow or reasoner |

The typical wiring:

```agi
## 1. Define the message schema
PACKET HealthAlert {
  FIELDS {
    rule_name TEXT REQUIRED
    flag      TEXT REQUIRED
    severity  TEXT REQUIRED
  }
}

## 2. Define the channel that carries it
CHANNEL health_alerts {
  DESCRIPTION "Business health rule violations"
  PACKET      HealthAlert
  PROTOCOL    local
  DIRECTION   outbound
}

## 3. Define an event that fires when messages arrive
EVENT health_alert_received {
  DESCRIPTION "Fires when a new health alert is published"
  SUBSCRIBERS [finance_advisor]
}

## 4. Bind the event to a workflow via TRIGGER
TRIGGER health_alert_trigger {
  DESCRIPTION "Route critical alerts to advisor workflows"
  WHEN {
    CHANNEL [health_alerts]
    FILTER  "severity == 'critical'"
  }
  FIRES WORKFLOW health_escalation
}
```

---

## Cross-app channels

For two Agicore apps to communicate via channels, both must use the **same database file** (uncommon for app databases, practical for a shared channels database). The more typical cross-app pattern uses the Vault (see VAULT.md) for content assets and the Macro Registry (see MACROS.md, coming in Phase 13) for capability invocation.

Channels are best suited for **intra-app** decoupled messaging: an AI action publishes results to a channel, and a dashboard component reads from it without tight coupling to the action that produced the data.

---

## When to use a CHANNEL vs. direct store update

| Use a CHANNEL when | Use direct store update when |
|-------------------|------------------------------|
| The producer and consumer are loosely coupled | The action directly updates UI state |
| Messages need to persist across app restarts | The result is ephemeral (one-shot display) |
| Multiple consumers may read the same message | Exactly one component cares about the result |
| You need ordered, durable delivery | You need immediate, synchronous update |
| You want a history / audit trail of results | History is not required |
