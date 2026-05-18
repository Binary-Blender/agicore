# SKILLDOC — Governed Cognition Infrastructure

SKILLDOC declarations make skill docs first-class deployable artifacts in Agicore. Each declaration compiles to a signed markdown document, a machine-readable governance manifest, and a TypeScript registry with governance-aware helpers. The runtime uses the registry to inject skill context into AI prompts with access control, audit trails, and operation constraints enforced at the type level.

---

## Syntax

```agi
SKILLDOC aerospace_qc {
  DESCRIPTION  "Aerospace quality control inspection protocol"
  VERSION      "2.1.0"
  DOMAIN       "quality-assurance"
  PRIORITY     95
  KEYWORDS     inspection, safety, compliance, audit
  CONTENT      "skilldocs/aerospace_qc.md"

  GOVERNANCE {
    SIGNED_BY    CorpAuthority
    REQUIRE      clearance_level_3, qa_certified
    EXECUTE_ONLY read_report, submit_finding
    DISALLOW     delete_record, override_finding
    AUDIT        all_actions
  }

  COMPRESSION {
    SEMANTIC_DENSITY    0.9
    INTENT_PRESERVATION 0.95
    TOKEN_EFFICIENCY    0.8
  }
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | One-line description of this skill doc |
| `VERSION` | No | Semantic version string (default: `1.0.0`) |
| `DOMAIN` | No | Domain label for filtering (default: `general`) |
| `PRIORITY` | No | Injection priority — higher wins (default: `0`) |
| `KEYWORDS` | No | Comma-separated identifiers for message matching |
| `CONTENT` | No | Path to existing `.md` file to embed as content |

### GOVERNANCE block

| Field | Description |
|-------|-------------|
| `SIGNED_BY` | Authority identifier that signed this skill doc |
| `REQUIRE` | Comma-separated clearance levels required to use this doc |
| `EXECUTE_ONLY` | Comma-separated permitted operations (allowlist) |
| `DISALLOW` | Comma-separated explicitly denied operations (denylist) |
| `AUDIT` | Audit verbosity: `none` \| `errors` \| `all_access` \| `all_actions` |

**EXECUTE_ONLY and DISALLOW** work together: if EXECUTE_ONLY is non-empty, any operation not listed is denied. DISALLOW always wins regardless of EXECUTE_ONLY.

### COMPRESSION block

Semantic compression targets for prompting engines that support density control:

| Field | Description |
|-------|-------------|
| `SEMANTIC_DENSITY` | Target ratio of meaning per token (0.0–1.0) |
| `INTENT_PRESERVATION` | Minimum intent fidelity after compression (0.0–1.0) |
| `TOKEN_EFFICIENCY` | Target token reduction ratio (0.0–1.0) |

---

## What gets generated

### `scaffold/skilldocs/<name>.md`

A deployable skill doc markdown file with YAML frontmatter:

```markdown
---
name: aerospace_qc
version: 2.1.0
domain: quality-assurance
priority: 95
generated: 2026-05-18
signed_by: CorpAuthority
require: [clearance_level_3, qa_certified]
audit: all_actions
keywords: [inspection, safety, compliance, audit]
---

# aerospace_qc

> Aerospace quality control inspection protocol

## Governance

**Signed by:** CorpAuthority  
**Requires clearance:** clearance_level_3, qa_certified  
**Execute-only operations:** read_report, submit_finding  
**Disallowed:** delete_record, override_finding  
**Audit level:** all_actions

## Compression Targets

