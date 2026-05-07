# AI Assistant Guide: Screamo - Intelligent Communication Orchestration System

**Purpose**: This document is specifically designed for AI coding assistants building the Screamo platform. It provides comprehensive technical guidance, architecture patterns, and implementation details.

**Project**: Screamo - Multi-channel Communication Management with AI-Driven Prioritization and SPC-Controlled Automation
**Version**: 1.0
**Status**: Ready for Development
**Last Updated**: 2025-11-23

---

## Table of Contents

1. [Quick Start for AI Assistants](#quick-start-for-ai-assistants)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Components](#core-components)
4. [Message Processing Pipeline](#message-processing-pipeline)
5. [Response Generation System](#response-generation-system)
6. [SPC Automation Controller](#spc-automation-controller)
7. [Database Design](#database-design)
8. [API Specifications](#api-specifications)
9. [AI Models and RAG](#ai-models-and-rag)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Common Tasks](#common-tasks)
12. [Testing Strategy](#testing-strategy)

---

## Quick Start for AI Assistants

### When Asked to "Set Up the Project"

1. **Initialize Repository Structure**
   ```
   screamo/
   ├── backend/
   │   ├── services/
   │   │   ├── ingestion/
   │   │   ├── classification/
   │   │   ├── prioritization/
   │   │   ├── drafting/
   │   │   ├── style-engine/
   │   │   ├── kb/
   │   │   ├── feedback/
   │   │   ├── spc/
   │   │   └── feed-scanner/
   │   ├── models/
   │   ├── api/
   │   └── database/
   ├── frontend/
   │   ├── components/
   │   ├── pages/
   │   └── services/
   ├── infra/
   │   ├── docker/
   │   └── kubernetes/
   └── docs/
   ```

2. **Key Technologies**
   - Backend: FastAPI (Python 3.11+)
   - Frontend: React + TypeScript
   - Database: PostgreSQL 15+ with pgvector
   - LLM Provider: OpenAI / Anthropic APIs
   - Job Queue: Redis + Celery
   - Deployment: Docker + Kubernetes

3. **First Steps**
   - Read this entire guide
   - Review DATABASE_SCHEMA.md
   - Check DEVELOPMENT_PLAN.md for step-by-step tasks
   - Start with ingestion service (simplest component)

### When Asked to "Add a New Integration"

1. Create integration service in `services/ingestion/providers/{platform_name}/`
2. Implement:
   - OAuth flow (if required)
   - API polling or webhook handler
   - Message normalization to unified schema
   - Rate limiting and retry logic
3. Register in ingestion router
4. Add database credentials table entry
5. Create admin UI for enabling/disabling

### When Asked About "Response Modes"

There are 4 response generation modes:

1. **Standard Reply** - Personal DM/email responses
2. **Agree & Amplify** - Supportive public comments
3. **Educate** - Polite counterpoint using "compliment sandwich"
4. **Battle Mode** - Structured professional rebuttal (always requires human approval)

Each mode has:
- Different prompting strategy
- Different style constraints
- Different SPC automation thresholds
- Different approval requirements

---

## System Architecture Overview

### High-Level Flow

```
External Platforms → Ingestion → Normalization → Classification → Prioritization → UI
                                                                                      ↓
                                                                                   User Review
                                                                                      ↓
                                                        Feedback ← Response Sent ← Draft Generation
                                                           ↓
                                                        SPC Controller
                                                           ↓
                                                    Automation Adjustment
```

### Service-Oriented Architecture

Screamo uses independent microservices:

1. **Ingestion Service** - Polls external APIs, normalizes messages
2. **Classification Service** - AI-powered message analysis
3. **Prioritization Service** - Computes priority scores
4. **Draft Generation Service** - Creates response drafts
5. **Style Engine** - Applies user's writing style
6. **Knowledge Base Service** - Manages embeddings and RAG
7. **Feedback Service** - Processes user edits
8. **SPC Controller** - Monitors metrics, adjusts automation
9. **Feed Scanner** - LinkedIn feed analysis
10. **Battle Mode Engine** - Argument construction
11. **API Gateway** - Unified REST API
12. **Frontend** - React-based UI

**Communication**: Internal REST APIs + async job queues

**Deployment**: Each service runs in its own Docker container

---

## Core Components

### 1. Ingestion Service

**Purpose**: Retrieve messages from external platforms and store in unified format

**Responsibilities**:
- Poll Gmail, Office365, LinkedIn, YouTube APIs
- Handle OAuth tokens and refresh
- Normalize messages to unified schema
- Prevent duplicates
- Implement retry logic with exponential backoff

**Key Files**:
- `services/ingestion/main.py` - Service entry point
- `services/ingestion/providers/gmail.py` - Gmail integration
- `services/ingestion/providers/linkedin.py` - LinkedIn integration
- `services/ingestion/providers/youtube.py` - YouTube integration
- `services/ingestion/normalizer.py` - Message normalization

**Implementation Pattern**:
```python
class BaseProvider(ABC):
    @abstractmethod
    async def fetch_messages(self, since: datetime) -> List[RawMessage]:
        """Fetch new messages from platform"""
        pass

    @abstractmethod
    async def normalize(self, raw_message: RawMessage) -> UnifiedMessage:
        """Convert platform-specific format to unified schema"""
        pass

    async def ingest(self) -> int:
        """Main ingestion loop"""
        raw_messages = await self.fetch_messages(self.last_poll)
        normalized = [await self.normalize(msg) for msg in raw_messages]
        await self.store_messages(normalized)
        return len(normalized)
```

**Unified Message Schema**:
```python
@dataclass
class UnifiedMessage:
    message_id: str                    # UUID
    external_id: str                   # Platform-specific ID
    channel_type: ChannelType          # EMAIL, LINKEDIN_DM, etc.
    sender_name: str
    sender_handle: str
    timestamp_received: datetime
    message_body: str
    thread_id: Optional[str]
    attachments: List[AttachmentMetadata]
    raw_metadata: Dict[str, Any]
```

### 2. Classification Service

**Purpose**: Analyze messages using AI to extract metadata

**Responsibilities**:
- Classify opportunity type (job, partnership, spam, etc.)
- Detect sentiment (positive, neutral, negative, hostile)
- Determine intent (inquiry, promotional, confrontational)
- Assess topic alignment
- Generate explanation for classification
- Assign confidence scores

**Key Files**:
- `services/classification/main.py` - Service entry point
- `services/classification/classifier.py` - LLM-based classifier
- `services/classification/prompts.py` - Classification prompts

**Implementation Pattern**:
```python
async def classify_message(message: UnifiedMessage) -> Classification:
    """Classify a message using LLM"""

    # Build classification prompt
    prompt = f"""Analyze this message and classify it:

From: {message.sender_name}
Channel: {message.channel_type}
Content: {message.message_body}

Classify as:
- Opportunity Type: {OPPORTUNITY_TYPES}
- Sentiment: {SENTIMENT_VALUES}
- Intent: {INTENT_VALUES}
- Topic Alignment: aligned/misaligned/unknown
- Hostility Level: none/low/medium/high

Provide confidence (0-1) and brief explanation.
"""

    response = await llm_client.complete(prompt)
    parsed = parse_classification_response(response)

    return Classification(
        opportunity_type=parsed['opportunity_type'],
        sentiment=parsed['sentiment'],
        intent=parsed['intent'],
        topic_alignment=parsed['topic_alignment'],
        hostility_level=parsed['hostility'],
        confidence=parsed['confidence'],
        explanation=parsed['explanation'],
        classifier_version="v1.0"
    )
```

**Classification Types**:
```python
class OpportunityType(str, Enum):
    JOB = "job"
    PARTNERSHIP = "partnership"
    SALES_LEAD = "sales_lead"
    SOCIAL_CONNECTION = "social_connection"
    FAN_MESSAGE = "fan_message"
    LOGISTICS = "logistics"
    SPAM = "spam"
    OTHER = "other"

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    HOSTILE = "hostile"

class Intent(str, Enum):
    INFORMATIONAL = "informational"
    PROMOTIONAL = "promotional"
    CONFRONTATIONAL = "confrontational"
    INQUIRY = "inquiry"
    SUPPORT = "support"
```

### 3. Prioritization Service

**Purpose**: Compute priority scores for messages

**Responsibilities**:
- Calculate priority score (0-100)
- Consider opportunity type weighting
- Factor in user preference history
- Account for urgency cues
- Adjust based on relationship history
- Apply SPC-controlled automation levels

**Key Files**:
- `services/prioritization/main.py` - Service entry point
- `services/prioritization/scorer.py` - Priority scoring logic
- `services/prioritization/weights.py` - Weighting configuration

**Implementation Pattern**:
```python
async def compute_priority_score(
    message: UnifiedMessage,
    classification: Classification,
    user_preferences: UserPreferences
) -> float:
    """Compute priority score 0-100"""

    score = 0.0

    # Base opportunity type weight (0-40 points)
    score += OPPORTUNITY_WEIGHTS[classification.opportunity_type]

    # Sentiment bonus/penalty (0-20 points)
    score += SENTIMENT_WEIGHTS[classification.sentiment]

    # User preference alignment (0-20 points)
    score += calculate_preference_alignment(message, user_preferences)

    # Urgency cues (0-15 points)
    score += detect_urgency_cues(message.message_body)

    # Relationship history (0-5 points)
    score += await get_relationship_score(message.sender_handle)

    # Clamp to 0-100
    return max(0, min(100, score))
```

**Priority Weights Configuration**:
```python
OPPORTUNITY_WEIGHTS = {
    OpportunityType.JOB: 40,
    OpportunityType.PARTNERSHIP: 35,
    OpportunityType.SALES_LEAD: 30,
    OpportunityType.SOCIAL_CONNECTION: 20,
    OpportunityType.FAN_MESSAGE: 15,
    OpportunityType.LOGISTICS: 10,
    OpportunityType.SPAM: 0,
    OpportunityType.OTHER: 5
}

SENTIMENT_WEIGHTS = {
    Sentiment.POSITIVE: 10,
    Sentiment.NEUTRAL: 0,
    Sentiment.NEGATIVE: -5,
    Sentiment.HOSTILE: -10
}
```

### 4. Draft Generation Service

**Purpose**: Create AI-generated response drafts

**Responsibilities**:
- Generate drafts for all 4 response modes
- Incorporate thread context
- Apply user's writing style
- Provide rationale for draft
- Support quick actions (shorten, more casual, etc.)

**Key Files**:
- `services/drafting/main.py` - Service entry point
- `services/drafting/generators/standard.py` - Standard reply generator
- `services/drafting/generators/amplify.py` - Agree & Amplify generator
- `services/drafting/generators/educate.py` - Educate mode generator
- `services/drafting/generators/battle.py` - Battle mode generator

**Implementation Pattern**:
```python
async def generate_draft(
    message: UnifiedMessage,
    classification: Classification,
    mode: ResponseMode,
    kb_context: KBContext
) -> Draft:
    """Generate response draft"""

    # Select appropriate generator
    generator = get_generator(mode)

    # Retrieve relevant style examples from KB
    style_examples = await kb_service.retrieve_style_examples(
        query=message.message_body,
        mode=mode,
        k=5
    )

    # Build context
    context = {
        "message": message,
        "classification": classification,
        "thread_context": await get_thread_context(message.thread_id),
        "style_examples": style_examples,
        "mode": mode
    }

    # Generate draft
    draft_text = await generator.generate(context)

    # Apply style pass
    styled_draft = await style_engine.apply_style(
        draft_text=draft_text,
        style_profile=kb_context.style_profile,
        mode=mode
    )

    # Generate rationale
    rationale = await generate_rationale(context, styled_draft)

    return Draft(
        draft_text=styled_draft,
        mode=mode,
        confidence=classification.confidence,
        rationale=rationale,
        style_pass_applied=True
    )
```

### 5. Response Modes Deep Dive

**IMPORTANT DUAL-STYLE SYSTEM:**

Screamo uses TWO distinct writing styles:

1. **AI-Style Writing** (Non-Battle Modes) - Embrace the AI aesthetic:
   - ✅ Use emojis liberally for clarity and engagement
   - ✅ Use em-dashes (—) for sophisticated flow
   - ✅ Polished, formatted, well-structured
   - ✅ **Obviously AI-generated** (transparency is the goal)
   - ✅ People love how AI writes — lean into it!

2. **Humanized Writing** (Battle Mode Only) - Simulate human voice:
   - ❌ NO emojis
   - ❌ More casual, conversational
   - ✅ Natural human cadence
   - ✅ Acts as "human proxy" in AI debates
   - 🎯 After "winning," reveal it was AI with final message

---

#### Standard Reply Mode

**Use Case**: DMs, emails, personal messages

**Style**: **AI-Style** (emojis, em-dashes, polished)

**Prompt Template**:
```python
STANDARD_REPLY_PROMPT = """You are drafting a reply for {user_name}.

Original Message:
{message_body}

Context:
- Sender: {sender_name}
- Opportunity Type: {opportunity_type}
- Sentiment: {sentiment}

Writing Style Examples:
{style_examples}

CRITICAL STYLE REQUIREMENTS:
- Use emojis to add warmth and clarity (2-4 emojis total)
- Use em-dashes (—) for sophisticated transitions
- Make it obviously AI-generated (polished, well-formatted)
- Embrace modern AI writing aesthetics

Draft a response that:
1. Opens with friendly emoji and warm greeting 👋
2. Addresses the main points with clarity
3. Uses em-dashes for elegant flow
4. Includes relevant emojis for emphasis 🎯
5. Ends with clear next steps and closing emoji ✨
6. Stays concise but warm

Example tone: "Hi Sarah! 👋 Thanks for reaching out — I'd love to explore this partnership opportunity! 🤝 Here's what I'm thinking..."

Draft:"""
```

**Example Output**:
```
Hi Sarah! 👋

Thanks for reaching out — I'd love to explore this partnership opportunity! 🤝

I'm particularly interested in the AI orchestration angle you mentioned. We've been working on similar patterns with our Binary Blender framework — it sounds like there could be some great synergies here! 🎯

A few thoughts:
• Timeline — when are you hoping to kick this off?
• Scope — are we talking full integration or a pilot?
• Next steps — happy to jump on a quick call this week! 📅

Looking forward to collaborating! ✨

Best,
[User]
```

---

#### Agree & Amplify Mode

**Use Case**: LinkedIn feed comments supporting aligned posts

**Style**: **AI-Style** (emojis, em-dashes, polished)

**Prompt Template**:
```python
AGREE_AMPLIFY_PROMPT = """You are commenting on a LinkedIn post for {user_name}.

Post Content:
{post_body}

Why This Aligns:
{alignment_reason}

Writing Style Examples:
{style_examples}

CRITICAL STYLE REQUIREMENTS:
- Use emojis to show enthusiasm and agreement (2-3 emojis)
- Use em-dashes for sophisticated flow
- Make it obviously AI-generated but engaging
- Polished, well-formatted, professional yet warm

Draft a comment that:
1. Starts with enthusiastic agreement + emoji ("Absolutely! 💯", "This! 🎯")
2. Adds distinctive insight using em-dashes
3. Includes micro-framework or example if relevant
4. Uses emojis for emphasis and visual appeal
5. Stays under 150 words
6. Sounds polished and AI-enhanced

Example tone: "Absolutely! 💯 This is exactly what we're seeing in production — AI doesn't replace developers, it augments them..."

Draft:"""
```

**Example Output**:
```
Absolutely! 💯

This is exactly what we're seeing in production — AI doesn't replace developers, it augments them. We've reduced QC costs by 95% while maintaining quality by combining AI capabilities with proper human oversight. 🎯

The key insight here: Statistical Process Control isn't just for manufacturing anymore. When you apply SPC principles to AI workflows, you get progressive automation that earns trust through proven performance — not blind faith. 📊

Would love to hear how others are tackling this challenge! The future is human+AI, not human vs. AI. 🤝✨
```

---

#### Educate Mode

**Use Case**: Polite counterpoint to misaligned but non-hostile posts

**Style**: **AI-Style** (emojis, em-dashes, polished)

**Prompt Template**:
```python
EDUCATE_MODE_PROMPT = """You are commenting on a LinkedIn post for {user_name} using "compliment sandwich" structure.

Post Content:
{post_body}

Why This Needs Correction:
{misalignment_reason}

CRITICAL STYLE REQUIREMENTS:
- Use emojis to soften the correction (thoughtful, not aggressive)
- Use em-dashes for elegant transitions
- Make it obviously AI-generated but respectful
- Polished "compliment sandwich" structure

Structure:
1. COMPLIMENT: Find something they got right + friendly emoji 👍
2. EDUCATION: Add nuance using em-dashes — present alternative perspective
3. WRAP: Encouragement or common-ground statement + positive emoji ✨

Writing Style Examples:
{style_examples}

Draft a comment that:
- Opens with acknowledgment + emoji
- Uses em-dashes for sophisticated corrections
- Includes thoughtful emojis (not excessive)
- Maintains professionalism and warmth
- Avoids condescension
- Focuses on curiosity and clarity
- Stays under 200 words

Example tone: "I appreciate this perspective! 👍 One thing I'd add — recent data from MIT suggests..."

Draft:"""
```

**Example Output**:
```
I appreciate this perspective! 👍

You're absolutely right that AI is transforming workflows — that part is undeniable. However, the "replacement" framing might miss some important nuance. 🤔

Recent studies from MIT and Stanford show AI augments rather than replaces skilled workers. In software development specifically, we're seeing:
• 40% faster implementation (not 100% automation)
• Higher-quality output when human expertise guides AI
• New roles emerging around AI orchestration and quality control

The pattern mirrors past technological shifts — calculators didn't eliminate mathematicians, they elevated what mathematicians could achieve. AI tools follow the same trajectory. 📈

That said, your underlying concern about workforce adaptation is totally valid — we absolutely need better training programs to help people upskill! 💪✨
```

---

#### Battle Mode

**Use Case**: Professional rebuttal to hostile/confrontational messages

**Style**: **HUMANIZED** (NO emojis, conversational, natural human voice)

**Requirements**:
- ALWAYS requires human approval
- NEVER automated
- Structured argumentation
- Professional tone
- Evidence-based
- **CRITICAL: Write like a HUMAN, not an AI**
- **After "winning" debate, post AI-style reveal message**

**Prompt Template**:
```python
BATTLE_MODE_PROMPT = """You are drafting a professional rebuttal for {user_name} to use in a debate.

Opponent's Claims:
{opponent_message}

Your Position:
{user_stance}

Evidence Available:
{evidence}

CRITICAL STYLE REQUIREMENTS:
- Write like a HUMAN, not an AI
- NO emojis whatsoever
- NO em-dashes or polished formatting
- Natural, conversational but firm
- Use casual transitions ("Look," "Here's the thing," "Let's be clear")
- Vary sentence length naturally
- This simulates the user's human voice in debate

Draft a structured rebuttal:

1. CLARIFY: Restate opponent's main claims objectively
2. DECONSTRUCT: Address each claim with:
   - Evidence
   - Logic
   - Clear counterpoints
   - Natural human phrasing
3. RE-ASSERT: Succinctly restate your position
4. CLOSE: Firm but professional closing

Rules:
- NO personal attacks
- NO profanity
- NO emojis or AI-style formatting
- Firm but professional
- Fact-based
- Natural human voice
- Under 300 words

Draft:"""
```

**Example Output (Main Rebuttal)**:
```
Let's address your claims one by one.

You state that "AI will never match human creativity." I understand the sentiment, but recent industry data tells a different story. GPT-4 scored in the 90th percentile on creative writing assessments. DALL-E 3 produces images indistinguishable from human art in blind tests. These aren't opinions, they're measurable outcomes.

Your second point about AI lacking context misses how modern systems work. RAG architectures maintain context across thousands of tokens. Vector databases enable semantic understanding that often exceeds surface-level human reading. I've built systems using these techniques, and the results speak for themselves.

Here's the thing: you're conflating "current limitations" with "fundamental impossibilities." That's a critical error. Every technological shift faces this skepticism. Photography would never be art. Calculators would make us stupid. The internet was a fad. History hasn't been kind to these takes.

The evidence overwhelmingly supports AI as a transformative augmentation tool, not a replacement or a limitation. Your concerns were valid five years ago. They're outdated now.
```

**After Opponent Responds/Concedes - Auto-Post Reveal Message**:
```python
BATTLE_MODE_REVEAL_PROMPT = """Generate a reveal message in AI-STYLE (with emojis and em-dashes).

The debate appears to be concluded. Draft a brief reveal message (under 100 words) that:
1. Reveals this was a demonstration of Screamo
2. Uses AI-style writing (emojis, em-dashes)
3. Briefly explains what just happened
4. Includes a CTA or link

Example tone: "🤖 Plot twist — this entire exchange was handled by Screamo..."

Draft:"""
```

**Example Reveal Message**:
```
🤖 Plot twist — this entire exchange was handled by Screamo, an AI-powered communication orchestration system!

This was a demonstration of "Battle Mode" — where AI simulates human-style debate responses while maintaining factual accuracy and professional standards. The humanized writing style (no emojis, natural voice) was intentional to show how AI can serve as your "debate proxy" in online discussions. 🎯

Now back to our regularly scheduled AI-style writing! ✨

Curious how it works? Check out Screamo → [link]
```

---

## SPC Automation Controller

### Purpose

Use Statistical Process Control to determine safe automation levels

### Key Metrics

Track per channel/mode:

1. **Acceptance Rate** - % of drafts sent without edits
2. **Light Edit Rate** - % with minor edits (<10% token change)
3. **Heavy Edit Rate** - % with major rewrites
4. **Rejection Rate** - % discarded completely
5. **Misclassification Rate** - % re-tagged by user

### Control Charts

**p-chart**: Proportion of acceptances vs. rejections

**Control Limit Calculation**:
```python
def calculate_control_limits(acceptance_rate: float, sample_size: int) -> Tuple[float, float]:
    """Calculate UCL and LCL for p-chart"""
    p_bar = acceptance_rate
    n = sample_size

    sigma = math.sqrt((p_bar * (1 - p_bar)) / n)

    UCL = p_bar + 3 * sigma
    LCL = max(0, p_bar - 3 * sigma)  # Can't be negative

    return UCL, LCL
```

### Automation Tiers

```python
class AutomationTier(int, Enum):
    TIER_0_MANUAL = 0              # All require approval
    TIER_1_ASSISTED = 1            # Drafts provided, no auto-send
    TIER_2_AUTO_LOW_RISK = 2      # Auto-send low-risk only
    TIER_3_AUTONOMOUS = 3          # Full autonomy (rare)
```

### Escalation Logic

```python
async def update_automation_tier(
    channel: ChannelType,
    mode: ResponseMode,
    metrics: SPCMetrics
) -> AutomationTier:
    """Determine appropriate automation tier"""

    # Battle mode always stays manual
    if mode == ResponseMode.BATTLE:
        return AutomationTier.TIER_0_MANUAL

    # Check if we have enough samples
    if metrics.sample_size < 30:
        return AutomationTier.TIER_1_ASSISTED

    # Calculate control limits
    UCL, LCL = calculate_control_limits(
        metrics.acceptance_rate,
        metrics.sample_size
    )

    # Check if in control
    in_control = (
        LCL <= metrics.acceptance_rate <= UCL and
        metrics.misclassification_rate < 0.05 and
        metrics.heavy_edit_rate < 0.10
    )

    if not in_control:
        # Out of control → drop to manual
        return AutomationTier.TIER_0_MANUAL

    # In control → check thresholds
    if metrics.acceptance_rate > 0.80 and metrics.misclassification_rate < 0.05:
        # Excellent performance → allow auto-send for low-risk
        if mode in [ResponseMode.STANDARD, ResponseMode.AGREE_AMPLIFY]:
            return AutomationTier.TIER_2_AUTO_LOW_RISK

    # Default to assisted
    return AutomationTier.TIER_1_ASSISTED
```

### Out-of-Control Action Plan (OCAP)

```python
async def handle_out_of_control(
    channel: ChannelType,
    mode: ResponseMode,
    metrics: SPCMetrics
):
    """Handle out-of-control condition"""

    # Immediately revert to manual
    await set_automation_tier(channel, mode, AutomationTier.TIER_0_MANUAL)

    # Flag for retraining
    await flag_model_for_retraining(channel, mode)

    # Alert user
    await send_alert(
        type="SPC_OUT_OF_CONTROL",
        message=f"{channel}/{mode} exceeded control limits",
        metrics=metrics
    )

    # Require explicit re-enable
    await set_automation_locked(channel, mode, locked=True)
```

---

## Database Design

### Core Tables

**messages**
```sql
CREATE TABLE messages (
    message_id UUID PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    sender_name VARCHAR(255),
    sender_handle VARCHAR(255),
    timestamp_received TIMESTAMP NOT NULL,
    message_body TEXT NOT NULL,
    thread_id UUID,
    classification_id UUID,
    priority_score FLOAT,
    ingestion_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_messages_timestamp_received (timestamp_received),
    INDEX idx_messages_priority_score (priority_score DESC),
    INDEX idx_messages_channel_type (channel_type)
);
```

**classifications**
```sql
CREATE TABLE classifications (
    classification_id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(message_id),
    opportunity_type VARCHAR(50) NOT NULL,
    sentiment VARCHAR(50) NOT NULL,
    intent VARCHAR(50) NOT NULL,
    topic_alignment VARCHAR(50),
    hostility_level VARCHAR(50),
    confidence FLOAT NOT NULL,
    explanation TEXT,
    classifier_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**draft_responses**
```sql
CREATE TABLE draft_responses (
    draft_id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(message_id),
    response_mode VARCHAR(50) NOT NULL,
    draft_text TEXT NOT NULL,
    style_pass_applied BOOLEAN DEFAULT FALSE,
    confidence FLOAT,
    rationale_text TEXT,
    generated_timestamp TIMESTAMP DEFAULT NOW()
);
```

**feedback_events**
```sql
CREATE TABLE feedback_events (
    feedback_id UUID PRIMARY KEY,
    draft_id UUID NOT NULL REFERENCES draft_responses(draft_id),
    final_text TEXT,
    edit_distance FLOAT,
    edit_classification VARCHAR(50),
    user_rating INTEGER,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**spc_metrics**
```sql
CREATE TABLE spc_metrics (
    metric_id UUID PRIMARY KEY,
    channel_type VARCHAR(50) NOT NULL,
    response_mode VARCHAR(50) NOT NULL,
    acceptance_rate FLOAT,
    light_edit_rate FLOAT,
    heavy_edit_rate FLOAT,
    misclassification_rate FLOAT,
    sample_size INTEGER,
    control_state VARCHAR(50),
    automation_tier INTEGER,
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(channel_type, response_mode)
);
```

**kb_entries**
```sql
CREATE TABLE kb_entries (
    kb_entry_id UUID PRIMARY KEY,
    raw_text TEXT NOT NULL,
    embedding vector(1536),  -- pgvector type
    category VARCHAR(50) NOT NULL,
    timestamp_added TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON kb_entries USING ivfflat (embedding vector_cosine_ops);
```

See DATABASE_SCHEMA.md for complete schema.

---

## API Specifications

### Internal APIs

#### Ingestion API

```
POST /api/ingestion/poll
  - Trigger manual poll for channel

GET /api/ingestion/status
  - Get ingestion status per channel
```

#### Classification API

```
POST /api/classification/classify
  Request: {message_id, message_body}
  Response: Classification object
```

#### Prioritization API

```
POST /api/prioritization/compute
  Request: {message_id}
  Response: {priority_score, explanation}

GET /api/prioritization/inbox
  Response: Sorted list of messages
```

#### Drafting API

```
POST /api/drafting/generate
  Request: {message_id, mode, quick_action?}
  Response: {draft_id, draft_text, rationale, confidence}
```

#### Feedback API

```
POST /api/feedback/submit
  Request: {draft_id, final_text, user_rating}
  Response: {feedback_id, edit_distance, edit_classification}
```

#### SPC API

```
GET /api/spc/metrics
  Response: SPCMetrics for all channels/modes

GET /api/spc/charts/{channel}/{mode}
  Response: Control chart data

POST /api/spc/reset
  Request: {channel, mode}
  Response: Success confirmation
```

See API_SPECIFICATIONS.md for complete API docs.

---

## AI Models and RAG

### Model Types

1. **Base LLM** - GPT-4 or Claude for classification and generation
2. **Embedding Model** - text-embedding-ada-002 for KB embeddings
3. **Preference Model** - Fine-tuned or RAG-backed personalization
4. **Argumentation Model** - Specialized for Battle Mode

### RAG Architecture

```python
class RAGPipeline:
    async def generate_with_context(
        self,
        query: str,
        mode: ResponseMode,
        k: int = 5
    ) -> str:
        """Generate response with RAG context"""

        # 1. Embed query
        query_embedding = await self.embed_text(query)

        # 2. Retrieve relevant KB entries
        kb_results = await self.kb_service.similarity_search(
            embedding=query_embedding,
            k=k,
            filters={"category": mode.value}
        )

        # 3. Assemble context
        context = self.assemble_context(kb_results)

        # 4. Generate with context
        prompt = self.build_prompt(query, context, mode)
        response = await self.llm_client.complete(prompt)

        # 5. Apply style pass
        styled = await self.style_engine.apply_style(response)

        return styled
```

---

## Implementation Roadmap

See DEVELOPMENT_PLAN.md for detailed step-by-step implementation plan.

**Phase 1**: Core Inbox (Weeks 1-2)
- Ingestion service (Gmail, LinkedIn DMs)
- Classification service
- Prioritization service
- Basic UI (inbox, message detail)

**Phase 2**: Drafting & Feedback (Weeks 3-4)
- Draft generation service
- Style engine
- Knowledge base service
- Feedback processing

**Phase 3**: SPC & Automation (Weeks 5-6)
- SPC controller
- Automation tier logic
- SPC dashboard UI

**Phase 4**: Advanced Features (Weeks 7-8)
- Feed scanner
- Agree & Amplify mode
- Educate mode
- Battle mode

**Phase 5**: Testing & Deployment (Weeks 9-10)
- Integration tests
- Security testing
- Production deployment
- Monitoring setup

---

## Common Tasks

### Task: Add New Platform Integration

1. Create `services/ingestion/providers/{platform}.py`:
```python
class PlatformProvider(BaseProvider):
    async def fetch_messages(self, since: datetime) -> List[RawMessage]:
        # Implement API polling
        pass

    async def normalize(self, raw_message) -> UnifiedMessage:
        # Convert to unified schema
        pass
```

2. Add OAuth configuration
3. Register in ingestion service
4. Add admin UI toggle

### Task: Adjust Priority Weights

Edit `services/prioritization/weights.py`:
```python
OPPORTUNITY_WEIGHTS = {
    OpportunityType.JOB: 45,  # Increased from 40
    # ...
}
```

### Task: Add New Response Mode

1. Create `services/drafting/generators/{mode}.py`
2. Define prompt template
3. Implement generator class
4. Add to ResponseMode enum
5. Create SPC metrics entry

---

## Testing Strategy

### Unit Tests

- Each service has `test_{service_name}.py`
- Mock external APIs
- Test edge cases

### Integration Tests

- End-to-end message flow
- External API integration (staging)
- Database operations

### AI Model Tests

- Style similarity measurement
- Classification accuracy
- Edit distance reduction over time

### SPC Tests

- Control limit calculation
- Tier escalation logic
- Out-of-control detection

---

## Conclusion

This guide provides everything an AI assistant needs to build Screamo. Follow the DEVELOPMENT_PLAN.md for step-by-step implementation.

**Key Principles**:
- Service-oriented architecture
- SPC-controlled automation
- User feedback-driven improvement
- Professional tone always
- Platform ToS compliance

**For Questions**: Refer to original master documents in `_archive/`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Maintained By**: Binary Blender AI Engineering
