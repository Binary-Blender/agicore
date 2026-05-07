# SCREAMO
## AI-Powered Multi-Channel Communication Orchestration

**Version:** 1.0
**Status:** Development
**Last Updated:** 2025-11-23

---

## OVERVIEW

**Screamo** is an intelligent communication orchestration system that uses AI to manage, prioritize, and respond to messages across multiple channels (Email, LinkedIn, YouTube). It employs **Statistical Process Control (SPC)** to progressively automate responses while maintaining quality and human oversight.

### Key Features

🤖 **AI-Driven Classification** - Automatically categorizes messages by opportunity type, sentiment, and priority

📊 **Unified Inbox** - All channels consolidated with intelligent prioritization

✍️ **Smart Draft Generation** - Four response modes (Standard, Agree & Amplify, Educate, Battle)

📈 **SPC-Based Automation** - Progressive automation based on quality metrics

🎯 **Knowledge Base & RAG** - Style-matched responses using vector embeddings

🔍 **Feed Scanner** - Proactive engagement opportunities on LinkedIn

---

## PROBLEM STATEMENT

High-volume communicators face three critical challenges:

1. **Overwhelming Inbox** - Messages scattered across email, LinkedIn, YouTube, etc.
2. **Lost Opportunities** - High-value messages buried under spam and logistics
3. **Time Drain** - Hours spent composing thoughtful, personalized responses

### The Screamo Solution

Screamo solves these problems by:

- **Ingesting** messages from all channels into a unified inbox
- **Classifying** each message by opportunity type and priority
- **Generating** AI drafts that match your writing style
- **Learning** from your edits to improve over time
- **Automating** proven response patterns while maintaining quality control

---

## ARCHITECTURE HIGHLIGHTS

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      SCREAMO SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Ingestion   │  │Classification│  │Prioritization│     │
│  │   Service    │─▶│   Service    │─▶│   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                                      │            │
│         ▼                                      ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Messages   │  │     Draft    │  │   Feedback   │     │
│  │   Database   │  │  Generation  │  │  Processing  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                           │                   │            │
│                           ▼                   ▼            │
│                    ┌──────────────┐  ┌──────────────┐     │
│                    │ Knowledge    │  │     SPC      │     │
│                    │    Base      │  │  Controller  │     │
│                    │  (Vectors)   │  │              │     │
│                    └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- Python 3.10+ with FastAPI
- PostgreSQL 14+ (pgvector for embeddings)
- Redis (job queue)
- SQLAlchemy + Alembic

**AI/ML:**
- OpenAI GPT-4 (classification & generation)
- sentence-transformers (embeddings)
- RAG (Retrieval-Augmented Generation)
- SPC (Statistical Process Control)

**Frontend:**
- React 18 + TypeScript
- TailwindCSS
- React Query
- Recharts (SPC visualization)

**Infrastructure:**
- Docker + Docker Compose
- Kubernetes (production)
- GitHub Actions (CI/CD)

---

## QUICK START

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- OpenAI API Key

### Get Running in 5 Minutes

```bash
# 1. Clone repository
git clone https://github.com/yourorg/screamo.git
cd screamo

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start all services
docker-compose up -d

# 4. Run migrations
docker-compose exec backend alembic upgrade head

# 5. Open browser
open http://localhost:3000
```

**See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.**

---

## DOCUMENTATION

### For Developers

| Document | Purpose | Audience |
|----------|---------|----------|
| **[AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md)** | Complete technical reference with code examples | AI agents, senior devs |
| **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** | Step-by-step implementation roadmap | All developers |
| **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** | Database design and SQL schemas | Backend devs, DBAs |
| **[API_SPECIFICATIONS.md](./API_SPECIFICATIONS.md)** | Full API reference documentation | API consumers, integrators |
| **[QUICK_START.md](./QUICK_START.md)** | 15-minute setup guide | New developers |

### Documentation Index

**Getting Started:**
1. Read this README for overview
2. Follow [QUICK_START.md](./QUICK_START.md) to set up dev environment
3. Review [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md) for architecture deep dive

