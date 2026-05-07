# NovaSyn Council — Database Schema

## Overview

All data stored in a single SQLite database at `%APPDATA%/NovaSyn/council.db`. Migrations in `src/main/database/migrations/` auto-apply on launch in filename order.

## Tables

### settings
App settings (key-value).

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | Setting name |
| value | TEXT | JSON-encoded value |

### personas
Core persona definitions.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Display name |
| role | TEXT NOT NULL | e.g. "Senior Developer" |
| department | TEXT | e.g. "Engineering" |
| avatar_emoji | TEXT | Emoji avatar (e.g. "🧑") |
| bio | TEXT | Short description |
| model | TEXT NOT NULL | e.g. "claude-sonnet-4-20250514" |
| fallback_model | TEXT | Backup model if primary fails |
| temperature | REAL DEFAULT 0.7 | |
| system_prompt | TEXT NOT NULL | Core identity prompt |
| behavior_rules | TEXT | JSON array of behavior rules |
| communication_style | TEXT | Freeform description |
| total_conversations | INTEGER DEFAULT 0 | |
| total_tokens_used | INTEGER DEFAULT 0 | |
| total_cost | REAL DEFAULT 0 | |
| is_active | INTEGER DEFAULT 1 | |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### persona_skill_docs
Knowledge documents loaded into persona context.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| persona_id | TEXT | FK → personas. NULL = global (available to all) |
| title | TEXT NOT NULL | |
| content | TEXT NOT NULL | |
| category | TEXT | 'domain', 'technical', 'business', 'persona_specific', 'meta' |
| loading_rule | TEXT DEFAULT 'available' | 'always', 'available', 'manual' |
| token_count | INTEGER | Auto-computed from content |
| relevance_tags | TEXT | JSON array: ["database", "api", "q2"] |
| source | TEXT | 'manual', 'imported', 'ai_generated', 'meeting_extracted' |
| times_referenced | INTEGER DEFAULT 0 | |
| created_at | TEXT | |
| updated_at | TEXT | |

### persona_memories
Persistent memory entries extracted from conversations and meetings.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| persona_id | TEXT | FK → personas. NULL = shared team memory |
| memory_type | TEXT NOT NULL | 'decision', 'lesson', 'fact', 'preference', 'relationship', 'insight', 'correction' |
| content | TEXT NOT NULL | The memory text |
| source_meeting_id | TEXT | FK → meetings |
| source_conversation_id | TEXT | FK → persona_conversations |
| importance | REAL DEFAULT 0.5 | 0.0–1.0, used for memory loading priority |
| relevance_tags | TEXT | JSON array for topic matching |
| times_referenced | INTEGER DEFAULT 0 | |
| superseded_by | TEXT | ID of newer memory that overrides this one |
| applies_to | TEXT | JSON array of persona IDs. NULL = applies to all |
| created_at | TEXT | |

### persona_conversations
Solo chat sessions with a persona.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| persona_id | TEXT NOT NULL | FK → personas |
| title | TEXT | Editable inline |
| message_count | INTEGER DEFAULT 0 | |
| total_tokens | INTEGER DEFAULT 0 | |
| total_cost | REAL DEFAULT 0 | |
| is_archived | INTEGER DEFAULT 0 | |
| created_at | TEXT | |
| updated_at | TEXT | |

### conversation_messages
Messages in a solo conversation.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| conversation_id | TEXT NOT NULL | FK → persona_conversations |
| sender_type | TEXT NOT NULL | 'human', 'persona' |
| content | TEXT NOT NULL | |
| model_used | TEXT | |
| tokens_in | INTEGER | |
| tokens_out | INTEGER | |
| cost | REAL | |
| tools_used | TEXT | JSON |
| skill_docs_loaded | TEXT | JSON |
| memories_loaded | TEXT | JSON |
| created_at | TEXT | |

