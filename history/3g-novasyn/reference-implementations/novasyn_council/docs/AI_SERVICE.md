# NovaSyn Council — AI Service

## Overview

`src/main/services/aiService.ts` handles all AI provider communication. Ported from NovaSyn AI's `ChatService.ts` which has battle-tested streaming for all 4 providers (Anthropic SDK, OpenAI/xAI fetch with SSE parsing, Gemini fetch with SSE). Extended for Council's persona-based context building.

## Supported Providers

| Provider | SDK/Method | Models |
|----------|-----------|--------|
| Anthropic | `@anthropic-ai/sdk` | claude-sonnet-4-20250514, claude-haiku-4-5-20251001, claude-opus-4-6 |
| OpenAI | fetch (OpenAI-compatible) | gpt-4o, gpt-4o-mini, gpt-4.1 |
| Google | fetch (Gemini API) | gemini-2.5-flash, gemini-2.5-pro |
| xAI | fetch (OpenAI-compatible) | grok-3, grok-3-mini |

## Core Methods

### `sendPersonaMessage(persona, messages, skillDocs, memories, apiKeys, onChunk?)`

The primary method for all persona interactions (solo chat and meetings).

**Flow:**
1. Build system prompt from persona's `system_prompt`
2. Append loaded skill docs (formatted as `[SKILL DOC: title]\ncontent`)
3. Append loaded memories (formatted as `[MEMORY: type]\ncontent`)
4. Call the appropriate provider based on `persona.model`
5. Stream chunks via `onChunk` callback if provided
6. Return response text + token counts + cost

**Parameters:**
- `persona` — Persona object (model, systemPrompt, temperature)
- `messages` — Array of `{role: 'user' | 'assistant', content: string}` (conversation history)
- `skillDocs` — Array of SkillDoc objects to include in context
- `memories` — Array of Memory objects to include in context
- `apiKeys` — Record of provider → key
- `onChunk` — Optional `(text: string) => void` callback for streaming

**Returns:**
```typescript
interface AIResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  modelUsed: string;
  responseTimeMs: number;
}
```

### `parseSSEStream(response, extractChunk, extractUsage, onChunk?)`

Generic SSE stream parser used by OpenAI, xAI, and Gemini providers.

**Parameters:**
- `response` — Fetch Response with SSE body
- `extractChunk` — Provider-specific function to extract text delta from parsed JSON
- `extractUsage` — Provider-specific function to extract token usage from parsed JSON
- `onChunk` — Optional callback for streaming text to renderer

### `extractMemories(text, persona)`

AI analyzes a conversation transcript and extracts structured memories.

**Prompt:**
```
Analyze this conversation and extract key memories. For each memory, provide:
- type: one of 'decision', 'lesson', 'fact', 'preference', 'insight', 'correction'
- content: the memory text (1-2 sentences)
- importance: 0.0-1.0
- relevanceTags: array of topic tags

Return as JSON array.
```

**Returns:** `Array<{ type, content, importance, relevanceTags }>`

### `suggestRelationships(personaId, meetings, personas, apiKeys)`

AI analyzes meeting history to suggest relationships between personas.

**Flow:**
1. Gather meeting transcripts where the persona participated
2. Analyze interaction patterns, agreements, disagreements, and collaboration dynamics
3. Suggest relationship types and descriptions based on observed behavior

**Returns:** `SuggestedRelationship[]` — Array of `{ personaId, relatedPersonaId, relationshipType, description, strength }`

### `generateMeetingInsight(messages, type)`

For meeting intelligence — detects consensus, disagreements, insights.

**Types:**
- `consensus` — "What points do the participants agree on?"
- `disagreement` — "Where do participants disagree?"
- `insight` — "What non-obvious insights emerged?"
- `missing_perspective` — "What viewpoints or considerations are missing?"

**Returns:** String (the detected insight/consensus/etc.)

## Context Building

### System Prompt Assembly

```
[Persona System Prompt]

--- YOUR KNOWLEDGE ---

[SKILL DOC: API Design Principles]
[content...]

[SKILL DOC: Architecture Document]
[content...]

--- YOUR MEMORIES ---

[MEMORY: decision] Real-time collaboration deprioritized for Q2 due to architectural conflict with local-first SQLite model
[MEMORY: fact] Pro users spend 3.4x more than Community users on API calls
[MEMORY: lesson] Morgan's time estimates are usually 30% optimistic

--- YOUR RELATIONSHIPS ---

[RELATIONSHIP: collaborator] Works closely with Morgan on backend architecture decisions. Strong mutual respect.
[RELATIONSHIP: mentors] Mentors Sam on testing practices and code review standards.

--- CURRENT CONTEXT ---

You are in a solo conversation with the user.
// or: You are in a brainstorm meeting with Morgan, Alex, Sam, and Jordan. The topic is: Q2 Feature Priorities.
```

### Token Budget

Default context budget: 8000 tokens for skill docs + 2000 tokens for memories = 10000 tokens.

Loading priority:
1. `always` skill docs (loaded first, guaranteed)
2. High-importance memories (importance > 0.7)
3. `available` skill docs with matching tags
4. Medium-importance memories
5. Stop when budget is reached

Token estimation: `Math.ceil(text.length / 4)` (same heuristic as Writer).

## Cost Calculation

| Provider | Input (per 1M tokens) | Output (per 1M tokens) |
|----------|----------------------|----------------------|
| claude-sonnet-4 | $3.00 | $15.00 |
| claude-haiku-4-5 | $0.80 | $4.00 |
| claude-opus-4-6 | $15.00 | $75.00 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4.1 | $2.00 | $8.00 |
| gemini-2.5-flash | $0.15 | $0.60 |
| gemini-2.5-pro | $1.25 | $10.00 |
| grok-3 | $3.00 | $15.00 |
| grok-3-mini | $0.30 | $0.50 |

Costs tracked per message, aggregated per conversation/meeting/persona.

## Streaming Architecture

All 4 providers support streaming via the `onChunk` callback:

| Provider | Streaming Method |
|----------|-----------------|
| Anthropic | `client.messages.stream()` with `.on('text', onChunk)` |
| OpenAI | `stream: true` + `stream_options: { include_usage: true }` → SSE parsing |
| xAI | Same as OpenAI (OpenAI-compatible API) |
| Gemini | `streamGenerateContent?alt=sse` endpoint → SSE parsing |

The main process uses `event.sender.send(IPC_CHANNELS.STREAM_CHUNK, text)` to forward chunks to the renderer while the `invoke` is still in flight. The invoke resolves with the final complete response.

For meetings, `STREAM_PERSONA_START` is sent before each persona's AI call so the UI can show the correct avatar and name alongside the streaming text.

## Meeting Message Flow

When a human sends a message in a meeting, each participating persona responds in sequence:

```
Human message →
  For each persona in meeting:
    1. Send STREAM_PERSONA_START event (personaId)
    2. Build persona's context (their skill docs, their memories)
    3. Include full meeting transcript so far
    4. Call AI with onChunk → stream text to renderer
    5. Save message to DB
    6. Add response to transcript for next persona
  Return all responses
```

This means each persona sees the full conversation including previous personas' responses in this round, creating natural back-and-forth.