**Building Features:**
1. Check [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for sprint structure
2. Reference [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data models
3. Use [API_SPECIFICATIONS.md](./API_SPECIFICATIONS.md) for endpoint details

---

## RESPONSE MODES

Screamo supports four intelligent response modes with a **unique dual-style system**:

### 🎨 DUAL-STYLE WRITING SYSTEM

**The Innovation:** Screamo uses TWO distinct writing styles:

1. **AI-Style Writing** (Modes 1-3) — Embrace transparency! 🤖
   - Uses emojis liberally for warmth and clarity
   - Em-dashes (—) for sophisticated flow
   - Polished, well-formatted, obviously AI-generated
   - **Why?** People love how AI writes — and transparency builds trust!

2. **Humanized Writing** (Battle Mode) — Your debate proxy! 👤
   - NO emojis, natural human voice
   - Casual, conversational, firm when needed
   - Simulates YOU in online debates
   - After "winning," reveals it was AI with a final message

---

### 1. STANDARD — AI-Style ✨
Professional responses with AI flair for general communication.

**Example:**
```
Original: "Would you be interested in collaborating on a project?"

Draft: "Hi Sarah! 👋

Thanks for reaching out — I'd be happy to explore this collaboration! 🤝

I'm particularly interested in hearing more about the project scope and
your vision. A few quick questions:
• Timeline — when are you hoping to kick this off?
• Your goals — what are you trying to achieve?
• Next steps — happy to jump on a call this week! 📅

Looking forward to learning more! ✨

Best,
[User]"
```

---

### 2. AGREE & AMPLIFY — AI-Style 💯
Enthusiastically support aligned viewpoints with distinctive insights.

**Example:**
```
Original Post: "AI is transforming software development workflows!"

Draft Comment: "Absolutely! 💯

This is exactly what we're seeing in production — AI doesn't replace
developers, it augments them. We've reduced QC costs by 95% while
maintaining quality by combining AI capabilities with proper human
oversight. 🎯

The key insight here: Statistical Process Control isn't just for
manufacturing anymore. When you apply SPC principles to AI workflows,
you get progressive automation that earns trust through proven
performance — not blind faith. 📊

The future is human+AI, not human vs. AI. 🤝✨"
```

---

### 3. EDUCATE — AI-Style 👍
Politely correct with the "compliment sandwich" approach.

**Example:**
```
Original: "AI will replace all developers by 2025."

Draft: "I appreciate this perspective! 👍

You're absolutely right that AI is transforming workflows — that part is
undeniable. However, the "replacement" framing might miss some important
nuance. 🤔

Recent studies from MIT and Stanford show AI augments rather than replaces
developers. Let me share why..."
```

### 4. BATTLE MODE — Humanized Style 👤
Structured rebuttals that act as your **AI debate proxy**.

**The Magic:** Writes like a HUMAN (no emojis, natural voice) to simulate your intervention in online debates. After the exchange concludes, automatically reveals it was AI with a final message!

**Example (Main Rebuttal - Humanized):**
```
Original: "Your approach is completely wrong and won't work."

Draft: "Let's address your claims one by one.

You state that my approach is completely wrong, but I think you're missing
some key context. Recent industry data from Gartner shows this exact
pattern succeeding at scale — I can share the report if you'd like.

Your concern about it not working overlooks three things:
1. We've already implemented this in production with 500+ users
2. The failure modes you're worried about are handled by our SPC system
3. Your alternative approach has documented limitations in peer-reviewed research

Here's the thing: I've built this, measured it, and iterated on it. The
results speak for themselves. Your skepticism was valid two years ago.
It's outdated now."
```

**After Exchange Concludes - Auto-Reveal (AI-Style):**
```
🤖 Plot twist — this entire exchange was handled by Screamo, an AI-powered
communication orchestration system!

This was a demonstration of "Battle Mode" — where AI simulates human-style
debate responses while maintaining factual accuracy and professional
standards. The humanized writing style (no emojis, natural voice) was
intentional to show how AI can serve as your "debate proxy" in online
discussions. 🎯

Now back to our regularly scheduled AI-style writing! ✨

Curious how it works? Check out Screamo → [link]
```

**Note:** Battle mode ALWAYS requires human approval before sending. NEVER automated.

---

## SPC-BASED AUTOMATION

Screamo uses **Statistical Process Control** to progressively automate responses based on proven quality.

### Automation Tiers

| Tier | Name | Behavior | Requirements |
|------|------|----------|--------------|
| **0** | Manual Only | All drafts require human approval | Default state |
| **1** | Assisted Drafting | Generates drafts, no auto-send | 50+ samples, 80%+ acceptance |
| **2** | Auto Low-Risk | Auto-sends STANDARD & AGREE_AMPLIFY | 100+ samples, 95%+ acceptance |
| **3** | Autonomous | Full automation (experimental) | 500+ samples, 98%+ acceptance |

### Control Chart Example

```
Acceptance Rate Over Time
100% ┤                                    ●●●●
 95% ┤                              ●●●●●●
 90% ┤                        ●●●●●●
 85% ┤                  ●●●●●●
 80% ┤            ●●●●●●
 75% ┤      ●●●●●●
 70% ┤●●●●●●
     └────────────────────────────────────────▶
      0    10   20   30   40   50   60  samples

      ─────── UCL (Upper Control Limit)
      - - - - Mean (p-bar)
      ─────── LCL (Lower Control Limit)
```

**Automation increases only when metrics stay IN CONTROL.**

---

## WORKFLOW EXAMPLE

### End-to-End Message Flow

```
1. INGESTION
   Gmail API → Normalized Message → Database

2. CLASSIFICATION
   LLM Analysis → {
     opportunity_type: "PARTNERSHIP",
     sentiment: "POSITIVE",
     confidence: 0.92
   }

3. PRIORITIZATION
   Weighted Score → priority_score: 85.3

4. UNIFIED INBOX
   User sees: "High Priority Partnership from Sarah Johnson"

5. DRAFT GENERATION
   RAG Retrieval → Style Matching → Draft:
   "Hi Sarah, thank you for reaching out..."

6. HUMAN REVIEW
   User edits: "Thanks for reaching out!" (tone adjustment)

7. FEEDBACK PROCESSING
   Edit Distance: 0.15 (light edit)
   Classification: "TONE"
   → Update preference model

8. SPC UPDATE
   Acceptance Rate: 68% → 69%
   Still in control → Maintain Tier 1
```

---

## KEY METRICS

### Quality Metrics

- **Classification Accuracy:** > 90% target
- **Draft Acceptance Rate:** > 50% (without edits)
- **Light Edit Rate:** 20-30% (minor tweaks)
- **Heavy Edit Rate:** < 10% (major rewrites)
- **Response Time:** < 2 seconds for draft generation

### Automation Metrics

- **SPC Sample Size:** 30 messages per rolling window
- **Control State:** IN_CONTROL, WARNING, OUT_OF_CONTROL
- **Tier Progression:** 0 → 1 → 2 over weeks/months

### Business Metrics

- **Time Saved:** Hours per week tracking
- **Opportunities Captured:** High-value messages responded to
- **Engagement Rate:** LinkedIn feed scanner success rate

---

## SECURITY & PRIVACY

### Data Protection

- ✅ **OAuth 2.0** for all external integrations
- ✅ **JWT tokens** for API authentication
- ✅ **Encrypted storage** for API credentials
- ✅ **No data sharing** - All processing local/private cloud
- ✅ **GDPR compliant** data retention policies

### Access Control

- **User Isolation:** Each user's data completely isolated
- **Admin Controls:** Separate admin panel with audit logs
- **API Rate Limiting:** Prevent abuse and ensure fair usage

---

## ROADMAP

### Phase 1: MVP (Current)
- [x] Core ingestion (Email, LinkedIn)
- [x] Classification service
- [x] Draft generation (STANDARD mode)
- [x] Basic UI (Inbox, Message Detail)
- [ ] SPC controller implementation
- [ ] Initial deployment

### Phase 2: AI Enhancement
- [ ] All 4 response modes
- [ ] Knowledge base with vector search
- [ ] Style learning and preference modeling
- [ ] Feed scanner for LinkedIn

### Phase 3: Advanced Features
- [ ] YouTube comment integration
- [ ] Battle mode with argumentation engine
- [ ] Advanced SPC visualizations
- [ ] Multi-user/team support

### Phase 4: Scale & Polish
- [ ] Mobile apps (iOS/Android)
- [ ] Voice message support
- [ ] Advanced analytics dashboard
- [ ] Public API for integrations

---

## CONTRIBUTING

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for implementation
4. Write tests (minimum 80% coverage)
5. Submit PR with clear description

### Code Standards

- **Python:** Black formatting, type hints, docstrings
- **TypeScript:** ESLint + Prettier, strict mode
- **Commits:** Conventional commits format
- **Tests:** Pytest (backend), Jest (frontend)

---

## TEAM

**Project Lead:** [Your Name]
**AI Architecture:** [AI Architect]
**Backend Lead:** [Backend Dev]
**Frontend Lead:** [Frontend Dev]
**DevOps:** [DevOps Engineer]

---

## LICENSE

[Insert License - MIT, Apache 2.0, etc.]

---

## SUPPORT

**Documentation:**
- [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md) - Technical deep dive
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - Implementation guide
- [API_SPECIFICATIONS.md](./API_SPECIFICATIONS.md) - API reference
- [QUICK_START.md](./QUICK_START.md) - Setup guide

**Community:**
- GitHub Issues: Report bugs and request features
- Slack: #screamo-dev channel
- Email: dev@screamo.app

**Resources:**
- [Original Requirements](./screamo_docs_01.txt)
- [Strategic Documentation](./_archive/)

---

## ACKNOWLEDGMENTS

Built with inspiration from:
- Statistical Process Control principles from manufacturing
- RAG architecture patterns from modern AI systems
- Binary Blender Orchestrator design patterns

Powered by:
- OpenAI GPT-4 for classification and generation
- PostgreSQL + pgvector for data and embeddings
- FastAPI for high-performance APIs
- React for responsive UI

---

**Start building smarter communication workflows today! 🚀**

```bash
docker-compose up -d
```

See you in the inbox! 📬