### meetings
Meeting sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | |
| meeting_type | TEXT NOT NULL | 'brainstorm', 'review', 'standup', 'decision', 'freeform' |
| agenda | TEXT | Meeting topic/purpose |
| participant_ids | TEXT | JSON array of persona IDs |
| status | TEXT DEFAULT 'active' | 'active', 'completed' |
| total_messages | INTEGER DEFAULT 0 | |
| total_tokens | INTEGER DEFAULT 0 | |
| total_cost | REAL DEFAULT 0 | |
| duration_seconds | INTEGER | |
| started_at | TEXT | |
| completed_at | TEXT | |
| created_at | TEXT | |

### meeting_messages
Individual messages in a meeting.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| meeting_id | TEXT NOT NULL | FK → meetings |
| sender_type | TEXT NOT NULL | 'human', 'persona', 'system', 'intelligence' |
| sender_persona_id | TEXT | FK → personas. NULL for human/system |
| content | TEXT NOT NULL | |
| model_used | TEXT | |
| tokens_in | INTEGER | |
| tokens_out | INTEGER | |
| cost | REAL | |
| response_time_ms | INTEGER | |
| skill_docs_loaded | TEXT | JSON: doc IDs used in context |
| memories_loaded | TEXT | JSON: memory IDs used in context |
| intelligence_type | TEXT | For intelligence messages: 'consensus', 'insight', 'disagreement', 'action_item', 'missing_perspective' |
| sort_order | INTEGER DEFAULT 0 | |
| created_at | TEXT | |

### action_items
Action items from meetings.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| meeting_id | TEXT NOT NULL | FK → meetings |
| title | TEXT NOT NULL | |
| description | TEXT | |
| assigned_to | TEXT | Persona name or "Human" |
| status | TEXT DEFAULT 'pending' | 'pending', 'in_progress', 'completed', 'cancelled' |
| priority | TEXT DEFAULT 'medium' | 'low', 'medium', 'high', 'critical' |
| due_date | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

### decision_records
Decision records from meetings.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| meeting_id | TEXT NOT NULL | FK → meetings |
| title | TEXT NOT NULL | |
| decision | TEXT NOT NULL | The decision text |
| rationale | TEXT | Why this was decided |
| participants | TEXT | JSON array of persona names involved |
| created_at | TEXT | |

### persona_relationships
Persona-to-persona relationship definitions for meeting context.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| persona_id | TEXT NOT NULL | FK -> personas. The source persona |
| related_persona_id | TEXT NOT NULL | FK -> personas. The target persona |
| relationship_type | TEXT NOT NULL | RelationshipType (e.g. 'collaborator', 'reports_to', 'mentors', 'conflicts_with', etc.) |
| description | TEXT | Freeform description of the relationship |
| strength | REAL DEFAULT 0.5 | 0.0-1.0, relationship strength |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

## Indexes

```sql
-- Migration 001
CREATE INDEX idx_skill_docs_persona ON persona_skill_docs(persona_id);
CREATE INDEX idx_skill_docs_loading ON persona_skill_docs(loading_rule);
CREATE INDEX idx_memories_persona ON persona_memories(persona_id);
CREATE INDEX idx_memories_type ON persona_memories(memory_type);
CREATE INDEX idx_memories_importance ON persona_memories(importance);

-- Migration 002
CREATE INDEX idx_conversations_persona ON persona_conversations(persona_id);
CREATE INDEX idx_conv_msgs_conv ON conversation_messages(conversation_id);

-- Migration 003
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meeting_msgs_meeting ON meeting_messages(meeting_id);

-- Migration 004
CREATE INDEX idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_decision_records_meeting ON decision_records(meeting_id);

-- Migration 005
CREATE INDEX idx_relationships_persona ON persona_relationships(persona_id);
CREATE INDEX idx_relationships_related ON persona_relationships(related_persona_id);
```

## Migration Files

```
001_initial_schema.sql    — personas, skill_docs, memories, settings
002_conversations.sql     — persona_conversations, conversation_messages
003_meetings.sql          — meetings, meeting_messages
004_action_items.sql      — action_items, decision_records
005_relationships.sql     — persona_relationships
```

All migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
