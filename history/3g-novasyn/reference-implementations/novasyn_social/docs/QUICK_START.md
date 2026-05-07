# SCREAMO QUICK START GUIDE
## Get Up and Running in 15 Minutes

**Version:** 1.0
**Last Updated:** 2025-11-23

---

## OVERVIEW

This guide will get you from zero to a running Screamo instance in under 15 minutes. Perfect for:
- New developers joining the team
- AI coding assistants setting up dev environments
- Quick prototyping and testing

---

## PREREQUISITES

Before you begin, ensure you have:

- [x] **Docker** 20.10+ and **Docker Compose** 2.0+
- [x] **Git** installed
- [x] **Node.js** 18+ and **npm** (for frontend development)
- [x] **Python** 3.10+ (for backend development)
- [x] **OpenAI API Key** (get from https://platform.openai.com)
- [x] 8GB RAM minimum, 16GB recommended
- [x] 10GB disk space

---

## QUICK START (Docker)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourorg/screamo.git
cd screamo
```

### Step 2: Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```bash
# Required
OPENAI_API_KEY=sk-proj-...

# Optional (for full functionality)
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
YOUTUBE_API_KEY=your-youtube-api-key
```

### Step 3: Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database (port 5432)
- Redis (port 6379)
- Backend API (port 8000)
- Frontend UI (port 3000)

### Step 4: Run Database Migrations

```bash
docker-compose exec backend alembic upgrade head
```

### Step 5: Verify Installation

Open your browser:
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

You should see:
```json
{"status": "healthy"}
```

**🎉 Congratulations! Screamo is running.**

---

## DEVELOPMENT SETUP (Local)

For active development without Docker:

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up database (PostgreSQL must be running)
createdb screamo
alembic upgrade head

# Start development server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend runs at:** http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Frontend runs at:** http://localhost:3000

---

## FIRST STEPS

### 1. Create Your First User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "securepassword123"
  }'
```

### 2. Log In

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "securepassword123"
  }'
```

Save the `access_token` from the response.

### 3. Ingest Test Messages

```bash
# Create a test message
curl -X POST http://localhost:8000/api/messages/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "test_001",
    "channel_type": "EMAIL",
    "sender_name": "Test Sender",
    "sender_handle": "test@example.com",
    "message_body": "Hi! I would like to discuss a partnership opportunity with you."
  }'
```

### 4. Classify the Message

```bash
curl -X POST http://localhost:8000/api/classification/classify/MESSAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Generate a Draft Response

```bash
curl -X POST http://localhost:8000/api/drafts/generate/MESSAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "response_mode": "STANDARD"
  }'
```

---

## VERIFY EACH COMPONENT

### Database

```bash
docker-compose exec postgres psql -U screamo -d screamo -c "\dt"
```

You should see tables: `messages`, `classifications`, `draft_responses`, etc.

### Redis

```bash
docker-compose exec redis redis-cli ping
```

Expected output: `PONG`

### Backend API

```bash
curl http://localhost:8000/health
```

Expected output: `{"status":"healthy"}`

### Frontend

Open http://localhost:3000 in your browser. You should see the Screamo dashboard.

---

## COMMON ISSUES

### Database Connection Error

**Error:** `sqlalchemy.exc.OperationalError: could not connect to server`

**Solution:**
```bash
# Ensure PostgreSQL is running
docker-compose ps postgres

# Restart if needed
docker-compose restart postgres
```

### OpenAI API Error

**Error:** `openai.error.AuthenticationError: Incorrect API key`

**Solution:**
1. Verify your API key in `.env`
2. Ensure the key starts with `sk-`
3. Restart backend: `docker-compose restart backend`

### Frontend Can't Connect to Backend

**Error:** `Network Error` in browser console

**Solution:**
1. Check backend is running: `docker-compose ps backend`
2. Verify CORS settings in `backend/src/main.py`
3. Check environment variable: `REACT_APP_API_URL=http://localhost:8000`

### Port Already in Use

**Error:** `port is already allocated`

**Solution:**
```bash
# Find what's using the port (example: 8000)
lsof -i :8000  # On Mac/Linux
netstat -ano | findstr :8000  # On Windows

# Kill the process or change ports in docker-compose.yml
```

---

## SAMPLE DATA

Load sample data for testing:

```bash
# Run sample data script
docker-compose exec backend python scripts/load_sample_data.py
```

This creates:
- 20 sample messages across all channels
- Pre-classified messages
- Sample knowledge base entries
- Initial SPC metrics

---

## TESTING YOUR SETUP

Run the test suite:

```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
cd frontend && npm test
```

All tests should pass ✅

---

## NEXT STEPS

Now that Screamo is running, explore:

1. **[AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md)** - Complete technical reference
2. **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** - Step-by-step implementation guide
3. **[API_SPECIFICATIONS.md](./API_SPECIFICATIONS.md)** - Full API documentation
4. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database design reference

---

## SHUTTING DOWN

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v
```

---

## CONFIGURATION OPTIONS

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `SECRET_KEY` | Yes | - | JWT secret key |
| `GMAIL_CLIENT_ID` | No | - | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | No | - | Gmail OAuth secret |
| `LINKEDIN_CLIENT_ID` | No | - | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | No | - | LinkedIn OAuth secret |
| `YOUTUBE_API_KEY` | No | - | YouTube Data API key |
| `SPC_SAMPLE_SIZE` | No | 30 | SPC rolling window size |
| `LINKEDIN_POST_DAILY_LIMIT` | No | 5 | Max LinkedIn posts per day |

---

## PRODUCTION DEPLOYMENT

For production deployment, see:
- **Infrastructure Setup:** [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md#phase-5-integration--deployment)
- **Security Checklist:** [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md#security--authentication)
- **Monitoring:** Configure Prometheus + Grafana (see infra/kubernetes/)

---

## SUPPORT

**Documentation:**
- AI_ASSISTANT_GUIDE.md - Technical deep dive
- DEVELOPMENT_PLAN.md - Implementation roadmap
- API_SPECIFICATIONS.md - API reference
- DATABASE_SCHEMA.md - Database design

**Need Help?**
- Check GitHub Issues
- Join Slack: #screamo-dev
- Email: dev@screamo.app

---

**You're ready to start building with Screamo! 🚀**
