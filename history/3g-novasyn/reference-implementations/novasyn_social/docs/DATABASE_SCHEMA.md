# NovaSyn Social — Database Schema

**Database**: `social.db` (SQLite, WAL mode)
**Migration**: `001_social_core.sql`
**Tables**: 10

---

## 1. settings

App settings key/value store for user preferences and configuration.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| key | TEXT | PRIMARY KEY | — |
| value | TEXT | NOT NULL | — |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Indexes**: None (PK on `key`)
**Foreign Keys**: None

---

## 2. accounts

Connected platform accounts for message ingestion (Gmail, LinkedIn, YouTube, Twitter, etc.).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| platform | TEXT | NOT NULL | — |
| account_name | TEXT | NOT NULL | — |
| account_handle | TEXT | — | `NULL` |
| auth_token | TEXT | — | `NULL` |
| refresh_token | TEXT | — | `NULL` |
| token_expires_at | TEXT | — | `NULL` |
| is_active | INTEGER | NOT NULL | `1` |
| last_sync_at | TEXT | — | `NULL` |
| sync_status | TEXT | NOT NULL | `'idle'` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Indexes**:
- `idx_accounts_platform` ON (`platform`)

**Foreign Keys**: None

---

## 3. threads

Conversation thread grouping to link related messages together.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| external_thread_id | TEXT | UNIQUE | — |
| account_id | INTEGER | NOT NULL, FK | — |
| channel_type | TEXT | NOT NULL | — |
| subject | TEXT | — | `NULL` |
| participant_count | INTEGER | NOT NULL | `2` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Indexes**:
- `idx_threads_account` ON (`account_id`)
- `idx_threads_channel` ON (`channel_type`)

**Foreign Keys**:
- `account_id` REFERENCES `accounts(id)` ON DELETE CASCADE

---

## 4. messages

Unified inbox of all communications across all connected platforms. Core table of the application.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| external_id | TEXT | UNIQUE | — |
| thread_id | INTEGER | FK | `NULL` |
| account_id | INTEGER | FK | `NULL` |
| channel_type | TEXT | NOT NULL | — |
| direction | TEXT | NOT NULL | — |
| sender_name | TEXT | — | `NULL` |
| sender_handle | TEXT | — | `NULL` |
| subject | TEXT | — | `NULL` |
| body | TEXT | NOT NULL | — |
| priority_score | INTEGER | NOT NULL | `50` |
| is_read | INTEGER | NOT NULL | `0` |
| is_archived | INTEGER | NOT NULL | `0` |
| is_starred | INTEGER | NOT NULL | `0` |
| ingestion_status | TEXT | NOT NULL | `'raw'` |
| raw_metadata | TEXT | — | `NULL` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `external_id`: Platform-specific message ID, UNIQUE to prevent duplicate ingestion
- `channel_type`: One of `email`, `linkedin_dm`, `linkedin_comment`, `youtube_comment`, `twitter_dm`, `twitter_reply`, `manual`
- `direction`: `inbound` or `outbound`
- `priority_score`: 0-100, higher = more important. Default 50 (medium).
- `ingestion_status`: `raw`, `classified`, `drafted`, `responded`
- `raw_metadata`: JSON blob of platform-specific data

**Indexes**:
- `idx_messages_channel` ON (`channel_type`)
- `idx_messages_priority` ON (`priority_score` DESC)
- `idx_messages_read` ON (`is_read`)
- `idx_messages_archived` ON (`is_archived`)
- `idx_messages_created` ON (`created_at` DESC)
- `idx_messages_thread` ON (`thread_id`)
- `idx_messages_account` ON (`account_id`)

**Foreign Keys**:
- `thread_id` REFERENCES `threads(id)` ON DELETE SET NULL
- `account_id` REFERENCES `accounts(id)` ON DELETE SET NULL

---

## 5. classifications

