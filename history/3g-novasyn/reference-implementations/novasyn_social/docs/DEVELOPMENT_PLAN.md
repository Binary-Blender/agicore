# SCREAMO DEVELOPMENT PLAN
## Complete Step-by-Step Implementation Guide

**Version:** 1.0
**Last Updated:** 2025-11-23
**Target Completion:** TBD based on team capacity

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Phase 0: Repository Bootstrap](#phase-0-repository-bootstrap)
3. [Phase 1: Core Backend Services](#phase-1-core-backend-services)
4. [Phase 2: AI Integration & Knowledge Base](#phase-2-ai-integration--knowledge-base)
5. [Phase 3: Frontend Development](#phase-3-frontend-development)
6. [Phase 4: SPC Module & Automation](#phase-4-spc-module--automation)
7. [Phase 5: Integration & Deployment](#phase-5-integration--deployment)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Success Metrics](#success-metrics)

---

## OVERVIEW

### Development Philosophy

This plan follows an **incremental, testable, and AI-agent-friendly** approach:

- Each step produces **working, testable code**
- Steps build on previous work with minimal rework
- Clear acceptance criteria for each step
- Designed for AI coding assistants to execute autonomously
- Human checkpoints at phase boundaries

### Prerequisites

Before starting:
- [ ] All strategic documents read and understood
- [ ] Development environment configured
- [ ] Database instances provisioned (PostgreSQL + pgvector)
- [ ] API credentials obtained (Gmail, LinkedIn, YouTube, O365)
- [ ] CI/CD pipeline configured
- [ ] Team access to repository

### Technology Stack

**Backend:**
- Python 3.10+
- FastAPI
- PostgreSQL 14+ with pgvector extension
- Redis (job queue)
- SQLAlchemy (ORM)
- Alembic (migrations)

**AI/ML:**
- OpenAI API or equivalent LLM provider
- sentence-transformers for embeddings
- numpy/scipy for SPC calculations

**Frontend:**
- React 18+
- TypeScript
- TailwindCSS
- React Query for state management
- Recharts for SPC visualizations

**Infrastructure:**
- Docker & Docker Compose
- Kubernetes (production)
- GitHub Actions (CI/CD)

---

## PHASE 0: REPOSITORY BOOTSTRAP

**Duration:** 1-2 days
**Assigned To:** Lead Developer or AI Agent
**Dependencies:** None

### STEP 0.1: Initialize Repository Structure

Create the following directory structure:

```
screamo/
├── backend/
│   ├── src/
│   │   ├── api/              # FastAPI routes
│   │   ├── services/         # Business logic services
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── core/             # Config, logging, auth
│   │   ├── integrations/     # External API clients
│   │   └── main.py
│   ├── alembic/              # Database migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/         # API clients
│   │   ├── hooks/
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── infra/
│   ├── kubernetes/
│   ├── docker-compose.yml
│   └── nginx/
├── docs/
│   ├── AI_ASSISTANT_GUIDE.md
│   ├── DEVELOPMENT_PLAN.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATIONS.md
│   ├── QUICK_START.md
│   └── README.md
└── .github/
    └── workflows/
```

**Commands:**
```bash
mkdir -p screamo/{backend/{src/{api,services,models,schemas,core,integrations},alembic,tests},frontend/src/{components,pages,services,hooks,types},infra/{kubernetes,nginx},docs,.github/workflows}
cd screamo
git init
```

**Acceptance Criteria:**
- [ ] Directory structure created
- [ ] Git repository initialized
- [ ] `.gitignore` configured for Python and Node
- [ ] Initial README.md created

---

### STEP 0.2: Backend Scaffold

Create foundational backend files.

**File: `backend/requirements.txt`**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
pgvector==0.2.3
pydantic==2.5.0
pydantic-settings==2.1.0
redis==5.0.1
celery==5.3.4
httpx==0.25.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
openai==1.3.5
sentence-transformers==2.2.2
numpy==1.24.3
scipy==1.11.4
pytest==7.4.3
pytest-asyncio==0.21.1
```

**File: `backend/src/core/config.py`**
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://screamo:password@localhost:5432/screamo"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # API Keys
    OPENAI_API_KEY: str
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    YOUTUBE_API_KEY: Optional[str] = None

    # JWT
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # SPC Configuration
    SPC_SAMPLE_SIZE: int = 30
    SPC_MIN_SAMPLES_FOR_TIER_1: int = 50
    SPC_MIN_SAMPLES_FOR_TIER_2: int = 100

    # Rate Limits
    LINKEDIN_POST_DAILY_LIMIT: int = 5
    FEED_SCAN_INTERVAL_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

**File: `backend/src/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Screamo API",
    version="1.0.0",
    description="AI-powered multi-channel communication orchestration"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    logger.info("Screamo API starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Screamo API shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Acceptance Criteria:**
- [ ] `requirements.txt` created with all dependencies
- [ ] `config.py` created with environment variable support
- [ ] `main.py` created with basic FastAPI setup
- [ ] Health check endpoint functional
- [ ] Server runs with `uvicorn src.main:app --reload`

---

### STEP 0.3: Database Initialization

Set up database connection and Alembic.

**File: `backend/src/core/database.py`**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from src.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**Commands:**
```bash
cd backend
alembic init alembic
```

**File: `backend/alembic/env.py` (modify target_metadata):**
```python
# Add after imports
from src.core.database import Base
from src.models import *  # Import all models

# Replace target_metadata line with:
target_metadata = Base.metadata
```

**Acceptance Criteria:**
- [ ] Database connection configured
- [ ] Alembic initialized
- [ ] `get_db()` dependency function created
- [ ] Connection test successful

---

### STEP 0.4: Frontend Scaffold

Initialize React application.

**Commands:**
```bash
cd frontend
npx create-react-app . --template typescript
npm install @tanstack/react-query axios react-router-dom
npm install -D @types/react-router-dom tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**File: `frontend/src/services/api.ts`**
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const healthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};
```

**Acceptance Criteria:**
- [ ] React app created with TypeScript
- [ ] TailwindCSS configured
- [ ] API client service created
- [ ] App runs with `npm start`
- [ ] Health check connects to backend

---

### STEP 0.5: Docker Configuration

Create Docker setup for local development.

**File: `backend/Dockerfile`**
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**File: `frontend/Dockerfile`**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
```

**File: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_USER: screamo
      POSTGRES_PASSWORD: password
      POSTGRES_DB: screamo
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://screamo:password@postgres:5432/screamo
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Acceptance Criteria:**
- [ ] Dockerfiles created for backend and frontend
- [ ] `docker-compose.yml` configured
- [ ] Stack starts with `docker-compose up`
- [ ] All services healthy

---

## PHASE 1: CORE BACKEND SERVICES

**Duration:** 2-3 weeks
**Dependencies:** Phase 0 complete

---

### SPRINT 1.1: Message Ingestion Service

**Duration:** 3-5 days

#### STEP 1.1.1: Create Message Model

**File: `backend/src/models/message.py`**
```python
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.core.database import Base
import uuid
from datetime import datetime
import enum

class ChannelType(str, enum.Enum):
    EMAIL = "EMAIL"
    LINKEDIN_DM = "LINKEDIN_DM"
    LINKEDIN_COMMENT = "LINKEDIN_COMMENT"
    YOUTUBE_COMMENT = "YOUTUBE_COMMENT"

class IngestionStatus(str, enum.Enum):
    NEW = "NEW"
    PROCESSED = "PROCESSED"
    ERROR = "ERROR"

class Message(Base):
    __tablename__ = "messages"

    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(255), unique=True, index=True, nullable=False)
    channel_type = Column(Enum(ChannelType), nullable=False, index=True)
    sender_name = Column(String(255))
    sender_handle = Column(String(255))
    timestamp_received = Column(DateTime, default=datetime.utcnow, index=True)
    message_body = Column(Text, nullable=False)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.thread_id"), nullable=True)
    classification_id = Column(UUID(as_uuid=True), ForeignKey("classifications.classification_id"), nullable=True)
    priority_score = Column(Float, default=0.0, index=True)
    ingestion_status = Column(Enum(IngestionStatus), default=IngestionStatus.NEW)

    # Relationships
    thread = relationship("Thread", back_populates="messages")
    classification = relationship("Classification", back_populates="message", uselist=False)
    draft_responses = relationship("DraftResponse", back_populates="message")

    __table_args__ = (
        Index('idx_messages_timestamp_received', 'timestamp_received'),
        Index('idx_messages_priority_score', 'priority_score'),
        Index('idx_messages_channel_type', 'channel_type'),
    )
```

**File: `backend/src/models/thread.py`**
```python
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.core.database import Base
import uuid

class Thread(Base):
    __tablename__ = "threads"

    thread_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_thread_id = Column(String(255), unique=True, index=True)

    messages = relationship("Message", back_populates="thread", order_by="Message.timestamp_received")
```

**Migration:**
```bash
alembic revision -m "create messages and threads tables"
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] Message and Thread models created
- [ ] Migration generated and applied
- [ ] Tables exist in database
- [ ] Indexes created correctly

---

#### STEP 1.1.2: Create Ingestion Base Provider

**File: `backend/src/integrations/base_provider.py`**
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class RawMessage(BaseModel):
    external_id: str
    channel_type: str
    sender_name: str
    sender_handle: str
    timestamp_received: datetime
    message_body: str
    thread_external_id: str | None = None
    metadata: Dict[str, Any] = {}

class BaseProvider(ABC):
    """Base class for all channel providers (Gmail, LinkedIn, YouTube, etc.)"""

    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials
        self.last_poll: datetime | None = None

    @abstractmethod
    async def fetch_messages(self, since: datetime | None = None) -> List[RawMessage]:
        """Fetch raw messages from the platform"""
        pass

    @abstractmethod
    async def send_message(self, message_id: str, content: str) -> bool:
        """Send a message via the platform"""
        pass

    async def normalize(self, raw_message: RawMessage) -> Dict[str, Any]:
        """Normalize raw message into unified schema"""
        return {
            "external_id": raw_message.external_id,
            "channel_type": raw_message.channel_type,
            "sender_name": raw_message.sender_name,
            "sender_handle": raw_message.sender_handle,
            "timestamp_received": raw_message.timestamp_received,
            "message_body": raw_message.message_body,
            "thread_external_id": raw_message.thread_external_id,
        }
```

**Acceptance Criteria:**
- [ ] Base provider class created
- [ ] Abstract methods defined
- [ ] RawMessage schema defined

---

#### STEP 1.1.3: Implement Gmail Provider

**File: `backend/src/integrations/gmail_provider.py`**
```python
from src.integrations.base_provider import BaseProvider, RawMessage
from typing import List
from datetime import datetime
import httpx
import base64
import logging

logger = logging.getLogger(__name__)

class GmailProvider(BaseProvider):
    """Gmail ingestion provider using Google Gmail API"""

    BASE_URL = "https://gmail.googleapis.com/gmail/v1"

    async def fetch_messages(self, since: datetime | None = None) -> List[RawMessage]:
        """Fetch messages from Gmail"""
        try:
            # Build query
            query = "in:inbox"
            if since:
                timestamp = int(since.timestamp())
                query += f" after:{timestamp}"

            # Get message IDs
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/users/me/messages",
                    params={"q": query, "maxResults": 100},
                    headers={"Authorization": f"Bearer {self.credentials['access_token']}"}
                )
                response.raise_for_status()
                message_list = response.json().get("messages", [])

            # Fetch full messages
            raw_messages = []
            for msg_ref in message_list:
                msg_id = msg_ref["id"]
                msg_data = await self._fetch_message_detail(msg_id)
                if msg_data:
                    raw_messages.append(msg_data)

            logger.info(f"Fetched {len(raw_messages)} messages from Gmail")
            return raw_messages

        except Exception as e:
            logger.error(f"Error fetching Gmail messages: {e}")
            return []

    async def _fetch_message_detail(self, message_id: str) -> RawMessage | None:
        """Fetch detailed message data"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/users/me/messages/{message_id}",
                    headers={"Authorization": f"Bearer {self.credentials['access_token']}"}
                )
                response.raise_for_status()
                data = response.json()

            # Parse headers
            headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
            sender = headers.get("From", "Unknown")
            subject = headers.get("Subject", "")
            thread_id = data.get("threadId")

            # Parse body
            body = self._extract_body(data.get("payload", {}))

            # Parse timestamp
            timestamp = datetime.fromtimestamp(int(data.get("internalDate", 0)) / 1000)

            return RawMessage(
                external_id=message_id,
                channel_type="EMAIL",
                sender_name=sender,
                sender_handle=sender,
                timestamp_received=timestamp,
                message_body=f"{subject}\n\n{body}",
                thread_external_id=thread_id
            )

        except Exception as e:
            logger.error(f"Error fetching message {message_id}: {e}")
            return None

    def _extract_body(self, payload: dict) -> str:
        """Extract plain text body from Gmail payload"""
        if "body" in payload and "data" in payload["body"]:
            return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8")

        if "parts" in payload:
            for part in payload["parts"]:
                if part.get("mimeType") == "text/plain":
                    return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")

        return ""

    async def send_message(self, message_id: str, content: str) -> bool:
        """Send reply via Gmail"""
        # TODO: Implement Gmail send
        logger.warning("Gmail send not yet implemented")
        return False
```

**Acceptance Criteria:**
- [ ] Gmail provider implemented
- [ ] OAuth2 credentials handling
- [ ] Message fetching functional
- [ ] Thread detection working
- [ ] Error handling in place

---

#### STEP 1.1.4: Create Ingestion Service

**File: `backend/src/services/ingestion_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.message import Message, ChannelType, IngestionStatus
from src.models.thread import Thread
from src.integrations.base_provider import BaseProvider
from datetime import datetime
import logging
from typing import List

logger = logging.getLogger(__name__)

class IngestionService:
    """Service for ingesting messages from all channels"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest_from_provider(self, provider: BaseProvider) -> int:
        """Ingest messages from a specific provider"""
        try:
            # Fetch raw messages
            raw_messages = await provider.fetch_messages(since=provider.last_poll)

            if not raw_messages:
                logger.info(f"No new messages from {provider.__class__.__name__}")
                return 0

            # Store messages
            count = 0
            for raw_msg in raw_messages:
                normalized = await provider.normalize(raw_msg)

                # Check for duplicates
                result = await self.db.execute(
                    select(Message).where(Message.external_id == normalized["external_id"])
                )
                if result.scalar_one_or_none():
                    continue

                # Get or create thread
                thread = await self._get_or_create_thread(normalized.get("thread_external_id"))

                # Create message
                message = Message(
                    external_id=normalized["external_id"],
                    channel_type=ChannelType(normalized["channel_type"]),
                    sender_name=normalized["sender_name"],
                    sender_handle=normalized["sender_handle"],
                    timestamp_received=normalized["timestamp_received"],
                    message_body=normalized["message_body"],
                    thread_id=thread.thread_id if thread else None,
                    ingestion_status=IngestionStatus.NEW
                )

                self.db.add(message)
                count += 1

            await self.db.commit()
            logger.info(f"Ingested {count} new messages from {provider.__class__.__name__}")

            # Update last poll time
            provider.last_poll = datetime.utcnow()

            return count

        except Exception as e:
            logger.error(f"Error during ingestion: {e}")
            await self.db.rollback()
            return 0

    async def _get_or_create_thread(self, external_thread_id: str | None) -> Thread | None:
        """Get existing thread or create new one"""
        if not external_thread_id:
            return None

        result = await self.db.execute(
            select(Thread).where(Thread.external_thread_id == external_thread_id)
        )
        thread = result.scalar_one_or_none()

        if not thread:
            thread = Thread(external_thread_id=external_thread_id)
            self.db.add(thread)
            await self.db.flush()

        return thread
```

**Acceptance Criteria:**
- [ ] Ingestion service created
- [ ] Duplicate detection working
- [ ] Thread association working
- [ ] Error handling with rollback
- [ ] Logging comprehensive

---

#### STEP 1.1.5: Create Ingestion API Endpoints

**File: `backend/src/api/ingestion.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.ingestion_service import IngestionService
from src.integrations.gmail_provider import GmailProvider
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

class IngestionResponse(BaseModel):
    success: bool
    messages_ingested: int
    channel: str

@router.post("/gmail", response_model=IngestionResponse)
async def ingest_gmail(
    credentials: dict,  # TODO: Proper auth
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger Gmail ingestion"""
    try:
        provider = GmailProvider(credentials)
        service = IngestionService(db)
        count = await service.ingest_from_provider(provider)

        return IngestionResponse(
            success=True,
            messages_ingested=count,
            channel="gmail"
        )
    except Exception as e:
        logger.error(f"Gmail ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def ingestion_status(db: AsyncSession = Depends(get_db)):
    """Get ingestion status"""
    from sqlalchemy import func, select
    from src.models.message import Message

    result = await db.execute(
        select(
            Message.channel_type,
            func.count(Message.message_id).label("count")
        ).group_by(Message.channel_type)
    )

    stats = {row.channel_type.value: row.count for row in result}

    return {"total_messages": sum(stats.values()), "by_channel": stats}
```

**File: `backend/src/main.py` (add router):**
```python
from src.api import ingestion

app.include_router(ingestion.router)
```

**Acceptance Criteria:**
- [ ] Ingestion endpoints created
- [ ] Manual trigger working
- [ ] Status endpoint returns correct counts
- [ ] Error handling with proper HTTP codes

---

### SPRINT 1.2: Classification Service

**Duration:** 4-6 days

#### STEP 1.2.1: Create Classification Model

**File: `backend/src/models/classification.py`**
```python
from sqlalchemy import Column, String, Float, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.core.database import Base
import uuid
import enum

class OpportunityType(str, enum.Enum):
    JOB_OPPORTUNITY = "JOB_OPPORTUNITY"
    PARTNERSHIP = "PARTNERSHIP"
    SALES_LEAD = "SALES_LEAD"
    SOCIAL_CONNECTION = "SOCIAL_CONNECTION"
    LOGISTICS = "LOGISTICS"
    SPAM = "SPAM"
    UNKNOWN = "UNKNOWN"

class Sentiment(str, enum.Enum):
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"
    HOSTILE = "HOSTILE"

class Intent(str, enum.Enum):
    INFORMATIONAL = "INFORMATIONAL"
    PROMOTIONAL = "PROMOTIONAL"
    CONFRONTATIONAL = "CONFRONTATIONAL"
    INQUIRY = "INQUIRY"

class TopicAlignment(str, enum.Enum):
    ALIGNED = "ALIGNED"
    MISALIGNED = "MISALIGNED"
    UNKNOWN = "UNKNOWN"

class Classification(Base):
    __tablename__ = "classifications"

    classification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.message_id"), unique=True)
    opportunity_type = Column(Enum(OpportunityType), nullable=False)
    sentiment = Column(Enum(Sentiment), nullable=False)
    intent = Column(Enum(Intent), nullable=False)
    topic_alignment = Column(Enum(TopicAlignment), default=TopicAlignment.UNKNOWN)
    hostility_level = Column(Float, default=0.0)  # 0.0 to 1.0
    confidence = Column(Float, nullable=False)  # 0.0 to 1.0
    classifier_version = Column(String(50), nullable=False)
    explanation = Column(String(1000))  # Brief explanation of classification

    message = relationship("Message", back_populates="classification")
```

**Migration:**
```bash
alembic revision -m "create classifications table"
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] Classification model created
- [ ] All enums defined
- [ ] Migration applied
- [ ] Foreign key relationship to Message

---

#### STEP 1.2.2: Create Classification Prompts

**File: `backend/src/services/prompts/classification_prompt.py`**
```python
CLASSIFICATION_SYSTEM_PROMPT = """You are an expert message classifier for a communication management system.

Your task is to analyze incoming messages and provide structured classification.

Classify each message according to these dimensions:

1. OPPORTUNITY TYPE:
   - JOB_OPPORTUNITY: Job offers, recruitment, career opportunities
   - PARTNERSHIP: Business collaboration, joint ventures, partnerships
   - SALES_LEAD: Potential customers, sales inquiries
   - SOCIAL_CONNECTION: Networking, introductions, social engagement
   - LOGISTICS: Meeting scheduling, administrative tasks
   - SPAM: Unsolicited marketing, obvious spam
   - UNKNOWN: Cannot determine

2. SENTIMENT:
   - POSITIVE: Friendly, enthusiastic, complimentary
   - NEUTRAL: Matter-of-fact, professional, informational
   - NEGATIVE: Critical, disappointed, unhappy
   - HOSTILE: Aggressive, confrontational, attacking

3. INTENT:
   - INFORMATIONAL: Sharing information, updates
   - PROMOTIONAL: Promoting something, selling
   - CONFRONTATIONAL: Challenging, debating, attacking
   - INQUIRY: Asking questions, seeking information

4. TOPIC ALIGNMENT:
   - ALIGNED: Matches user's known interests and expertise
   - MISALIGNED: Contradicts or is unrelated to user's interests
   - UNKNOWN: Cannot determine alignment

5. HOSTILITY LEVEL: Float from 0.0 (not hostile) to 1.0 (very hostile)

6. CONFIDENCE: Your confidence in this classification (0.0 to 1.0)

7. EXPLANATION: Brief 1-2 sentence explanation of your classification

Respond ONLY with valid JSON in this exact format:
{
  "opportunity_type": "...",
  "sentiment": "...",
  "intent": "...",
  "topic_alignment": "...",
  "hostility_level": 0.0,
  "confidence": 0.95,
  "explanation": "..."
}
"""

def build_classification_prompt(message_body: str, sender_info: str, user_context: str = "") -> str:
    """Build the user prompt for classification"""
    prompt = f"""Classify this message:

FROM: {sender_info}

MESSAGE:
{message_body}
"""

    if user_context:
        prompt += f"\n\nUSER CONTEXT:\n{user_context}"

    return prompt
```

**Acceptance Criteria:**
- [ ] System prompt defined
- [ ] Prompt builder function created
- [ ] All classification dimensions covered

---

#### STEP 1.2.3: Create Classification Service

**File: `backend/src/services/classification_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.message import Message
from src.models.classification import Classification, OpportunityType, Sentiment, Intent, TopicAlignment
from src.services.prompts.classification_prompt import CLASSIFICATION_SYSTEM_PROMPT, build_classification_prompt
from src.core.config import settings
import openai
import json
import logging

logger = logging.getLogger(__name__)

class ClassificationService:
    """Service for classifying messages using LLM"""

    CLASSIFIER_VERSION = "v1.0"

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def classify_message(self, message_id: str) -> Classification:
        """Classify a single message"""
        # Fetch message
        result = await self.db.execute(
            select(Message).where(Message.message_id == message_id)
        )
        message = result.scalar_one_or_none()

        if not message:
            raise ValueError(f"Message {message_id} not found")

        # Check if already classified
        if message.classification:
            logger.info(f"Message {message_id} already classified")
            return message.classification

        # Build prompt
        sender_info = f"{message.sender_name} ({message.sender_handle})"
        user_prompt = build_classification_prompt(
            message_body=message.message_body,
            sender_info=sender_info,
            user_context=""  # TODO: Add user knowledge base context
        )

        # Call LLM
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            # Parse response
            content = response.choices[0].message.content
            result = json.loads(content)

            # Create classification
            classification = Classification(
                message_id=message.message_id,
                opportunity_type=OpportunityType(result["opportunity_type"]),
                sentiment=Sentiment(result["sentiment"]),
                intent=Intent(result["intent"]),
                topic_alignment=TopicAlignment(result["topic_alignment"]),
                hostility_level=result["hostility_level"],
                confidence=result["confidence"],
                classifier_version=self.CLASSIFIER_VERSION,
                explanation=result["explanation"]
            )

            self.db.add(classification)
            await self.db.commit()
            await self.db.refresh(classification)

            logger.info(f"Classified message {message_id} as {result['opportunity_type']}")
            return classification

        except Exception as e:
            logger.error(f"Classification failed for message {message_id}: {e}")
            await self.db.rollback()
            raise

    async def classify_batch(self, message_ids: list[str]) -> list[Classification]:
        """Classify multiple messages"""
        classifications = []
        for msg_id in message_ids:
            try:
                classification = await self.classify_message(msg_id)
                classifications.append(classification)
            except Exception as e:
                logger.error(f"Failed to classify {msg_id}: {e}")

        return classifications

    async def reclassify_message(self, message_id: str, corrections: dict) -> Classification:
        """Reclassify with human corrections (for training)"""
        result = await self.db.execute(
            select(Classification).where(Classification.message_id == message_id)
        )
        classification = result.scalar_one_or_none()

        if not classification:
            raise ValueError(f"No classification found for message {message_id}")

        # Apply corrections
        for key, value in corrections.items():
            if hasattr(classification, key):
                setattr(classification, key, value)

        await self.db.commit()
        await self.db.refresh(classification)

        logger.info(f"Reclassified message {message_id} with corrections")
        return classification
```

**Acceptance Criteria:**
- [ ] Classification service created
- [ ] LLM integration working
- [ ] JSON parsing robust
- [ ] Batch classification supported
- [ ] Reclassification for training implemented

---

#### STEP 1.2.4: Create Classification API

**File: `backend/src/api/classification.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.classification_service import ClassificationService
from src.schemas.classification import ClassificationResponse, ReclassifyRequest
from pydantic import BaseModel

router = APIRouter(prefix="/api/classification", tags=["classification"])

@router.post("/classify/{message_id}", response_model=ClassificationResponse)
async def classify_message(
    message_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Classify a single message"""
    try:
        service = ClassificationService(db)
        classification = await service.classify_message(message_id)
        return classification
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/classify-batch", response_model=list[ClassificationResponse])
async def classify_batch(
    message_ids: list[str],
    db: AsyncSession = Depends(get_db)
):
    """Classify multiple messages"""
    service = ClassificationService(db)
    classifications = await service.classify_batch(message_ids)
    return classifications

@router.post("/reclassify/{message_id}", response_model=ClassificationResponse)
async def reclassify_message(
    message_id: str,
    request: ReclassifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reclassify message with human corrections"""
    try:
        service = ClassificationService(db)
        classification = await service.reclassify_message(message_id, request.corrections)
        return classification
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**File: `backend/src/schemas/classification.py`**
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ClassificationResponse(BaseModel):
    classification_id: str
    message_id: str
    opportunity_type: str
    sentiment: str
    intent: str
    topic_alignment: str
    hostility_level: float
    confidence: float
    explanation: str

    class Config:
        from_attributes = True

class ReclassifyRequest(BaseModel):
    corrections: dict = Field(..., description="Fields to correct with new values")
```

**Acceptance Criteria:**
- [ ] Classification endpoints created
- [ ] Schemas defined with validation
- [ ] Batch endpoint working
- [ ] Reclassification endpoint working

---

### SPRINT 1.3: Prioritization Service

**Duration:** 2-3 days

#### STEP 1.3.1: Create Prioritization Service

**File: `backend/src/services/prioritization_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.models.message import Message
from src.models.classification import Classification, OpportunityType, Sentiment
import logging

logger = logging.getLogger(__name__)

class PrioritizationService:
    """Service for computing message priority scores"""

    # Opportunity type weights
    OPPORTUNITY_WEIGHTS = {
        OpportunityType.JOB_OPPORTUNITY: 10.0,
        OpportunityType.PARTNERSHIP: 9.0,
        OpportunityType.SALES_LEAD: 8.0,
        OpportunityType.SOCIAL_CONNECTION: 6.0,
        OpportunityType.LOGISTICS: 5.0,
        OpportunityType.SPAM: 0.0,
        OpportunityType.UNKNOWN: 3.0,
    }

    # Sentiment modifiers
    SENTIMENT_MODIFIERS = {
        Sentiment.POSITIVE: 1.2,
        Sentiment.NEUTRAL: 1.0,
        Sentiment.NEGATIVE: 0.9,
        Sentiment.HOSTILE: 1.5,  # High priority to address quickly
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def compute_priority(self, message_id: str) -> float:
        """Compute priority score for a message"""
        # Fetch message with classification
        result = await self.db.execute(
            select(Message).where(Message.message_id == message_id)
        )
        message = result.scalar_one_or_none()

        if not message or not message.classification:
            logger.warning(f"Cannot prioritize message {message_id} - missing classification")
            return 0.0

        classification = message.classification

        # Base score from opportunity type
        base_score = self.OPPORTUNITY_WEIGHTS.get(classification.opportunity_type, 3.0)

        # Apply sentiment modifier
        sentiment_mod = self.SENTIMENT_MODIFIERS.get(classification.sentiment, 1.0)

        # Apply confidence multiplier
        confidence_mod = classification.confidence

        # Topic alignment bonus
        alignment_bonus = 2.0 if classification.topic_alignment.value == "ALIGNED" else 0.0

        # Hostility urgency factor
        hostility_urgency = classification.hostility_level * 5.0

        # Final score
        priority_score = (base_score * sentiment_mod * confidence_mod) + alignment_bonus + hostility_urgency

        # Update message
        await self.db.execute(
            update(Message)
            .where(Message.message_id == message_id)
            .values(priority_score=priority_score)
        )
        await self.db.commit()

        logger.info(f"Message {message_id} priority: {priority_score:.2f}")
        return priority_score

    async def reprioritize_all(self) -> int:
        """Recalculate all message priorities"""
        result = await self.db.execute(
            select(Message.message_id).where(Message.classification_id.isnot(None))
        )
        message_ids = [row[0] for row in result]

        for msg_id in message_ids:
            await self.compute_priority(str(msg_id))

        logger.info(f"Reprioritized {len(message_ids)} messages")
        return len(message_ids)
```

**Acceptance Criteria:**
- [ ] Prioritization service created
- [ ] Score calculation logic implemented
- [ ] Messages updated with priority scores
- [ ] Batch reprioritization working

---

#### STEP 1.3.2: Create Prioritization API

**File: `backend/src/api/prioritization.py`**
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.prioritization_service import PrioritizationService
from pydantic import BaseModel

router = APIRouter(prefix="/api/prioritization", tags=["prioritization"])

class PriorityResponse(BaseModel):
    message_id: str
    priority_score: float

@router.post("/compute/{message_id}", response_model=PriorityResponse)
async def compute_priority(
    message_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Compute priority for a message"""
    service = PrioritizationService(db)
    score = await service.compute_priority(message_id)
    return PriorityResponse(message_id=message_id, priority_score=score)

@router.post("/reprioritize-all")
async def reprioritize_all(db: AsyncSession = Depends(get_db)):
    """Recalculate all priorities"""
    service = PrioritizationService(db)
    count = await service.reprioritize_all()
    return {"messages_reprioritized": count}
```

**Acceptance Criteria:**
- [ ] Prioritization endpoints created
- [ ] Single message prioritization working
- [ ] Batch reprioritization working

---

### SPRINT 1.4: Draft Generation Service

**Duration:** 5-7 days

*(This section would continue with detailed implementation steps for Draft Generation, including all 4 response modes, RAG integration, style rewriting, etc.)*

**Due to length constraints, I'll provide the complete structure in the file but condense some sections. The pattern remains the same: models → services → APIs → testing.**

---

## PHASE 2: AI INTEGRATION & KNOWLEDGE BASE

*(Detailed steps for embedding service, vector search, RAG pipeline, KB management)*

---

## PHASE 3: FRONTEND DEVELOPMENT

*(Detailed steps for all UI components: Dashboard, Inbox, Message Detail, Feed Scanner, SPC Panel)*

---

## PHASE 4: SPC MODULE & AUTOMATION

*(Detailed steps for SPC metrics collection, control charts, automation tier logic)*

---

## PHASE 5: INTEGRATION & DEPLOYMENT

*(Detailed steps for end-to-end testing, deployment, monitoring)*

---

## TESTING STRATEGY

### Unit Tests
- Each service class has corresponding test file
- Minimum 80% code coverage
- Mock external APIs

### Integration Tests
- Test full workflows: ingest → classify → prioritize → draft
- Test all provider integrations
- Test database transactions

### End-to-End Tests
- Test complete user flows via API
- Test UI interactions with Playwright

### AI Performance Tests
- Measure classification accuracy on labeled dataset
- Measure style similarity on test samples
- Track edit distance over time

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Secrets stored securely
- [ ] API credentials validated
- [ ] Rate limits configured
- [ ] Monitoring configured

### Deployment Steps
1. Deploy database migrations
2. Deploy backend services
3. Deploy frontend
4. Run smoke tests
5. Monitor error rates

### Post-Deployment
- [ ] Health checks passing
- [ ] Ingestion running
- [ ] Classification working
- [ ] SPC metrics collecting
- [ ] UI accessible

---

## SUCCESS METRICS

### Technical Metrics
- **Uptime:** > 99.5%
- **API Latency:** < 500ms p95
- **Classification Accuracy:** > 90%
- **Draft Acceptance Rate:** > 50%

### Business Metrics
- **Messages Processed Daily:** Track and trend
- **Time Saved:** Hours per week
- **Automation Tier:** Track progression to Tier 2+
- **User Satisfaction:** Feedback score > 4/5

---

## NEXT STEPS AFTER MVP

1. **LinkedIn Feed Scanner** - Implement proactive engagement
2. **Battle Mode** - Advanced argumentation engine
3. **Mobile App** - iOS/Android native apps
4. **Voice Integration** - Voice message support
5. **Multi-User Support** - Team features
6. **Advanced Analytics** - Deeper insights dashboard

---

**END OF DEVELOPMENT PLAN**

For detailed implementation of remaining sprints, refer to:
- AI_ASSISTANT_GUIDE.md for code examples
- DATABASE_SCHEMA.md for complete schema
- API_SPECIFICATIONS.md for all endpoints
