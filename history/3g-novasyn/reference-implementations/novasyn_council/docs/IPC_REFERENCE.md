# NovaSyn Council — IPC Reference

## Pattern

All IPC follows the 5-layer pattern: types.ts → preload/index.ts → main/index.ts → store → components.

Channels defined as string constants in `IPC_CHANNELS` object in `src/shared/types.ts`.
ElectronAPI method signatures defined in `ElectronAPI` interface in `src/shared/types.ts`.

---

## Settings (4 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_SETTINGS | invoke | — | Settings | Load all settings |
| SAVE_SETTINGS | invoke | Partial\<Settings\> | void | Save settings |
| GET_API_KEYS | invoke | — | Record\<string, string\> | Load from shared key store |
| GET_MODELS | invoke | — | AIModel[] | Available AI models |

## Personas (4 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_PERSONAS | invoke | — | Persona[] | All active personas |
| CREATE_PERSONA | invoke | CreatePersonaInput | Persona | Create new persona |
| UPDATE_PERSONA | invoke | id, Partial\<Persona\> | Persona | Update persona |
| DELETE_PERSONA | invoke | id | void | Delete persona + cascade |

## Skill Docs (4 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_SKILL_DOCS | invoke | personaId | SkillDoc[] | Docs for persona + global |
| CREATE_SKILL_DOC | invoke | CreateSkillDocInput | SkillDoc | |
| UPDATE_SKILL_DOC | invoke | id, Partial\<SkillDoc\> | SkillDoc | |
| DELETE_SKILL_DOC | invoke | id | void | |

## Memories (7 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_MEMORIES | invoke | personaId | Memory[] | Memories for persona + shared |
| CREATE_MEMORY | invoke | CreateMemoryInput | Memory | |
| UPDATE_MEMORY | invoke | id, Partial\<Memory\> | Memory | |
| DELETE_MEMORY | invoke | id | void | |
| SEARCH_MEMORIES | invoke | personaId, query | Memory[] | Text search |
| EXTRACT_MEMORIES | invoke | conversationId, personaId | ExtractedMemory[] | AI extracts memories |
| SUPERSEDE_MEMORY | invoke | oldId, newId | void | Mark old memory as superseded |

## Conversations (8 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_CONVERSATIONS | invoke | personaId | Conversation[] | List conversations |
| CREATE_CONVERSATION | invoke | personaId, title? | Conversation | |
| RENAME_CONVERSATION | invoke | id, title | void | Inline title editing |
| DELETE_CONVERSATION | invoke | id | void | |
| GET_CONVERSATION_MESSAGES | invoke | conversationId | ConversationMessage[] | |
| SEND_PERSONA_MESSAGE | invoke | SendPersonaMessageInput | ConversationMessage | Sends to AI with streaming, returns final message |
| REGENERATE_RESPONSE | invoke | conversationId, personaId | ConversationMessage | Delete last AI msg + re-call AI |
| EXPORT_CONVERSATION | invoke | conversationId | void | Save dialog → markdown file |

## Meetings (8 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_MEETINGS | invoke | — | Meeting[] | All meetings |
| CREATE_MEETING | invoke | CreateMeetingInput | Meeting | |
| DELETE_MEETING | invoke | id | void | |
| END_MEETING | invoke | id | void | Mark meeting completed |
| GET_MEETING_MESSAGES | invoke | meetingId | MeetingMessage[] | |
| SEND_MEETING_MESSAGE | invoke | SendMeetingMessageInput | MeetingMessage[] | Human msg → all personas respond with streaming |
| ANALYZE_MEETING | invoke | meetingId | MeetingAnalysis | AI-powered meeting intelligence |
| EXPORT_MEETING | invoke | meetingId | void | Save dialog → markdown file |

## Action Items (4 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_ACTION_ITEMS | invoke | meetingId | ActionItem[] | |
| CREATE_ACTION_ITEM | invoke | CreateActionItemInput | ActionItem | |
| UPDATE_ACTION_ITEM | invoke | id, Partial\<ActionItem\> | ActionItem | Status cycling |
| DELETE_ACTION_ITEM | invoke | id | void | |

## Decision Records (3 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_DECISION_RECORDS | invoke | meetingId | DecisionRecord[] | |
| CREATE_DECISION_RECORD | invoke | CreateDecisionRecordInput | DecisionRecord | |
| DELETE_DECISION_RECORD | invoke | id | void | |

## Streaming (2 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| STREAM_CHUNK | event (main→renderer) | text: string | — | Real-time text chunks during AI calls |
| STREAM_PERSONA_START | event (main→renderer) | personaId: string | — | Signals which persona is about to stream |

## Relationships (5 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_RELATIONSHIPS | invoke | personaId | Relationship[] | All relationships for a persona |
| CREATE_RELATIONSHIP | invoke | CreateRelationshipInput | Relationship | Create persona-to-persona relationship |
| UPDATE_RELATIONSHIP | invoke | id, Partial\<Relationship\> | Relationship | Update relationship |
| DELETE_RELATIONSHIP | invoke | id | void | Delete relationship |
| SUGGEST_RELATIONSHIPS | invoke | personaId | SuggestedRelationship[] | AI suggests relationships based on meeting history |

## Search (1 channel)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GLOBAL_SEARCH | invoke | query: string | SearchResult[] | Searches 7 tables (personas, conversations, conversation_messages, meetings, meeting_messages, memories, skill_docs, action_items) with LIKE queries, snippets, dedup |

## Analytics (1 channel)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| GET_COST_ANALYTICS | invoke | filters?: AnalyticsFilters | CostAnalytics | Aggregates token/cost data across conversations and meetings by persona, model, time period |

## Window (3 channels)

| Channel | Direction | Params | Returns | Notes |
|---------|-----------|--------|---------|-------|
| MINIMIZE_WINDOW | send | — | — | |
| MAXIMIZE_WINDOW | send | — | — | |
| CLOSE_WINDOW | send | — | — | |

---

## Total: 55 channels

Settings (4) + Personas (4) + Skill Docs (4) + Memories (7) + Conversations (8) + Meetings (8) + Action Items (4) + Decision Records (3) + Search (1) + Analytics (1) + Relationships (5) + Streaming (2) + Window (3)