AI-generated message metadata including opportunity type, sentiment, and hostility assessment. One classification per message.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| message_id | INTEGER | NOT NULL, FK, UNIQUE | — |
| opportunity_type | TEXT | NOT NULL | — |
| sentiment | TEXT | NOT NULL | — |
| intent | TEXT | NOT NULL | — |
| topic_alignment | REAL | NOT NULL | `0.0` |
| hostility_level | TEXT | NOT NULL | `'none'` |
| confidence | REAL | NOT NULL | — |
| explanation | TEXT | — | `NULL` |
| model_used | TEXT | NOT NULL | — |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `opportunity_type`: e.g., `collaboration`, `sales_lead`, `support_request`, `engagement`, `threat`, `spam`, `other`
- `sentiment`: `positive`, `neutral`, `negative`, `mixed`
- `intent`: `question`, `request`, `feedback`, `complaint`, `praise`, `debate`, `attack`, `other`
- `topic_alignment`: 0.0-1.0, how aligned the message is with user's known topics
- `hostility_level`: `none`, `low`, `medium`, `high`, `extreme`
- `confidence`: 0.0-1.0, AI confidence in the classification

**Indexes**:
- `idx_classifications_message` ON (`message_id`) — UNIQUE constraint also creates implicit index
- `idx_classifications_opportunity` ON (`opportunity_type`)
- `idx_classifications_hostility` ON (`hostility_level`)

**Foreign Keys**:
- `message_id` REFERENCES `messages(id)` ON DELETE CASCADE

---

## 6. drafts

AI-generated response drafts. Multiple drafts can exist per message (different response modes or regenerations).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| message_id | INTEGER | NOT NULL, FK | — |
| response_mode | TEXT | NOT NULL | — |
| draft_text | TEXT | NOT NULL | — |
| confidence | REAL | NOT NULL | — |
| rationale | TEXT | — | `NULL` |
| model_used | TEXT | NOT NULL | — |
| is_accepted | INTEGER | NOT NULL | `0` |
| is_sent | INTEGER | NOT NULL | `0` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `response_mode`: `standard`, `agree_amplify`, `educate`, `battle`
- `confidence`: 0.0-1.0, AI confidence in draft quality
- `rationale`: AI explanation for why it chose this phrasing/approach
- `is_accepted`: Whether the user accepted this draft
- `is_sent`: Whether this draft was actually sent to the platform

**Indexes**:
- `idx_drafts_message` ON (`message_id`)
- `idx_drafts_mode` ON (`response_mode`)
- `idx_drafts_accepted` ON (`is_accepted`)

**Foreign Keys**:
- `message_id` REFERENCES `messages(id)` ON DELETE CASCADE

---

## 7. feedback_events

User edits captured as training signal for SPC and style learning. One event per draft interaction (accept, edit, or reject).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| draft_id | INTEGER | NOT NULL, FK | — |
| final_text | TEXT | — | `NULL` |
| edit_distance | INTEGER | NOT NULL | `0` |
| edit_classification | TEXT | NOT NULL | — |
| user_rating | INTEGER | — | `NULL` |
| was_accepted | INTEGER | NOT NULL | `0` |
| was_sent | INTEGER | NOT NULL | `0` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `final_text`: The text after user edits (NULL if rejected without editing)
- `edit_distance`: Levenshtein distance between draft and final text
- `edit_classification`: `accepted_as_is`, `light_edit`, `heavy_edit`, `rejected`
- `user_rating`: Optional 1-5 rating of draft quality

**Indexes**:
- `idx_feedback_draft` ON (`draft_id`)
- `idx_feedback_classification` ON (`edit_classification`)

**Foreign Keys**:
- `draft_id` REFERENCES `drafts(id)` ON DELETE CASCADE

---

## 8. spc_metrics