- Semantic density: 0.9
- Intent preservation: 0.95
- Token efficiency: 0.8
```

Deploy this file to your AI context store, knowledge base, or vector database. The frontmatter is machine-readable; the body is human-readable and LLM-injectable.

### `scaffold/skilldocs/<name>.json`

Machine-readable governance manifest:

```json
{
  "name": "aerospace_qc",
  "version": "2.1.0",
  "domain": "quality-assurance",
  "description": "Aerospace quality control inspection protocol",
  "keywords": ["inspection", "safety", "compliance", "audit"],
  "priority": 95,
  "governance": {
    "signedBy": "CorpAuthority",
    "require": ["clearance_level_3", "qa_certified"],
    "executeOnly": ["read_report", "submit_finding"],
    "disallow": ["delete_record", "override_finding"],
    "audit": "all_actions"
  },
  "compression": {
    "semanticDensity": 0.9,
    "intentPreservation": 0.95,
    "tokenEfficiency": 0.8
  }
}
```

Use this manifest in provisioning pipelines, deployment validators, and audit systems.

### `src/lib/skilldocs.ts`

TypeScript registry with governance-aware helpers. Imports into any component that needs skill context injection:

```typescript
import {
  SKILLDOC_REGISTRY,
  matchSkillDocs,
  buildSkillDocContext,
  isOperationPermitted,
  skillDocDomains,
} from './lib/skilldocs';
```

#### `matchSkillDocs(userMessage, grantedClearance?)`

Returns skill docs whose keywords appear in the user message, filtered by clearance:

```typescript
const matched = matchSkillDocs(
  'run inspection on component',
  ['clearance_level_3', 'qa_certified'],
);
// Returns [aerospace_qc] if user has required clearance
// Returns [] if clearance is missing
```

Docs are returned sorted by priority (highest first).

#### `buildSkillDocContext(userMessage, grantedClearance?)`

Builds a governance-aware context prefix for injection into a system prompt:

```typescript
const contextPrefix = buildSkillDocContext(userMessage, grantedClearance);
const systemPrompt = contextPrefix + baseSystemPrompt;
```

Respects EXECUTE_ONLY and DISALLOW: injects constraint lines into the context so the LLM knows what operations are permitted.

#### `isOperationPermitted(skillDocName, operation)`

Runtime guard for checking whether an operation is allowed under a skill doc's governance:

```typescript
if (!isOperationPermitted('aerospace_qc', 'delete_record')) {
  throw new Error('Operation disallowed by skill doc governance');
}
```

Returns `true` if allowed, `false` if disallowed or outside EXECUTE_ONLY allowlist.

#### `skillDocDomains()`

Returns all distinct domain strings across declared skill docs:

```typescript
const domains = skillDocDomains();
// ['quality-assurance', 'general', ...]
```

---

## Governance model

SKILLDOC governance operates in layers:

1. **Clearance check** (`REQUIRE`) — the user must hold every listed clearance level. Missing any one returns the doc from `matchSkillDocs` filtered out entirely.

2. **Operation allowlist** (`EXECUTE_ONLY`) — if non-empty, only listed operations are permitted. Everything else is denied.

3. **Operation denylist** (`DISALLOW`) — explicit deny always wins, even if the operation appears in EXECUTE_ONLY.

4. **Audit** (`AUDIT`) — controls what gets logged when the skill doc is accessed:
   - `none` — no logging
   - `errors` — log only permission failures
   - `all_access` — log every access (clearance check, context build)
   - `all_actions` — log every access and every `isOperationPermitted` call

5. **Signing** (`SIGNED_BY`) — recorded in the manifest and markdown frontmatter. Does not enforce cryptographic verification at runtime — use a separate signing pipeline if hard verification is required.

---

## Open skill docs

A SKILLDOC without a GOVERNANCE block is open — no clearance required, no operation constraints, no audit:

```agi
SKILLDOC writing_voice {
  DESCRIPTION "Brand voice and tone guidelines"
  PRIORITY    30
  KEYWORDS    writing, tone, voice, brand
}
```

Open skill docs are matched and injected the same way — they just have no governance constraints.

---

## Multiple skill docs

Declare as many as needed. All are compiled into a single `src/lib/skilldocs.ts` registry:

```agi
SKILLDOC financial_analysis {
  DESCRIPTION "FP&A analysis methodology"
  DOMAIN      "finance"
  PRIORITY    80
  KEYWORDS    revenue, margin, ltv, cac, forecast
  GOVERNANCE {
    REQUIRE    finance_team
    AUDIT      all_access
  }
}

SKILLDOC customer_support {
  DESCRIPTION "Support escalation and tone guidelines"
  DOMAIN      "support"
  PRIORITY    40
  KEYWORDS    support, escalation, refund, complaint
}
```

The `SkillDocName` union type is generated automatically:

```typescript
export type SkillDocName = 'financial_analysis' | 'customer_support';
```

---

## Integration pattern

```typescript
// In your AI action handler (e.g., src/commands/chat.ts)
import { buildSkillDocContext } from '../lib/skilldocs';

async function handleChatMessage(userMessage: string, session: Session) {
  const clearance = await getUserClearance(session.userId);
  const skillContext = buildSkillDocContext(userMessage, clearance);

  const response = await aiClient.complete({
    system: skillContext + BASE_SYSTEM_PROMPT,
    user: userMessage,
  });

  return response;
}
```

The `buildSkillDocContext` call is zero-cost when no keywords match — it returns an empty string. Wire it in unconditionally and let the registry decide what to inject.
