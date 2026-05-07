# SCREAMO DEVELOPMENT PLAN - PHASE 2
## AI Integration & Knowledge Base

**Version:** 1.0
**Last Updated:** 2025-11-23
**Duration:** 2-3 weeks
**Dependencies:** Phase 1 complete

---

## TABLE OF CONTENTS

1. [Phase 2 Overview](#phase-2-overview)
2. [Sprint 2.1: Draft Generation Service](#sprint-21-draft-generation-service)
3. [Sprint 2.2: Knowledge Base & Embeddings](#sprint-22-knowledge-base--embeddings)
4. [Sprint 2.3: Style Engine & RAG](#sprint-23-style-engine--rag)
5. [Sprint 2.4: All Response Modes](#sprint-24-all-response-modes)
6. [Phase 2 Testing & Validation](#phase-2-testing--validation)

---

## PHASE 2 OVERVIEW

### Objectives

Phase 2 focuses on building the AI-powered response generation system:

- Draft generation for all 4 response modes
- Knowledge base with vector embeddings
- Style engine for writing style matching
- RAG (Retrieval-Augmented Generation) pipeline
- Feedback processing and learning loop

### Success Criteria

- [ ] All 4 response modes functional
- [ ] Style-matched drafts generated
- [ ] Knowledge base searchable via embeddings
- [ ] Feedback loop collecting training data
- [ ] Draft acceptance rate > 40% in testing

---

## SPRINT 2.1: DRAFT GENERATION SERVICE

**Duration:** 5-7 days

---

### STEP 2.1.1: Create Draft Response Model

**File: `backend/src/models/draft_response.py`**
```python
from sqlalchemy import Column, String, Text, Boolean, Float, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.core.database import Base
import uuid
import enum

class ResponseMode(str, enum.Enum):
    STANDARD = "STANDARD"
    AGREE_AMPLIFY = "AGREE_AMPLIFY"
    EDUCATE = "EDUCATE"
    BATTLE = "BATTLE"

class DraftResponse(Base):
    __tablename__ = "draft_responses"

    draft_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.message_id"), nullable=False)
    response_mode = Column(Enum(ResponseMode), nullable=False)
    draft_text = Column(Text, nullable=False)
    style_pass_applied = Column(Boolean, default=False)
    confidence = Column(Float)
    rationale_text = Column(Text)

    # Relationships
    message = relationship("Message", back_populates="draft_responses")
    feedback_events = relationship("FeedbackEvent", back_populates="draft")
```

**Migration:**
```bash
cd backend
alembic revision -m "create draft_responses table"
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] DraftResponse model created
- [ ] ResponseMode enum defined
- [ ] Migration applied
- [ ] Foreign key to messages working

---

### STEP 2.1.2: Create Feedback Event Model

**File: `backend/src/models/feedback_event.py`**
```python
from sqlalchemy import Column, String, Text, Boolean, Float, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.core.database import Base
import uuid
import enum

class EditClassification(str, enum.Enum):
    TONE = "TONE"
    FACTUAL_CORRECTION = "FACTUAL_CORRECTION"
    STRUCTURAL = "STRUCTURAL"
    OTHER = "OTHER"

class FeedbackEvent(Base):
    __tablename__ = "feedback_events"

    feedback_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    draft_id = Column(UUID(as_uuid=True), ForeignKey("draft_responses.draft_id"), nullable=False)
    final_text = Column(Text)
    edit_distance = Column(Float)  # 0.0 to 1.0
    edit_classification = Column(Enum(EditClassification))
    user_rating = Column(Integer)  # 1-5
    was_accepted = Column(Boolean, default=False)
    was_sent = Column(Boolean, default=False)

    # Relationships
    draft = relationship("DraftResponse", back_populates="feedback_events")
```

**Migration:**
```bash
alembic revision -m "create feedback_events table"
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] FeedbackEvent model created
- [ ] EditClassification enum defined
- [ ] Migration applied
- [ ] Relationship to drafts working

---

### STEP 2.1.3: Create Draft Generation Prompts

**File: `backend/src/services/prompts/standard_prompt.py`**
```python
STANDARD_SYSTEM_PROMPT = """You are a professional communication assistant helping craft personalized responses.

CRITICAL STYLE REQUIREMENTS:
- Use emojis liberally for warmth and clarity (2-4 emojis total)
- Use em-dashes (—) for sophisticated transitions
- Make it obviously AI-generated (polished, well-formatted)
- Embrace modern AI writing aesthetics

Your responses should:
1. Open with friendly emoji and warm greeting 👋
2. Address the main points with clarity
3. Use em-dashes for elegant flow
4. Include relevant emojis for emphasis 🎯
5. End with clear next steps and closing emoji ✨
6. Stay concise but warm

Example tone: "Hi Sarah! 👋 Thanks for reaching out — I'd love to explore this partnership opportunity! 🤝"
"""

def build_standard_prompt(
    message_body: str,
    sender_name: str,
    classification: dict,
    style_examples: list = None
) -> str:
    """Build prompt for STANDARD response mode"""

    prompt = f"""Draft a professional response to this message:

FROM: {sender_name}
MESSAGE TYPE: {classification.get('opportunity_type', 'UNKNOWN')}
SENTIMENT: {classification.get('sentiment', 'NEUTRAL')}

ORIGINAL MESSAGE:
{message_body}

"""

    if style_examples:
        prompt += "\nSTYLE EXAMPLES (match this writing style):\n"
        for i, example in enumerate(style_examples[:3], 1):
            prompt += f"\nExample {i}:\n{example}\n"

    prompt += """
Draft a response that:
- Addresses their main points
- Matches the style examples above
- Uses emojis and em-dashes per guidelines
- Includes clear next steps
- Stays under 200 words

DRAFT:"""

    return prompt
```

**File: `backend/src/services/prompts/agree_amplify_prompt.py`**
```python
AGREE_AMPLIFY_SYSTEM_PROMPT = """You are crafting supportive comments for aligned LinkedIn posts.

CRITICAL STYLE REQUIREMENTS:
- Use emojis to show enthusiasm (2-3 emojis)
- Use em-dashes for sophisticated flow
- Make it obviously AI-generated but engaging
- Polished, well-formatted, professional yet warm

Your comments should:
1. Start with enthusiastic agreement + emoji ("Absolutely! 💯", "This! 🎯")
2. Add distinctive insight using em-dashes
3. Include micro-framework or example if relevant
4. Use emojis for emphasis and visual appeal
5. Stay under 150 words
6. Sound polished and AI-enhanced

Example: "Absolutely! 💯 This is exactly what we're seeing in production — AI doesn't replace developers, it augments them..."
"""

def build_agree_amplify_prompt(
    post_body: str,
    post_author: str,
    alignment_reason: str,
    style_examples: list = None
) -> str:
    """Build prompt for AGREE_AMPLIFY mode"""

    prompt = f"""Draft a supportive LinkedIn comment for this post:

AUTHOR: {post_author}
POST:
{post_body}

WHY THIS ALIGNS:
{alignment_reason}

"""

    if style_examples:
        prompt += "\nSTYLE EXAMPLES:\n"
        for example in style_examples[:2]:
            prompt += f"\n{example}\n"

    prompt += """
Draft a comment that:
- Enthusiastically agrees
- Adds unique insight or example
- Uses emojis and em-dashes
- Under 150 words

COMMENT:"""

    return prompt
```

**File: `backend/src/services/prompts/educate_prompt.py`**
```python
EDUCATE_SYSTEM_PROMPT = """You are crafting educational corrections using the "compliment sandwich" approach.

CRITICAL STYLE REQUIREMENTS:
- Use emojis to soften the correction (thoughtful, not aggressive)
- Use em-dashes for elegant transitions
- Make it obviously AI-generated but respectful
- Polished "compliment sandwich" structure

Structure:
1. COMPLIMENT: Find something they got right + friendly emoji 👍
2. EDUCATION: Add nuance using em-dashes — present alternative perspective
3. WRAP: Encouragement or common-ground statement + positive emoji ✨

Example: "I appreciate this perspective! 👍 One thing I'd add — recent data from MIT suggests..."
"""

def build_educate_prompt(
    post_body: str,
    post_author: str,
    misalignment_reason: str,
    evidence: str = None,
    style_examples: list = None
) -> str:
    """Build prompt for EDUCATE mode"""

    prompt = f"""Draft a polite educational response to this post:

AUTHOR: {post_author}
POST:
{post_body}

WHY THIS NEEDS CORRECTION:
{misalignment_reason}

"""

    if evidence:
        prompt += f"\nEVIDENCE/DATA TO CITE:\n{evidence}\n"

    if style_examples:
        prompt += "\nSTYLE EXAMPLES:\n"
        for example in style_examples[:2]:
            prompt += f"\n{example}\n"

    prompt += """
Draft a comment that:
- Opens with acknowledgment + emoji
- Uses em-dashes for corrections
- Cites evidence/data
- Maintains warmth and professionalism
- Under 200 words

COMMENT:"""

    return prompt
```

**File: `backend/src/services/prompts/battle_prompt.py`**
```python
BATTLE_SYSTEM_PROMPT = """You are drafting a professional rebuttal for debates.

CRITICAL STYLE REQUIREMENTS:
- Write like a HUMAN, not an AI
- NO emojis whatsoever
- NO em-dashes or polished formatting
- Natural, conversational but firm
- Use casual transitions ("Look," "Here's the thing," "Let's be clear")
- Vary sentence length naturally

This simulates the user's human voice in debate.

Structure:
1. CLARIFY: Restate opponent's main claims objectively
2. DECONSTRUCT: Address each claim with evidence and logic
3. RE-ASSERT: Succinctly restate your position
4. CLOSE: Firm but professional closing

Rules:
- NO personal attacks
- NO profanity
- Firm but professional
- Fact-based
- Natural human voice
- Under 300 words
"""

def build_battle_prompt(
    opponent_message: str,
    user_stance: str,
    evidence: str = None
) -> str:
    """Build prompt for BATTLE mode"""

    prompt = f"""Draft a structured rebuttal for this debate:

OPPONENT'S CLAIMS:
{opponent_message}

YOUR POSITION:
{user_stance}

"""

    if evidence:
        prompt += f"\nEVIDENCE AVAILABLE:\n{evidence}\n"

    prompt += """
Draft a rebuttal that:
- Writes in natural human voice (NO emojis, NO AI polish)
- Systematically addresses each claim
- Uses evidence and logic
- Maintains professionalism
- Firm but respectful

REBUTTAL:"""

    return prompt

BATTLE_REVEAL_PROMPT = """Generate a reveal message in AI-STYLE (with emojis and em-dashes).

The debate appears to be concluded. Draft a brief reveal message (under 100 words) that:
1. Reveals this was a demonstration of Screamo
2. Uses AI-style writing (emojis, em-dashes)
3. Briefly explains what just happened
4. Includes a CTA or link

Example tone: "🤖 Plot twist — this entire exchange was handled by Screamo..."

REVEAL MESSAGE:"""
```

**Acceptance Criteria:**
- [ ] All 4 response mode prompts created
- [ ] System prompts defined with style guidelines
- [ ] Prompt builder functions implemented
- [ ] Style example injection working

---

### STEP 2.1.4: Create Draft Generation Service

**File: `backend/src/services/draft_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.message import Message
from src.models.draft_response import DraftResponse, ResponseMode
from src.services.prompts import standard_prompt, agree_amplify_prompt, educate_prompt, battle_prompt
from src.core.config import settings
import openai
import logging

logger = logging.getLogger(__name__)

class DraftService:
    """Service for generating AI draft responses"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_draft(
        self,
        message_id: str,
        mode: ResponseMode,
        style_examples: list = None
    ) -> DraftResponse:
        """Generate draft response for a message"""

        # Fetch message with classification
        result = await self.db.execute(
            select(Message).where(Message.message_id == message_id)
        )
        message = result.scalar_one_or_none()

        if not message:
            raise ValueError(f"Message {message_id} not found")

        if not message.classification:
            raise ValueError(f"Message {message_id} not classified yet")

        # Select appropriate prompt builder
        prompt_builder = self._get_prompt_builder(mode)

        # Build context
        classification_dict = {
            "opportunity_type": message.classification.opportunity_type.value,
            "sentiment": message.classification.sentiment.value,
            "confidence": message.classification.confidence
        }

        # Generate user prompt
        user_prompt = prompt_builder(
            message_body=message.message_body,
            sender_name=message.sender_name,
            classification=classification_dict,
            style_examples=style_examples or []
        )

        # Get system prompt
        system_prompt = self._get_system_prompt(mode)

        # Call LLM
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )

            draft_text = response.choices[0].message.content.strip()

            # Create draft
            draft = DraftResponse(
                message_id=message.message_id,
                response_mode=mode,
                draft_text=draft_text,
                style_pass_applied=bool(style_examples),
                confidence=0.85  # TODO: Calculate from classification confidence
            )

            self.db.add(draft)
            await self.db.commit()
            await self.db.refresh(draft)

            logger.info(f"Generated {mode.value} draft for message {message_id}")
            return draft

        except Exception as e:
            logger.error(f"Draft generation failed: {e}")
            await self.db.rollback()
            raise

    def _get_prompt_builder(self, mode: ResponseMode):
        """Get prompt builder function for mode"""
        builders = {
            ResponseMode.STANDARD: standard_prompt.build_standard_prompt,
            ResponseMode.AGREE_AMPLIFY: agree_amplify_prompt.build_agree_amplify_prompt,
            ResponseMode.EDUCATE: educate_prompt.build_educate_prompt,
            ResponseMode.BATTLE: battle_prompt.build_battle_prompt
        }
        return builders[mode]

    def _get_system_prompt(self, mode: ResponseMode) -> str:
        """Get system prompt for mode"""
        prompts = {
            ResponseMode.STANDARD: standard_prompt.STANDARD_SYSTEM_PROMPT,
            ResponseMode.AGREE_AMPLIFY: agree_amplify_prompt.AGREE_AMPLIFY_SYSTEM_PROMPT,
            ResponseMode.EDUCATE: educate_prompt.EDUCATE_SYSTEM_PROMPT,
            ResponseMode.BATTLE: battle_prompt.BATTLE_SYSTEM_PROMPT
        }
        return prompts[mode]

    async def regenerate_draft(
        self,
        draft_id: str,
        mode: ResponseMode = None,
        style_examples: list = None
    ) -> DraftResponse:
        """Regenerate an existing draft"""

        result = await self.db.execute(
            select(DraftResponse).where(DraftResponse.draft_id == draft_id)
        )
        old_draft = result.scalar_one_or_none()

        if not old_draft:
            raise ValueError(f"Draft {draft_id} not found")

        # Generate new draft with same or different mode
        new_mode = mode or old_draft.response_mode
        new_draft = await self.generate_draft(
            message_id=str(old_draft.message_id),
            mode=new_mode,
            style_examples=style_examples
        )

        return new_draft
```

**Acceptance Criteria:**
- [ ] DraftService created
- [ ] All 4 modes generate drafts
- [ ] LLM integration working
- [ ] Style examples injected
- [ ] Error handling robust

---

### STEP 2.1.5: Create Draft API Endpoints

**File: `backend/src/api/drafts.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.draft_service import DraftService
from src.models.draft_response import ResponseMode
from src.schemas.draft import DraftRequest, DraftResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/drafts", tags=["drafts"])

@router.post("/generate/{message_id}", response_model=DraftResponse)
async def generate_draft(
    message_id: str,
    request: DraftRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate AI draft response"""
    try:
        service = DraftService(db)
        draft = await service.generate_draft(
            message_id=message_id,
            mode=ResponseMode(request.response_mode),
            style_examples=request.style_examples
        )
        return draft
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate/{draft_id}", response_model=DraftResponse)
async def regenerate_draft(
    draft_id: str,
    request: DraftRequest,
    db: AsyncSession = Depends(get_db)
):
    """Regenerate existing draft"""
    try:
        service = DraftService(db)
        draft = await service.regenerate_draft(
            draft_id=draft_id,
            mode=ResponseMode(request.response_mode) if request.response_mode else None,
            style_examples=request.style_examples
        )
        return draft
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve existing draft"""
    from sqlalchemy import select
    from src.models.draft_response import DraftResponse as DraftModel

    result = await db.execute(
        select(DraftModel).where(DraftModel.draft_id == draft_id)
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    return draft
```

**File: `backend/src/schemas/draft.py`**
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DraftRequest(BaseModel):
    response_mode: str = Field(..., description="STANDARD, AGREE_AMPLIFY, EDUCATE, or BATTLE")
    style_examples: Optional[List[str]] = Field(None, description="Optional style examples")

class DraftResponse(BaseModel):
    draft_id: str
    message_id: str
    response_mode: str
    draft_text: str
    style_pass_applied: bool
    confidence: Optional[float]
    rationale_text: Optional[str]

    class Config:
        from_attributes = True
```

**Add to `backend/src/main.py`:**
```python
from src.api import drafts
app.include_router(drafts.router)
```

**Acceptance Criteria:**
- [ ] Draft endpoints created
- [ ] Generate endpoint working
- [ ] Regenerate endpoint working
- [ ] Get draft endpoint working
- [ ] Request/response schemas validated

---

## SPRINT 2.2: KNOWLEDGE BASE & EMBEDDINGS

**Duration:** 4-5 days

---

### STEP 2.2.1: Create Knowledge Base Model

**File: `backend/src/models/kb_entry.py`**
```python
from sqlalchemy import Column, String, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from src.core.database import Base
from pgvector.sqlalchemy import Vector
import uuid
import enum

class KBCategory(str, enum.Enum):
    STYLE = "STYLE"
    OPINION = "OPINION"
    GOLD_STANDARD_REPLY = "GOLD_STANDARD_REPLY"
    REDLINE_TOPIC = "REDLINE_TOPIC"
    EXPERTISE = "EXPERTISE"

class KBSourceType(str, enum.Enum):
    USER_EMAIL = "USER_EMAIL"
    LINKEDIN_POST = "LINKEDIN_POST"
    APPROVED_DRAFT = "APPROVED_DRAFT"
    MANUAL_ENTRY = "MANUAL_ENTRY"

class KBEntry(Base):
    __tablename__ = "kb_entries"

    kb_entry_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536))  # OpenAI ada-002 dimension
    category = Column(String(50), nullable=False)
    source_type = Column(String(50))
    source_id = Column(UUID(as_uuid=True))
    metadata = Column(JSONB)

    __table_args__ = (
        Index('idx_kb_embedding', 'embedding', postgresql_using='hnsw',
              postgresql_ops={'embedding': 'vector_cosine_ops'}),
        Index('idx_kb_category', 'category'),
    )
```

**Migration:**
```bash
alembic revision -m "create kb_entries table with vector support"
# In migration file, ensure pgvector extension is enabled:
# op.execute('CREATE EXTENSION IF NOT EXISTS vector')
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] KBEntry model created
- [ ] Vector column defined
- [ ] HNSW index created
- [ ] Migration applied successfully

---

### STEP 2.2.2: Create Embedding Service

**File: `backend/src/services/embedding_service.py`**
```python
from openai import AsyncOpenAI
from src.core.config import settings
import logging
from typing import List

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating text embeddings"""

    MODEL = "text-embedding-ada-002"
    DIMENSION = 1536

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            response = await self.client.embeddings.create(
                model=self.MODEL,
                input=text
            )
            embedding = response.data[0].embedding
            logger.debug(f"Generated embedding for text (length: {len(text)})")
            return embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            response = await self.client.embeddings.create(
                model=self.MODEL,
                input=texts
            )
            embeddings = [item.embedding for item in response.data]
            logger.info(f"Generated {len(embeddings)} embeddings")
            return embeddings
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            raise
```

**Acceptance Criteria:**
- [ ] EmbeddingService created
- [ ] Single text embedding working
- [ ] Batch embedding working
- [ ] Error handling in place

---

### STEP 2.2.3: Create Knowledge Base Service

**File: `backend/src/services/kb_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from src.models.kb_entry import KBEntry, KBCategory, KBSourceType
from src.services.embedding_service import EmbeddingService
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class KBService:
    """Service for managing knowledge base entries"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedding_service = EmbeddingService()

    async def add_entry(
        self,
        raw_text: str,
        category: KBCategory,
        source_type: KBSourceType = None,
        source_id: str = None,
        metadata: Dict[str, Any] = None
    ) -> KBEntry:
        """Add entry to knowledge base with embedding"""
        try:
            # Generate embedding
            embedding = await self.embedding_service.embed_text(raw_text)

            # Create entry
            entry = KBEntry(
                raw_text=raw_text,
                embedding=embedding,
                category=category.value,
                source_type=source_type.value if source_type else None,
                source_id=source_id,
                metadata=metadata or {}
            )

            self.db.add(entry)
            await self.db.commit()
            await self.db.refresh(entry)

            logger.info(f"Added KB entry: {category.value}")
            return entry

        except Exception as e:
            logger.error(f"Failed to add KB entry: {e}")
            await self.db.rollback()
            raise

    async def similarity_search(
        self,
        query: str,
        category: KBCategory = None,
        k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search KB using semantic similarity"""
        try:
            # Generate query embedding
            query_embedding = await self.embedding_service.embed_text(query)

            # Build SQL query
            sql = """
                SELECT
                    kb_entry_id,
                    raw_text,
                    category,
                    1 - (embedding <=> :query_embedding) AS similarity
                FROM kb_entries
            """

            params = {"query_embedding": query_embedding, "k": k}

            if category:
                sql += " WHERE category = :category"
                params["category"] = category.value

            sql += " ORDER BY embedding <=> :query_embedding LIMIT :k"

            # Execute
            result = await self.db.execute(text(sql), params)
            rows = result.fetchall()

            # Format results
            results = [
                {
                    "kb_entry_id": str(row[0]),
                    "raw_text": row[1],
                    "category": row[2],
                    "similarity_score": float(row[3])
                }
                for row in rows
            ]

            logger.info(f"Found {len(results)} similar entries")
            return results

        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise

    async def get_style_examples(self, k: int = 5) -> List[str]:
        """Get random style examples for prompting"""
        result = await self.db.execute(
            select(KBEntry.raw_text)
            .where(KBEntry.category == KBCategory.STYLE.value)
            .limit(k)
        )
        return [row[0] for row in result.fetchall()]

    async def delete_entry(self, kb_entry_id: str):
        """Delete KB entry"""
        result = await self.db.execute(
            select(KBEntry).where(KBEntry.kb_entry_id == kb_entry_id)
        )
        entry = result.scalar_one_or_none()

        if not entry:
            raise ValueError(f"KB entry {kb_entry_id} not found")

        await self.db.delete(entry)
        await self.db.commit()
        logger.info(f"Deleted KB entry {kb_entry_id}")
```

**Acceptance Criteria:**
- [ ] KBService created
- [ ] Add entry with embedding working
- [ ] Similarity search functional
- [ ] Vector distance calculation correct
- [ ] Category filtering working

---

### STEP 2.2.4: Create KB API Endpoints

**File: `backend/src/api/kb.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.kb_service import KBService
from src.models.kb_entry import KBCategory, KBSourceType
from src.schemas.kb import AddKBEntryRequest, KBEntryResponse, KBSearchRequest, KBSearchResponse
from typing import List

router = APIRouter(prefix="/api/kb", tags=["knowledge-base"])

@router.post("/add-entry", response_model=KBEntryResponse)
async def add_kb_entry(
    request: AddKBEntryRequest,
    db: AsyncSession = Depends(get_db)
):
    """Add entry to knowledge base"""
    try:
        service = KBService(db)
        entry = await service.add_entry(
            raw_text=request.raw_text,
            category=KBCategory(request.category),
            source_type=KBSourceType(request.source_type) if request.source_type else None,
            metadata=request.metadata
        )
        return entry
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=KBSearchResponse)
async def search_kb(
    request: KBSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """Search knowledge base with semantic similarity"""
    try:
        service = KBService(db)
        results = await service.similarity_search(
            query=request.query,
            category=KBCategory(request.category) if request.category else None,
            k=request.top_k
        )
        return KBSearchResponse(results=results, total=len(results))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/entries/{kb_entry_id}")
async def delete_kb_entry(
    kb_entry_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete KB entry"""
    try:
        service = KBService(db)
        await service.delete_entry(kb_entry_id)
        return {"message": "Entry deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**File: `backend/src/schemas/kb.py`**
```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AddKBEntryRequest(BaseModel):
    raw_text: str = Field(..., description="Text content to add")
    category: str = Field(..., description="STYLE, OPINION, GOLD_STANDARD_REPLY, etc.")
    source_type: Optional[str] = Field(None, description="USER_EMAIL, LINKEDIN_POST, etc.")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class KBEntryResponse(BaseModel):
    kb_entry_id: str
    raw_text: str
    category: str

    class Config:
        from_attributes = True

class KBSearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    category: Optional[str] = Field(None, description="Filter by category")
    top_k: int = Field(5, description="Number of results to return")

class KBSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    total: int
```

**Add to `backend/src/main.py`:**
```python
from src.api import kb
app.include_router(kb.router)
```

**Acceptance Criteria:**
- [ ] KB endpoints created
- [ ] Add entry endpoint working
- [ ] Search endpoint returning similar entries
- [ ] Delete endpoint working
- [ ] Schemas validated

---

## SPRINT 2.3: STYLE ENGINE & RAG

**Duration:** 3-4 days

---

### STEP 2.3.1: Integrate RAG into Draft Service

**File: `backend/src/services/draft_service.py` (modify)**
```python
# Add to imports
from src.services.kb_service import KBService
from src.models.kb_entry import KBCategory

# Modify generate_draft method
async def generate_draft(
    self,
    message_id: str,
    mode: ResponseMode,
    use_kb: bool = True
) -> DraftResponse:
    """Generate draft response for a message"""

    # ... existing message fetch code ...

    # Retrieve style examples from KB if enabled
    style_examples = []
    if use_kb:
        kb_service = KBService(self.db)

        # Get style examples via similarity search
        style_results = await kb_service.similarity_search(
            query=message.message_body,
            category=KBCategory.STYLE,
            k=3
        )
        style_examples = [r["raw_text"] for r in style_results]

        # Also get gold standard examples for this type
        if mode == ResponseMode.STANDARD:
            gold_results = await kb_service.similarity_search(
                query=message.message_body,
                category=KBCategory.GOLD_STANDARD_REPLY,
                k=2
            )
            style_examples.extend([r["raw_text"] for r in gold_results])

    # ... rest of existing generation code ...
    # Pass style_examples to prompt builder
```

**Acceptance Criteria:**
- [ ] RAG integrated into draft generation
- [ ] Style examples retrieved from KB
- [ ] Gold standard replies included
- [ ] Similarity search used for retrieval

---

### STEP 2.3.2: Create Feedback Processing Service

**File: `backend/src/services/feedback_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.feedback_event import FeedbackEvent, EditClassification
from src.models.draft_response import DraftResponse
from src.services.kb_service import KBService
from src.models.kb_entry import KBCategory, KBSourceType
import logging
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

class FeedbackService:
    """Service for processing user feedback on drafts"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.kb_service = KBService(db)

    async def submit_feedback(
        self,
        draft_id: str,
        final_text: str = None,
        user_rating: int = None,
        was_sent: bool = False
    ) -> FeedbackEvent:
        """Submit feedback on a draft"""

        # Fetch draft
        result = await self.db.execute(
            select(DraftResponse).where(DraftResponse.draft_id == draft_id)
        )
        draft = result.scalar_one_or_none()

        if not draft:
            raise ValueError(f"Draft {draft_id} not found")

        # Calculate edit distance
        edit_distance = 0.0
        edit_classification = None
        was_accepted = False

        if final_text:
            edit_distance = self._calculate_edit_distance(draft.draft_text, final_text)

            if edit_distance < 0.05:
                was_accepted = True
                edit_classification = None
            else:
                edit_classification = self._classify_edit(draft.draft_text, final_text)
        else:
            # No final text means accepted as-is
            was_accepted = True
            final_text = draft.draft_text

        # Create feedback event
        feedback = FeedbackEvent(
            draft_id=draft.draft_id,
            final_text=final_text,
            edit_distance=edit_distance,
            edit_classification=edit_classification,
            user_rating=user_rating,
            was_accepted=was_accepted,
            was_sent=was_sent
        )

        self.db.add(feedback)
        await self.db.commit()
        await self.db.refresh(feedback)

        # If high quality, add to KB
        if was_sent and (was_accepted or edit_distance < 0.2) and (user_rating or 0) >= 4:
            await self._add_to_kb(final_text, draft.response_mode.value)

        logger.info(f"Feedback submitted for draft {draft_id}: accepted={was_accepted}, rating={user_rating}")
        return feedback

    def _calculate_edit_distance(self, original: str, edited: str) -> float:
        """Calculate normalized edit distance (0.0 = identical, 1.0 = completely different)"""
        similarity = SequenceMatcher(None, original, edited).ratio()
        distance = 1.0 - similarity
        return round(distance, 3)

    def _classify_edit(self, original: str, edited: str) -> EditClassification:
        """Classify type of edit made"""
        # Simple heuristic classification
        # TODO: Use LLM for better classification

        original_words = set(original.lower().split())
        edited_words = set(edited.lower().split())

        word_overlap = len(original_words & edited_words) / max(len(original_words), 1)

        if word_overlap > 0.8:
            return EditClassification.TONE
        elif word_overlap > 0.6:
            return EditClassification.STRUCTURAL
        else:
            return EditClassification.FACTUAL_CORRECTION

    async def _add_to_kb(self, text: str, response_mode: str):
        """Add high-quality response to KB"""
        try:
            await self.kb_service.add_entry(
                raw_text=text,
                category=KBCategory.GOLD_STANDARD_REPLY,
                source_type=KBSourceType.APPROVED_DRAFT,
                metadata={"response_mode": response_mode}
            )
            logger.info("Added approved draft to KB")
        except Exception as e:
            logger.error(f"Failed to add to KB: {e}")

    async def accept_draft(self, draft_id: str) -> FeedbackEvent:
        """Accept draft without edits"""
        result = await self.db.execute(
            select(DraftResponse).where(DraftResponse.draft_id == draft_id)
        )
        draft = result.scalar_one_or_none()

        if not draft:
            raise ValueError(f"Draft {draft_id} not found")

        return await self.submit_feedback(
            draft_id=draft_id,
            final_text=draft.draft_text,
            was_sent=True
        )

    async def reject_draft(self, draft_id: str, reason: str = None) -> FeedbackEvent:
        """Reject draft entirely"""
        feedback = FeedbackEvent(
            draft_id=draft_id,
            final_text=None,
            edit_distance=1.0,
            edit_classification=EditClassification.OTHER,
            user_rating=1,
            was_accepted=False,
            was_sent=False
        )

        self.db.add(feedback)
        await self.db.commit()
        await self.db.refresh(feedback)

        logger.info(f"Draft {draft_id} rejected: {reason}")
        return feedback
```

**Acceptance Criteria:**
- [ ] FeedbackService created
- [ ] Edit distance calculation working
- [ ] Edit classification implemented
- [ ] High-quality responses added to KB
- [ ] Accept/reject methods working

---

### STEP 2.3.3: Create Feedback API

**File: `backend/src/api/feedback.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.feedback_service import FeedbackService
from src.schemas.feedback import SubmitFeedbackRequest, FeedbackResponse, RejectDraftRequest

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(
    request: SubmitFeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submit user feedback on draft"""
    try:
        service = FeedbackService(db)
        feedback = await service.submit_feedback(
            draft_id=request.draft_id,
            final_text=request.final_text,
            user_rating=request.user_rating,
            was_sent=request.was_sent
        )
        return feedback
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/accept/{draft_id}", response_model=FeedbackResponse)
async def accept_draft(
    draft_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Accept draft without edits"""
    try:
        service = FeedbackService(db)
        feedback = await service.accept_draft(draft_id)
        return feedback
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reject/{draft_id}", response_model=FeedbackResponse)
async def reject_draft(
    draft_id: str,
    request: RejectDraftRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reject draft entirely"""
    try:
        service = FeedbackService(db)
        feedback = await service.reject_draft(
            draft_id=draft_id,
            reason=request.rejection_reason
        )
        return feedback
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**File: `backend/src/schemas/feedback.py`**
```python
from pydantic import BaseModel, Field
from typing import Optional

class SubmitFeedbackRequest(BaseModel):
    draft_id: str
    final_text: Optional[str] = Field(None, description="User's final version (None if accepted as-is)")
    user_rating: Optional[int] = Field(None, ge=1, le=5, description="Rating 1-5")
    was_sent: bool = Field(False, description="Whether message was actually sent")

class FeedbackResponse(BaseModel):
    feedback_id: str
    draft_id: str
    edit_distance: float
    was_accepted: bool
    was_sent: bool

    class Config:
        from_attributes = True

class RejectDraftRequest(BaseModel):
    rejection_reason: Optional[str] = Field(None, description="Why draft was rejected")
```

**Add to `backend/src/main.py`:**
```python
from src.api import feedback
app.include_router(feedback.router)
```

**Acceptance Criteria:**
- [ ] Feedback endpoints created
- [ ] Submit feedback working
- [ ] Accept draft working
- [ ] Reject draft working
- [ ] Edit distance calculated correctly

---

## SPRINT 2.4: ALL RESPONSE MODES

**Duration:** 2-3 days

---

### STEP 2.4.1: Test All Response Modes

Create comprehensive tests for each response mode.

**File: `backend/tests/test_draft_modes.py`**
```python
import pytest
from src.services.draft_service import DraftService
from src.models.draft_response import ResponseMode

@pytest.mark.asyncio
async def test_standard_mode(db_session, sample_message):
    """Test STANDARD response mode"""
    service = DraftService(db_session)

    draft = await service.generate_draft(
        message_id=str(sample_message.message_id),
        mode=ResponseMode.STANDARD
    )

    assert draft is not None
    assert draft.response_mode == ResponseMode.STANDARD
    assert len(draft.draft_text) > 0
    # Check for AI-style markers (emojis, em-dashes)
    assert "—" in draft.draft_text or any(c for c in draft.draft_text if ord(c) > 127)

@pytest.mark.asyncio
async def test_agree_amplify_mode(db_session, sample_message):
    """Test AGREE_AMPLIFY response mode"""
    service = DraftService(db_session)

    draft = await service.generate_draft(
        message_id=str(sample_message.message_id),
        mode=ResponseMode.AGREE_AMPLIFY
    )

    assert draft is not None
    assert draft.response_mode == ResponseMode.AGREE_AMPLIFY
    # Should contain enthusiasm markers
    assert any(word in draft.draft_text.lower() for word in ["absolutely", "exactly", "this"])

@pytest.mark.asyncio
async def test_educate_mode(db_session, sample_message):
    """Test EDUCATE response mode"""
    service = DraftService(db_session)

    draft = await service.generate_draft(
        message_id=str(sample_message.message_id),
        mode=ResponseMode.EDUCATE
    )

    assert draft is not None
    assert draft.response_mode == ResponseMode.EDUCATE
    # Should have compliment sandwich structure
    assert len(draft.draft_text.split("\n\n")) >= 2

@pytest.mark.asyncio
async def test_battle_mode(db_session, sample_message):
    """Test BATTLE response mode"""
    service = DraftService(db_session)

    draft = await service.generate_draft(
        message_id=str(sample_message.message_id),
        mode=ResponseMode.BATTLE
    )

    assert draft is not None
    assert draft.response_mode == ResponseMode.BATTLE
    # Should NOT contain emojis (humanized style)
    assert not any(c for c in draft.draft_text if ord(c) > 127 and ord(c) not in range(0x20, 0x7F))
```

**Acceptance Criteria:**
- [ ] All 4 modes tested
- [ ] Style requirements validated
- [ ] Tests passing

---

### STEP 2.4.2: Create Integration Tests

**File: `backend/tests/test_full_pipeline.py`**
```python
import pytest
from src.services.ingestion_service import IngestionService
from src.services.classification_service import ClassificationService
from src.services.prioritization_service import PrioritizationService
from src.services.draft_service import DraftService
from src.services.feedback_service import FeedbackService
from src.models.draft_response import ResponseMode

@pytest.mark.asyncio
async def test_full_message_pipeline(db_session, gmail_provider_mock):
    """Test complete pipeline: ingest → classify → prioritize → draft → feedback"""

    # 1. Ingest
    ingestion_service = IngestionService(db_session)
    count = await ingestion_service.ingest_from_provider(gmail_provider_mock)
    assert count > 0

    # Get ingested message
    from src.models.message import Message
    from sqlalchemy import select
    result = await db_session.execute(select(Message).limit(1))
    message = result.scalar_one()

    # 2. Classify
    classification_service = ClassificationService(db_session)
    classification = await classification_service.classify_message(str(message.message_id))
    assert classification is not None
    assert classification.confidence > 0

    # 3. Prioritize
    prioritization_service = PrioritizationService(db_session)
    priority = await prioritization_service.compute_priority(str(message.message_id))
    assert priority > 0

    # 4. Generate Draft
    draft_service = DraftService(db_session)
    draft = await draft_service.generate_draft(
        message_id=str(message.message_id),
        mode=ResponseMode.STANDARD
    )
    assert draft is not None
    assert len(draft.draft_text) > 0

    # 5. Submit Feedback
    feedback_service = FeedbackService(db_session)
    feedback = await feedback_service.accept_draft(str(draft.draft_id))
    assert feedback.was_accepted is True
    assert feedback.edit_distance == 0.0
```

**Acceptance Criteria:**
- [ ] Full pipeline test passes
- [ ] All services integrated
- [ ] Data flows correctly between services

---

## PHASE 2 TESTING & VALIDATION

---

### STEP 2.5.1: Unit Tests

Create comprehensive unit tests for all Phase 2 services.

**Test Coverage Requirements:**
- [ ] DraftService: 80%+
- [ ] KBService: 80%+
- [ ] EmbeddingService: 80%+
- [ ] FeedbackService: 80%+

**Run Tests:**
```bash
cd backend
pytest tests/ --cov=src --cov-report=html
```

---

### STEP 2.5.2: Manual QA Checklist

Test all endpoints manually:

- [ ] Generate draft in STANDARD mode
- [ ] Generate draft in AGREE_AMPLIFY mode
- [ ] Generate draft in EDUCATE mode
- [ ] Generate draft in BATTLE mode
- [ ] Add entry to KB
- [ ] Search KB by similarity
- [ ] Submit feedback with edits
- [ ] Accept draft without edits
- [ ] Reject draft
- [ ] Verify high-quality drafts added to KB

---

### STEP 2.5.3: Performance Testing

Test vector search performance:

```python
# Test script
import asyncio
import time
from src.services.kb_service import KBService

async def test_vector_search_performance():
    # Add 1000 entries
    # Measure search time
    # Should be < 100ms for top-10 search
    pass
```

**Performance Targets:**
- [ ] Vector search < 100ms (p95)
- [ ] Draft generation < 5s (p95)
- [ ] Embedding generation < 2s (p95)

---

## PHASE 2 COMPLETION CHECKLIST

- [ ] All models created and migrated
- [ ] All 4 response modes working
- [ ] Knowledge base functional
- [ ] Vector search operational
- [ ] RAG integrated into drafts
- [ ] Feedback loop collecting data
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Performance targets met
- [ ] API documentation updated
- [ ] Code reviewed and merged

---

**PROCEED TO PHASE 3: Frontend Development**

See DEVELOPMENT_PLAN_PHASE_3.md for next steps.