Statistical Process Control tracking per channel/mode combination. Stores control chart data for automation tier decisions.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| channel_type | TEXT | NOT NULL | — |
| response_mode | TEXT | NOT NULL | — |
| acceptance_rate | REAL | NOT NULL | `0.0` |
| light_edit_rate | REAL | NOT NULL | `0.0` |
| heavy_edit_rate | REAL | NOT NULL | `0.0` |
| misclassification_rate | REAL | NOT NULL | `0.0` |
| sample_size | INTEGER | NOT NULL | `0` |
| control_state | TEXT | NOT NULL | `'insufficient_data'` |
| ucl | REAL | — | `NULL` |
| lcl | REAL | — | `NULL` |
| mean_value | REAL | — | `NULL` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `channel_type` + `response_mode`: UNIQUE pair — one SPC record per combination
- `acceptance_rate`: Proportion of drafts accepted (0.0-1.0)
- `light_edit_rate`: Proportion of accepted drafts with minor edits
- `heavy_edit_rate`: Proportion of accepted drafts with major edits
- `misclassification_rate`: Proportion of classifications the user corrected
- `control_state`: `insufficient_data`, `in_control`, `warning`, `out_of_control`
- `ucl`: Upper Control Limit (3-sigma)
- `lcl`: Lower Control Limit (3-sigma)
- `mean_value`: Center line of the control chart

**Indexes**:
- `idx_spc_channel_mode` ON (`channel_type`, `response_mode`) — UNIQUE constraint

**Foreign Keys**: None

---

## 9. automation_tiers

Current automation level per channel/mode combination. Determines whether drafts auto-send or require manual approval.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| channel_type | TEXT | NOT NULL | — |
| response_mode | TEXT | NOT NULL | — |
| current_tier | INTEGER | NOT NULL | `0` |
| reason | TEXT | — | `NULL` |
| updated_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `channel_type` + `response_mode`: UNIQUE pair — one tier record per combination
- `current_tier`: 0 (manual), 1 (assisted), 2 (auto low-risk), 3 (autonomous)
- `reason`: Human-readable explanation for current tier level (e.g., "95% acceptance over 120 samples")
- Battle mode (`response_mode = 'battle'`) is permanently locked to Tier 0

**Indexes**:
- `idx_tiers_channel_mode` ON (`channel_type`, `response_mode`) — UNIQUE constraint

**Foreign Keys**: None

---

## 10. ai_log

AI usage tracking for cost monitoring and debugging. Every AI API call is logged here.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | — |
| model_id | TEXT | NOT NULL | — |
| provider | TEXT | NOT NULL | — |
| operation | TEXT | NOT NULL | — |
| input_tokens | INTEGER | NOT NULL | `0` |
| output_tokens | INTEGER | NOT NULL | `0` |
| cost | REAL | NOT NULL | `0.0` |
| created_at | TEXT | NOT NULL | `CURRENT_TIMESTAMP` |

**Column Notes**:
- `model_id`: Specific model identifier (e.g., `claude-sonnet-4-20250514`, `gpt-4o`)
- `provider`: `anthropic`, `openai`, `google`, `xai`, `babyai`
- `operation`: `classify`, `draft_standard`, `draft_agree_amplify`, `draft_educate`, `draft_battle`, `embed`, `other`
- `cost`: Estimated cost in USD

**Indexes**:
- `idx_ai_log_provider` ON (`provider`)
- `idx_ai_log_operation` ON (`operation`)
- `idx_ai_log_created` ON (`created_at` DESC)

**Foreign Keys**: None

---

## Entity Relationship Summary

```
accounts ──┬──< threads
            │
            └──< messages ──< drafts ──< feedback_events
                    │
                    └──── classifications (1:1)

spc_metrics         (standalone, keyed by channel_type + response_mode)
automation_tiers    (standalone, keyed by channel_type + response_mode)
ai_log              (standalone, append-only)
settings            (standalone, key-value)
```

## Key Constraints
- `messages.external_id` is UNIQUE — prevents duplicate ingestion from platform APIs
- `classifications.message_id` is UNIQUE — enforces one classification per message
- `spc_metrics(channel_type, response_mode)` is UNIQUE — one SPC record per combo
- `automation_tiers(channel_type, response_mode)` is UNIQUE — one tier per combo
- CASCADE deletes: deleting an account cascades to threads; deleting a message cascades to classifications and drafts; deleting a draft cascades to feedback_events
- SET NULL: deleting an account or thread sets the FK on messages to NULL (messages survive account disconnection)
