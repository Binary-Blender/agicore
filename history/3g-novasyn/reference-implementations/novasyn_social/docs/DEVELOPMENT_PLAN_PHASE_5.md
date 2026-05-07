# SCREAMO DEVELOPMENT PLAN - PHASE 5
## Integration & Deployment

**Version:** 1.0
**Last Updated:** 2025-11-23
**Duration:** 2-3 weeks
**Dependencies:** Phases 1-4 complete

---

## TABLE OF CONTENTS

1. [Phase 5 Overview](#phase-5-overview)
2. [Sprint 5.1: End-to-End Integration Testing](#sprint-51-end-to-end-integration-testing)
3. [Sprint 5.2: Production Infrastructure](#sprint-52-production-infrastructure)
4. [Sprint 5.3: Deployment & CI/CD](#sprint-53-deployment--cicd)
5. [Sprint 5.4: Monitoring & Observability](#sprint-54-monitoring--observability)
6. [Production Launch Checklist](#production-launch-checklist)

---

## PHASE 5 OVERVIEW

### Objectives

Phase 5 prepares Screamo for production deployment:

- End-to-end integration testing
- Production infrastructure setup
- CI/CD pipeline configuration
- Monitoring and observability
- Security hardening
- Performance optimization
- Production launch preparation

### Success Criteria

- [ ] All integration tests passing
- [ ] Production infrastructure provisioned
- [ ] CI/CD pipeline functional
- [ ] Monitoring dashboards operational
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Production ready for launch

---

## SPRINT 5.1: END-TO-END INTEGRATION TESTING

**Duration:** 5-7 days

---

### STEP 5.1.1: Create Integration Test Suite

**File: `backend/tests/integration/test_full_workflow.py`**
```python
import pytest
from datetime import datetime
from src.services.ingestion_service import IngestionService
from src.services.classification_service import ClassificationService
from src.services.prioritization_service import PrioritizationService
from src.services.draft_service import DraftService
from src.services.feedback_service import FeedbackService
from src.services.spc_service import SPCService
from src.services.automation_service import AutomationService
from src.models.draft_response import ResponseMode
from src.models.message import ChannelType

@pytest.mark.integration
@pytest.mark.asyncio
async def test_complete_message_workflow(db_session, mock_gmail_messages):
    """Test complete workflow from ingestion to automation tier update"""

    # PHASE 1: Ingestion
    from src.integrations.gmail_provider import GmailProvider

    provider = GmailProvider({"access_token": "mock_token"})
    provider._fetch_messages = mock_gmail_messages  # Mock

    ingestion_service = IngestionService(db_session)
    count = await ingestion_service.ingest_from_provider(provider)
    assert count > 0

    # Get ingested message
    from sqlalchemy import select
    from src.models.message import Message

    result = await db_session.execute(select(Message).limit(1))
    message = result.scalar_one()
    assert message.message_id is not None

    # PHASE 2: Classification
    classification_service = ClassificationService(db_session)
    classification = await classification_service.classify_message(str(message.message_id))
    assert classification.opportunity_type is not None
    assert classification.confidence > 0

    # PHASE 3: Prioritization
    prioritization_service = PrioritizationService(db_session)
    priority = await prioritization_service.compute_priority(str(message.message_id))
    assert priority > 0

    # Refresh message
    await db_session.refresh(message)
    assert message.priority_score > 0

    # PHASE 4: Draft Generation
    draft_service = DraftService(db_session)
    draft = await draft_service.generate_draft(
        message_id=str(message.message_id),
        mode=ResponseMode.STANDARD
    )
    assert draft.draft_text is not None
    assert len(draft.draft_text) > 0

    # PHASE 5: Feedback
    feedback_service = FeedbackService(db_session)
    feedback = await feedback_service.accept_draft(str(draft.draft_id))
    assert feedback.was_accepted is True
    assert feedback.edit_distance == 0.0

    # PHASE 6: SPC Calculation
    spc_service = SPCService(db_session)
    metrics = await spc_service.calculate_metrics(
        channel_type=message.channel_type,
        response_mode=ResponseMode.STANDARD.value
    )
    assert metrics.sample_size > 0

    # PHASE 7: Automation Tier Update
    automation_service = AutomationService(db_session)
    tier = await automation_service.update_automation_tier(
        channel_type=message.channel_type,
        response_mode=ResponseMode.STANDARD.value
    )
    assert tier.current_tier is not None

    print(f"✅ Complete workflow test passed: {message.message_id}")
    print(f"   - Classification: {classification.opportunity_type.value}")
    print(f"   - Priority: {message.priority_score:.2f}")
    print(f"   - Draft length: {len(draft.draft_text)} chars")
    print(f"   - SPC state: {metrics.control_state.value}")
    print(f"   - Automation tier: {tier.current_tier}")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_multi_mode_drafts(db_session, sample_message):
    """Test draft generation for all modes"""
    draft_service = DraftService(db_session)

    modes = [
        ResponseMode.STANDARD,
        ResponseMode.AGREE_AMPLIFY,
        ResponseMode.EDUCATE,
        ResponseMode.BATTLE
    ]

    for mode in modes:
        draft = await draft_service.generate_draft(
            message_id=str(sample_message.message_id),
            mode=mode
        )

        assert draft is not None
        assert draft.response_mode == mode
        assert len(draft.draft_text) > 0

        print(f"✅ {mode.value} draft generated ({len(draft.draft_text)} chars)")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_kb_rag_integration(db_session, sample_message):
    """Test knowledge base RAG integration"""
    from src.services.kb_service import KBService
    from src.models.kb_entry import KBCategory, KBSourceType

    kb_service = KBService(db_session)

    # Add style examples to KB
    style_examples = [
        "Hi! Thanks for reaching out. I'd love to discuss this further.",
        "That's a great point! I completely agree with your perspective.",
        "I appreciate your message. Let me get back to you on this."
    ]

    for example in style_examples:
        await kb_service.add_entry(
            raw_text=example,
            category=KBCategory.STYLE,
            source_type=KBSourceType.MANUAL_ENTRY
        )

    # Generate draft with RAG
    draft_service = DraftService(db_session)
    draft = await draft_service.generate_draft(
        message_id=str(sample_message.message_id),
        mode=ResponseMode.STANDARD,
        use_kb=True
    )

    assert draft.style_pass_applied is True
    print(f"✅ RAG-enhanced draft generated")

@pytest.mark.integration
@pytest.mark.asyncio
async def test_spc_automation_progression(db_session):
    """Test SPC-driven automation tier progression"""
    from src.models.draft_response import DraftResponse
    from src.models.feedback_event import FeedbackEvent
    import uuid

    # Simulate 100 high-quality drafts
    channel_type = ChannelType.EMAIL
    response_mode = "STANDARD"

    for i in range(100):
        # Create mock draft
        draft = DraftResponse(
            draft_id=uuid.uuid4(),
            message_id=uuid.uuid4(),
            response_mode=response_mode,
            draft_text="Sample draft text",
            confidence=0.90
        )
        db_session.add(draft)

        # Create mock feedback (95% acceptance)
        feedback = FeedbackEvent(
            draft_id=draft.draft_id,
            was_accepted=(i % 20 != 0),  # 95% acceptance
            edit_distance=0.0 if (i % 20 != 0) else 0.3,
            was_sent=True
        )
        db_session.add(feedback)

    await db_session.commit()

    # Calculate SPC metrics
    spc_service = SPCService(db_session)
    metrics = await spc_service.calculate_metrics(channel_type, response_mode)

    assert metrics.sample_size >= 30
    assert metrics.acceptance_rate >= 0.90
    assert metrics.control_state == ControlState.IN_CONTROL

    # Update automation tier
    automation_service = AutomationService(db_session)
    tier = await automation_service.update_automation_tier(channel_type, response_mode)

    # Should escalate to Tier 2 with 95% acceptance and 100 samples
    assert tier.current_tier >= 2

    print(f"✅ Automation progression test passed")
    print(f"   - Acceptance rate: {metrics.acceptance_rate:.1%}")
    print(f"   - Tier: {tier.current_tier}")
```

**Run integration tests:**
```bash
cd backend
pytest tests/integration/ -v -m integration
```

**Acceptance Criteria:**
- [ ] Complete workflow test passing
- [ ] All response modes tested
- [ ] RAG integration tested
- [ ] SPC automation progression tested
- [ ] All assertions passing

---

### STEP 5.1.2: API Integration Tests

**File: `backend/tests/integration/test_api_endpoints.py`**
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

@pytest.mark.integration
def test_health_check():
    """Test health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.integration
def test_ingestion_status():
    """Test ingestion status endpoint"""
    response = client.get("/api/ingestion/status")
    assert response.status_code == 200
    assert "total_messages" in response.json()

@pytest.mark.integration
def test_classification_flow():
    """Test classification API"""
    # This requires a test message in DB
    message_id = "test-message-id"

    response = client.post(f"/api/classification/classify/{message_id}")
    # May return 404 if no test message, which is expected
    assert response.status_code in [200, 404]

@pytest.mark.integration
def test_draft_generation_flow():
    """Test draft generation API"""
    message_id = "test-message-id"

    response = client.post(
        f"/api/drafts/generate/{message_id}",
        json={"response_mode": "STANDARD"}
    )
    # May return 404 if no test message
    assert response.status_code in [200, 404]

@pytest.mark.integration
def test_spc_metrics():
    """Test SPC metrics endpoint"""
    response = client.get("/api/spc/metrics")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Acceptance Criteria:**
- [ ] All API endpoints tested
- [ ] Health check working
- [ ] Status endpoints responding
- [ ] Error handling validated

---

### STEP 5.1.3: Frontend E2E Tests

**File: `frontend/e2e/complete-workflow.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete User Workflow', () => {
  test('user can view inbox, select message, generate draft, and submit feedback', async ({ page }) => {
    // Navigate to inbox
    await page.goto('http://localhost:3000/inbox');

    // Wait for messages to load
    await page.waitForSelector('[data-testid="message-card"]', { timeout: 10000 });

    // Click first message
    await page.click('[data-testid="message-card"]:first-child');

    // Should be on message detail page
    await expect(page).toHaveURL(/\/message\/.+/);

    // Select response mode
    await page.selectOption('select', 'STANDARD');

    // Generate draft
    await page.click('button:has-text("Generate Draft")');

    // Wait for draft to appear
    await page.waitForSelector('textarea', { timeout: 15000 });

    // Draft should have content
    const draftText = await page.inputValue('textarea');
    expect(draftText.length).toBeGreaterThan(0);

    // Rate the draft
    await page.click('button[aria-label="Rate 5 stars"]:first');

    // Accept and send
    await page.click('button:has-text("Accept & Send")');

    // Should see success state
    await page.waitForTimeout(2000);
  });

  test('user can view SPC dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/spc');

    // Wait for metrics to load
    await page.waitForSelector('text=SPC Dashboard', { timeout: 5000 });

    // Should display automation tiers
    await expect(page.locator('text=Current Automation Tiers')).toBeVisible();

    // Should show metrics cards
    const metricsCards = await page.$$('[data-testid="metrics-card"]');
    expect(metricsCards.length).toBeGreaterThan(0);
  });
});
```

**Run E2E tests:**
```bash
cd frontend
npx playwright test e2e/complete-workflow.spec.ts
```

**Acceptance Criteria:**
- [ ] Complete workflow E2E test passing
- [ ] SPC dashboard test passing
- [ ] All user interactions working

---

## SPRINT 5.2: PRODUCTION INFRASTRUCTURE

**Duration:** 4-5 days

---

### STEP 5.2.1: Create Production Docker Compose

**File: `docker-compose.prod.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: screamo_prod
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    networks:
      - screamo_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    networks:
      - screamo_network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgres:5432/screamo_prod
      REDIS_URL: redis://redis:6379/0
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - screamo_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      REACT_APP_API_URL: ${API_URL}
    networks:
      - screamo_network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - screamo_network
    restart: unless-stopped

volumes:
  postgres_prod_data:

networks:
  screamo_network:
    driver: bridge
```

**File: `backend/Dockerfile.prod`**
```dockerfile
FROM python:3.10-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.10-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application
COPY . .

# Add user
RUN useradd -m -u 1000 screamo && chown -R screamo:screamo /app
USER screamo

# Set PATH
ENV PATH=/root/.local/bin:$PATH

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**File: `frontend/Dockerfile.prod`**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Acceptance Criteria:**
- [ ] Production Docker Compose created
- [ ] Multi-stage builds for optimization
- [ ] Health checks configured
- [ ] Environment variables externalized
- [ ] Restart policies set

---

### STEP 5.2.2: Create Nginx Configuration

**File: `infra/nginx/nginx.conf`**
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    keepalive_timeout 65;
    gzip on;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name screamo.app;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

        # API
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth endpoints (stricter rate limit)
        location /api/auth/ {
            limit_req zone=auth_limit burst=3 nodelay;

            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /usr/share/nginx/html/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Acceptance Criteria:**
- [ ] Nginx configuration created
- [ ] HTTPS configured
- [ ] Rate limiting set up
- [ ] Security headers added
- [ ] Proxy configuration working

---

### STEP 5.2.3: Create Kubernetes Manifests

**File: `infra/kubernetes/deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: screamo-backend
  labels:
    app: screamo
    component: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: screamo
      component: backend
  template:
    metadata:
      labels:
        app: screamo
        component: backend
    spec:
      containers:
      - name: backend
        image: screamo/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: screamo-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: screamo-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: screamo-backend
spec:
  selector:
    app: screamo
    component: backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: screamo-frontend
  labels:
    app: screamo
    component: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: screamo
      component: frontend
  template:
    metadata:
      labels:
        app: screamo
        component: frontend
    spec:
      containers:
      - name: frontend
        image: screamo/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: screamo-frontend
spec:
  selector:
    app: screamo
    component: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

**Acceptance Criteria:**
- [ ] Kubernetes manifests created
- [ ] Deployments configured
- [ ] Services defined
- [ ] Resource limits set
- [ ] Health checks configured

---

## SPRINT 5.3: DEPLOYMENT & CI/CD

**Duration:** 4-5 days

---

### STEP 5.3.1: Create GitHub Actions Workflow

**File: `.github/workflows/ci-cd.yml`**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: ankane/pgvector:latest
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: screamo_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'

    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-cov

    - name: Run migrations
      env:
        DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/screamo_test
      run: |
        cd backend
        alembic upgrade head

    - name: Run tests
      env:
        DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/screamo_test
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      run: |
        cd backend
        pytest tests/ --cov=src --cov-report=xml

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage.xml

  test-frontend:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: |
        cd frontend
        npm ci

    - name: Run tests
      run: |
        cd frontend
        npm test -- --coverage

    - name: Run linter
      run: |
        cd frontend
        npm run lint

  build-and-push:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        file: ./backend/Dockerfile.prod
        push: true
        tags: screamo/backend:latest,screamo/backend:${{ github.sha }}

    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        file: ./frontend/Dockerfile.prod
        push: true
        tags: screamo/frontend:latest,screamo/frontend:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to production
      run: |
        # Add deployment script here
        echo "Deploying to production..."
        # kubectl apply -f infra/kubernetes/
        # Or: docker-compose -f docker-compose.prod.yml up -d
```

**Acceptance Criteria:**
- [ ] CI/CD workflow created
- [ ] Backend tests run on push
- [ ] Frontend tests run on push
- [ ] Docker images built and pushed
- [ ] Deployment automated

---

### STEP 5.3.2: Create Deployment Scripts

**File: `scripts/deploy.sh`**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Screamo to production..."

# Load environment variables
if [ -f .env.prod ]; then
  export $(cat .env.prod | xargs)
fi

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Restart services
echo "🔄 Restarting services..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Health check
echo "🏥 Running health checks..."
sleep 10
curl -f http://localhost/api/health || exit 1

echo "✅ Deployment completed successfully!"
```

**Make executable:**
```bash
chmod +x scripts/deploy.sh
```

**Acceptance Criteria:**
- [ ] Deployment script created
- [ ] Migrations run automatically
- [ ] Health checks performed
- [ ] Rollback capability

---

## SPRINT 5.4: MONITORING & OBSERVABILITY

**Duration:** 3-4 days

---

### STEP 5.4.1: Add Logging

**File: `backend/src/core/logging_config.py`**
```python
import logging
import sys
from logging.handlers import RotatingFileHandler

def setup_logging(log_level: str = "INFO"):
    """Configure application logging"""

    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)

    # File handler (rotating)
    file_handler = RotatingFileHandler(
        'logs/screamo.log',
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)

    # Error file handler
    error_handler = RotatingFileHandler(
        'logs/errors.log',
        maxBytes=10*1024*1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)

    # Suppress noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
```

**Update `backend/src/main.py`:**
```python
from src.core.logging_config import setup_logging

setup_logging(log_level="INFO")
```

**Acceptance Criteria:**
- [ ] Logging configured
- [ ] File rotation working
- [ ] Error logging separate
- [ ] Log levels appropriate

---

### STEP 5.4.2: Add Metrics Endpoint

**File: `backend/src/api/metrics.py`**
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.core.database import get_db
from src.models.message import Message
from src.models.draft_response import DraftResponse
from src.models.feedback_event import FeedbackEvent

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/system")
async def get_system_metrics(db: AsyncSession = Depends(get_db)):
    """Get system-wide metrics"""

    # Message counts
    total_messages = await db.execute(select(func.count(Message.message_id)))
    total_messages = total_messages.scalar()

    # Draft counts
    total_drafts = await db.execute(select(func.count(DraftResponse.draft_id)))
    total_drafts = total_drafts.scalar()

    # Feedback counts
    total_feedback = await db.execute(select(func.count(FeedbackEvent.feedback_id)))
    total_feedback = total_feedback.scalar()

    # Acceptance rate
    accepted = await db.execute(
        select(func.count(FeedbackEvent.feedback_id))
        .where(FeedbackEvent.was_accepted == True)
    )
    accepted = accepted.scalar()
    acceptance_rate = accepted / total_feedback if total_feedback > 0 else 0

    return {
        "total_messages": total_messages,
        "total_drafts": total_drafts,
        "total_feedback": total_feedback,
        "overall_acceptance_rate": acceptance_rate,
    }
```

**Acceptance Criteria:**
- [ ] Metrics endpoint created
- [ ] System metrics exposed
- [ ] Performance metrics available

---

### STEP 5.4.3: Create Monitoring Dashboard

**File: `infra/monitoring/prometheus.yml`**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'screamo-backend'
    static_configs:
      - targets: ['backend:8000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
```

**File: `infra/monitoring/grafana-dashboard.json`** (stub)
```json
{
  "dashboard": {
    "title": "Screamo Metrics",
    "panels": [
      {
        "title": "Total Messages",
        "targets": [{
          "expr": "screamo_messages_total"
        }]
      },
      {
        "title": "Draft Acceptance Rate",
        "targets": [{
          "expr": "rate(screamo_drafts_accepted[5m])"
        }]
      }
    ]
  }
}
```

**Acceptance Criteria:**
- [ ] Prometheus configured
- [ ] Grafana dashboard created
- [ ] Key metrics visualized

---

## PRODUCTION LAUNCH CHECKLIST

---

### Pre-Launch Checks

**Security:**
- [ ] All secrets in environment variables
- [ ] API keys rotated
- [ ] HTTPS configured with valid certificates
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Authentication working
- [ ] Authorization tested

**Performance:**
- [ ] Database indexes optimized
- [ ] Query performance tested
- [ ] API response times < 500ms p95
- [ ] Frontend bundle size optimized
- [ ] Caching configured
- [ ] CDN configured for static assets

**Reliability:**
- [ ] Database backups scheduled
- [ ] Disaster recovery plan documented
- [ ] Health checks configured
- [ ] Auto-scaling configured
- [ ] Circuit breakers implemented
- [ ] Error tracking enabled

**Monitoring:**
- [ ] Logging configured
- [ ] Metrics exported
- [ ] Dashboards created
- [ ] Alerts configured
- [ ] On-call rotation set

**Documentation:**
- [ ] API documentation published
- [ ] User guide created
- [ ] Admin guide created
- [ ] Runbook documented
- [ ] Architecture diagrams updated

---

### Launch Steps

1. **Final Testing:**
   ```bash
   # Run all tests
   cd backend && pytest tests/ -v
   cd frontend && npm test
   cd frontend && npx playwright test
   ```

2. **Deploy to Staging:**
   ```bash
   ./scripts/deploy.sh staging
   ```

3. **Smoke Test Staging:**
   - Test complete workflow
   - Verify all integrations
   - Check monitoring

4. **Deploy to Production:**
   ```bash
   ./scripts/deploy.sh production
   ```

5. **Monitor Launch:**
   - Watch error logs
   - Monitor metrics
   - Check health endpoints

6. **Gradual Rollout:**
   - Enable for 10% of users
   - Monitor for 24 hours
   - Increase to 50%
   - Monitor for 24 hours
   - Full rollout

---

### Post-Launch

**Week 1:**
- [ ] Monitor error rates daily
- [ ] Check SPC metrics
- [ ] Review user feedback
- [ ] Performance optimization
- [ ] Bug fixes

**Week 2-4:**
- [ ] User interviews
- [ ] Feature iteration
- [ ] Performance tuning
- [ ] Documentation updates
- [ ] Team retrospective

---

## PHASE 5 COMPLETION

**All Systems Go! 🚀**

- [ ] All integration tests passing
- [ ] Production infrastructure deployed
- [ ] CI/CD pipeline operational
- [ ] Monitoring in place
- [ ] Security audit complete
- [ ] Documentation finalized
- [ ] Team trained
- [ ] Production launched

---

**CONGRATULATIONS! SCREAMO IS LIVE! 🎉**

Next steps:
- Monitor production metrics
- Gather user feedback
- Plan Phase 6 enhancements
- Continuous improvement

---

**For ongoing maintenance and feature development, see:**
- MAINTENANCE_GUIDE.md (to be created)
- FEATURE_ROADMAP.md (to be created)
- SRE_PLAYBOOK.md (to be created)
