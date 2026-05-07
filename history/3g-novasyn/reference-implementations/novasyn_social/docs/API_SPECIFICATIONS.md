# SCREAMO API SPECIFICATIONS
## Complete API Reference Documentation

**Version:** 1.0
**Last Updated:** 2025-11-23
**Base URL:** `https://api.screamo.app` (production) / `http://localhost:8000` (development)

---

## TABLE OF CONTENTS

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Ingestion API](#ingestion-api)
4. [Classification API](#classification-api)
5. [Prioritization API](#prioritization-api)
6. [Draft Generation API](#draft-generation-api)
7. [Feedback API](#feedback-api)
8. [Knowledge Base API](#knowledge-base-api)
9. [SPC API](#spc-api)
10. [Feed Scanner API](#feed-scanner-api)
11. [UI API](#ui-api)
12. [External Platform APIs](#external-platform-apis)
13. [Error Handling](#error-handling)
14. [Rate Limits](#rate-limits)
15. [Webhooks](#webhooks)

---

## API OVERVIEW

### Architecture

Screamo uses a **RESTful API architecture** with the following characteristics:

- **Protocol:** HTTPS (TLS 1.2+)
- **Format:** JSON (application/json)
- **Authentication:** JWT Bearer tokens
- **Versioning:** URL path versioning (`/api/v1/...`)
- **Pagination:** Cursor-based for large datasets
- **Rate Limiting:** Token bucket algorithm

### Base Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "metadata": {
    "timestamp": "2025-11-23T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "sender_handle",
      "constraint": "email_format"
    }
  },
  "metadata": {
    "timestamp": "2025-11-23T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## AUTHENTICATION

### JWT Bearer Token

All API requests (except `/health` and `/auth/*`) require authentication via JWT token.

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Endpoints

#### POST `/api/auth/login`

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

#### POST `/api/auth/refresh`

Refresh expired token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Same as login

#### POST `/api/auth/logout`

Invalidate current token.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## INGESTION API

### POST `/api/ingestion/gmail`

Manually trigger Gmail message ingestion.

**Request:**
```json
{
  "access_token": "ya29.a0AfH6SMBx...",
  "since": "2025-11-20T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages_ingested": 42,
    "channel": "gmail",
    "duration_ms": 1250
  }
}
```

**Rate Limit:** 10 requests/hour

---

### POST `/api/ingestion/linkedin`

Trigger LinkedIn message ingestion.

**Request:**
```json
{
  "access_token": "AQVdw...",
  "since": "2025-11-20T00:00:00Z"
}
```

**Response:** Same format as Gmail

---

### POST `/api/ingestion/youtube`

Trigger YouTube comment ingestion.

**Request:**
```json
{
  "api_key": "AIzaSyD...",
  "channel_id": "UCxxxxxxxxxxxxxx",
  "since": "2025-11-20T00:00:00Z"
}
```

**Response:** Same format

---

### GET `/api/ingestion/status`

Get ingestion statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_messages": 1543,
    "by_channel": {
      "EMAIL": 892,
      "LINKEDIN_DM": 421,
      "LINKEDIN_COMMENT": 187,
      "YOUTUBE_COMMENT": 43
    },
    "last_ingestion": {
      "EMAIL": "2025-11-23T10:15:00Z",
      "LINKEDIN_DM": "2025-11-23T09:30:00Z",
      "LINKEDIN_COMMENT": "2025-11-23T08:45:00Z",
      "YOUTUBE_COMMENT": "2025-11-22T18:00:00Z"
    }
  }
}
```

---

## CLASSIFICATION API

### POST `/api/classification/classify/{message_id}`

Classify a single message.

**Path Parameters:**
- `message_id` (UUID) - Message to classify

**Response:**
```json
{
  "success": true,
  "data": {
    "classification_id": "550e8400-e29b-41d4-a716-446655440000",
    "message_id": "660e8400-e29b-41d4-a716-446655440001",
    "opportunity_type": "PARTNERSHIP",
    "sentiment": "POSITIVE",
    "intent": "PROMOTIONAL",
    "topic_alignment": "ALIGNED",
    "hostility_level": 0.0,
    "confidence": 0.92,
    "explanation": "This is a partnership inquiry from a relevant industry contact with positive tone."
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Message not found
- `409 CONFLICT` - Message already classified
- `500 INTERNAL_ERROR` - Classification service failure

---

### POST `/api/classification/classify-batch`

Classify multiple messages.

**Request:**
```json
{
  "message_ids": [
    "660e8400-e29b-41d4-a716-446655440001",
    "660e8400-e29b-41d4-a716-446655440002",
    "660e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "classifications": [
      { ... },
      { ... },
      { ... }
    ],
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

**Rate Limit:** 100 messages per request

---

### POST `/api/classification/reclassify/{message_id}`

Reclassify message with human corrections (for training).

**Request:**
```json
{
  "corrections": {
    "opportunity_type": "SALES_LEAD",
    "sentiment": "NEUTRAL",
    "explanation": "Actually a sales inquiry, not partnership"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "classification_id": "550e8400-e29b-41d4-a716-446655440000",
    "message_id": "660e8400-e29b-41d4-a716-446655440001",
    "opportunity_type": "SALES_LEAD",
    "sentiment": "NEUTRAL",
    "confidence": 0.92,
    "explanation": "Actually a sales inquiry, not partnership",
    "reclassified": true
  }
}
```

---

## PRIORITIZATION API

### POST `/api/prioritization/compute/{message_id}`

Compute priority score for a message.

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "660e8400-e29b-41d4-a716-446655440001",
    "priority_score": 85.3,
    "factors": {
      "base_score": 90.0,
      "sentiment_modifier": 1.2,
      "confidence_multiplier": 0.92,
      "alignment_bonus": 2.0,
      "hostility_urgency": 0.0
    }
  }
}
```

---

### POST `/api/prioritization/reprioritize-all`

Recalculate all message priorities (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "messages_reprioritized": 1543,
    "duration_ms": 3200
  }
}
```

---

## DRAFT GENERATION API

### POST `/api/drafts/generate/{message_id}`

Generate AI draft response.

**Request:**
```json
{
  "response_mode": "STANDARD",
  "context_preferences": {
    "include_thread": true,
    "include_kb_style": true,
    "max_length": 500
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draft_id": "770e8400-e29b-41d4-a716-446655440000",
    "message_id": "660e8400-e29b-41d4-a716-446655440001",
    "response_mode": "STANDARD",
    "draft_text": "Hi Sarah,\n\nThank you for reaching out about the partnership opportunity...",
    "style_pass_applied": true,
    "confidence": 0.88,
    "rationale_text": "Generated standard professional response with user's friendly-yet-direct tone.",
    "generated_timestamp": "2025-11-23T10:30:00Z"
  }
}
```

**Response Modes:**
- `STANDARD` - Professional direct response
- `AGREE_AMPLIFY` - Agree with original post and expand
- `EDUCATE` - Polite correction with evidence
- `BATTLE` - Structured rebuttal (requires approval)

**Errors:**
- `404 NOT_FOUND` - Message not found
- `400 BAD_REQUEST` - Message not classified yet
- `500 INTERNAL_ERROR` - Generation failed

---

### POST `/api/drafts/regenerate/{draft_id}`

Regenerate draft with different mode or context.

**Request:**
```json
{
  "response_mode": "EDUCATE",
  "regeneration_reason": "User requested more educational tone"
}
```

**Response:** Same as generate

---

### GET `/api/drafts/{draft_id}`

Retrieve existing draft.

**Response:**
```json
{
  "success": true,
  "data": {
    "draft_id": "770e8400-e29b-41d4-a716-446655440000",
    "message_id": "660e8400-e29b-41d4-a716-446655440001",
    "response_mode": "STANDARD",
    "draft_text": "...",
    "style_pass_applied": true,
    "confidence": 0.88,
    "generated_timestamp": "2025-11-23T10:30:00Z"
  }
}
```

---

## FEEDBACK API

### POST `/api/feedback/submit`

Submit user feedback on a draft.

**Request:**
```json
{
  "draft_id": "770e8400-e29b-41d4-a716-446655440000",
  "final_text": "Hi Sarah,\n\nThanks for reaching out! I'd love to explore this partnership...",
  "edit_classification": "TONE",
  "user_rating": 4,
  "was_sent": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "feedback_id": "880e8400-e29b-41d4-a716-446655440000",
    "draft_id": "770e8400-e29b-41d4-a716-446655440000",
    "edit_distance": 0.15,
    "edit_classification": "TONE",
    "was_accepted": false,
    "was_sent": true,
    "timestamp": "2025-11-23T10:35:00Z"
  }
}
```

**Edit Classifications:**
- `TONE` - Changed tone/style
- `FACTUAL_CORRECTION` - Fixed factual errors
- `STRUCTURAL` - Changed structure/organization
- `OTHER` - Other types of edits

---

### POST `/api/feedback/accept/{draft_id}`

Accept draft without edits.

**Response:**
```json
{
  "success": true,
  "data": {
    "feedback_id": "880e8400-e29b-41d4-a716-446655440000",
    "draft_id": "770e8400-e29b-41d4-a716-446655440000",
    "edit_distance": 0.0,
    "was_accepted": true,
    "was_sent": true,
    "timestamp": "2025-11-23T10:35:00Z"
  }
}
```

---

### POST `/api/feedback/reject/{draft_id}`

Reject draft entirely.

**Request:**
```json
{
  "rejection_reason": "Too formal for this contact"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "feedback_id": "880e8400-e29b-41d4-a716-446655440000",
    "draft_id": "770e8400-e29b-41d4-a716-446655440000",
    "was_accepted": false,
    "was_sent": false,
    "rejection_reason": "Too formal for this contact"
  }
}
```

---

## KNOWLEDGE BASE API

### POST `/api/kb/add-entry`

Add entry to knowledge base.

**Request:**
```json
{
  "raw_text": "I believe that clear communication is essential for successful partnerships...",
  "category": "OPINION",
  "source_type": "MANUAL_ENTRY",
  "metadata": {
    "topic": "communication",
    "importance": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kb_entry_id": "990e8400-e29b-41d4-a716-446655440000",
    "raw_text": "...",
    "category": "OPINION",
    "embedding_generated": true,
    "timestamp_added": "2025-11-23T10:40:00Z"
  }
}
```

**Categories:**
- `STYLE` - Writing style samples
- `OPINION` - User opinions and viewpoints
- `GOLD_STANDARD_REPLY` - High-quality approved responses
- `REDLINE_TOPIC` - Topics requiring manual approval
- `EXPERTISE` - Domain expertise demonstrations

---

### POST `/api/kb/search`

Search knowledge base with semantic similarity.

**Request:**
```json
{
  "query": "How do I handle partnership inquiries?",
  "category": "GOLD_STANDARD_REPLY",
  "top_k": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "kb_entry_id": "990e8400-e29b-41d4-a716-446655440000",
        "raw_text": "When someone reaches out about partnerships, I always...",
        "category": "GOLD_STANDARD_REPLY",
        "similarity_score": 0.92
      },
      { ... }
    ],
    "total": 5
  }
}
```

---

### GET `/api/kb/entries`

List all KB entries with pagination.

**Query Parameters:**
- `category` (optional) - Filter by category
- `limit` (default: 50, max: 100)
- `cursor` (optional) - Pagination cursor

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [ ... ],
    "total": 243,
    "next_cursor": "eyJpZCI6IjEyMyJ9"
  }
}
```

---

### DELETE `/api/kb/entries/{kb_entry_id}`

Delete KB entry.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Entry deleted successfully"
  }
}
```

---

## SPC API

### GET `/api/spc/metrics`

Get current SPC metrics.

**Query Parameters:**
- `channel_type` (optional) - Filter by channel
- `response_mode` (optional) - Filter by mode

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "metric_id": "aa0e8400-e29b-41d4-a716-446655440000",
        "channel_type": "EMAIL",
        "response_mode": "STANDARD",
        "acceptance_rate": 0.68,
        "light_edit_rate": 0.22,
        "heavy_edit_rate": 0.10,
        "misclassification_rate": 0.03,
        "sample_size": 75,
        "control_state": "IN_CONTROL",
        "upper_control_limit": 0.85,
        "lower_control_limit": 0.50,
        "mean_value": 0.68,
        "calculated_at": "2025-11-23T10:00:00Z"
      },
      { ... }
    ]
  }
}
```

---

### POST `/api/spc/calculate`

Trigger SPC calculation (admin only).

**Request:**
```json
{
  "channel_type": "EMAIL",
  "response_mode": "STANDARD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metric_id": "aa0e8400-e29b-41d4-a716-446655440000",
    "control_state": "IN_CONTROL",
    "automation_recommendation": "INCREASE_TO_TIER_1"
  }
}
```

---

### GET `/api/spc/automation-tiers`

Get current automation tier settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "tiers": [
      {
        "tier_id": "bb0e8400-e29b-41d4-a716-446655440000",
        "channel_type": "EMAIL",
        "response_mode": "STANDARD",
        "current_tier": 1,
        "last_updated": "2025-11-22T14:30:00Z",
        "reason": "SPC metrics stable, increased from Tier 0"
      },
      { ... }
    ]
  }
}
```

**Tier Levels:**
- `0` - Manual Only (all drafts require human approval)
- `1` - Assisted Drafting (drafts generated, no auto-send)
- `2` - Auto-send Low-Risk (STANDARD & AGREE_AMPLIFY auto-send)
- `3` - Autonomous (rare, experimental)

---

### POST `/api/spc/set-tier`

Set automation tier (admin only, requires approval).

**Request:**
```json
{
  "channel_type": "EMAIL",
  "response_mode": "STANDARD",
  "new_tier": 2,
  "reason": "Manual override - high confidence after review"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tier_id": "bb0e8400-e29b-41d4-a716-446655440000",
    "channel_type": "EMAIL",
    "response_mode": "STANDARD",
    "current_tier": 2,
    "last_updated": "2025-11-23T10:45:00Z",
    "reason": "Manual override - high confidence after review"
  }
}
```

---

## FEED SCANNER API

### POST `/api/feed-scanner/scan-linkedin`

Scan LinkedIn feed for engagement opportunities.

**Request:**
```json
{
  "access_token": "AQVdw...",
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "opportunity_id": "cc0e8400-e29b-41d4-a716-446655440000",
        "post_id": "urn:li:activity:1234567890",
        "post_author": "Jane Doe",
        "post_text": "Just launched our new AI platform...",
        "opportunity_type": "AGREE_AMPLIFY",
        "alignment_score": 0.89,
        "suggested_comment": "This looks amazing! I've been working on similar AI orchestration patterns...",
        "confidence": 0.82,
        "timestamp": "2025-11-23T10:50:00Z"
      },
      { ... }
    ],
    "total_scanned": 50,
    "opportunities_found": 8
  }
}
```

---

### POST `/api/feed-scanner/approve-comment/{opportunity_id}`

Approve and post a suggested comment.

**Request:**
```json
{
  "final_comment": "This looks amazing! I've been working on similar AI orchestration patterns..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunity_id": "cc0e8400-e29b-41d4-a716-446655440000",
    "comment_posted": true,
    "comment_url": "https://www.linkedin.com/feed/update/urn:li:activity:1234567890/",
    "timestamp": "2025-11-23T10:52:00Z"
  }
}
```

**Rate Limit:** Respects platform limits (5 posts/day for LinkedIn)

---

### POST `/api/feed-scanner/reject-comment/{opportunity_id}`

Reject suggested comment.

**Request:**
```json
{
  "rejection_reason": "Not relevant enough"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunity_id": "cc0e8400-e29b-41d4-a716-446655440000",
    "rejected": true
  }
}
```

---

## UI API

### GET `/api/ui/inbox`

Get unified inbox with prioritized messages.

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `cursor` (optional) - Pagination cursor
- `channel_type` (optional) - Filter by channel
- `min_priority` (optional) - Minimum priority score

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "message_id": "660e8400-e29b-41d4-a716-446655440001",
        "external_id": "msg_123abc",
        "channel_type": "EMAIL",
        "sender_name": "Sarah Johnson",
        "sender_handle": "sarah@company.com",
        "timestamp_received": "2025-11-23T09:30:00Z",
        "message_body": "Hi, I'd like to discuss a partnership...",
        "priority_score": 85.3,
        "classification": {
          "opportunity_type": "PARTNERSHIP",
          "sentiment": "POSITIVE",
          "confidence": 0.92
        },
        "has_draft": false,
        "thread_message_count": 1
      },
      { ... }
    ],
    "total": 1543,
    "next_cursor": "eyJpZCI6IjEyMyIsInNjb3JlIjo4MC4wfQ=="
  }
}
```

---

### GET `/api/ui/message/{message_id}/detail`

Get full message details for detail panel.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "message_id": "660e8400-e29b-41d4-a716-446655440001",
      "external_id": "msg_123abc",
      "channel_type": "EMAIL",
      "sender_name": "Sarah Johnson",
      "sender_handle": "sarah@company.com",
      "timestamp_received": "2025-11-23T09:30:00Z",
      "message_body": "...",
      "priority_score": 85.3
    },
    "classification": {
      "opportunity_type": "PARTNERSHIP",
      "sentiment": "POSITIVE",
      "intent": "PROMOTIONAL",
      "topic_alignment": "ALIGNED",
      "confidence": 0.92,
      "explanation": "..."
    },
    "thread_context": [
      {
        "message_id": "660e8400-e29b-41d4-a716-446655440000",
        "sender_name": "You",
        "message_body": "...",
        "timestamp_received": "2025-11-20T15:00:00Z"
      }
    ],
    "available_drafts": [
      {
        "draft_id": "770e8400-e29b-41d4-a716-446655440000",
        "response_mode": "STANDARD",
        "confidence": 0.88
      }
    ]
  }
}
```

---

### GET `/api/ui/dashboard`

Get dashboard summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "new_messages_count": 23,
    "pending_review_count": 15,
    "high_priority_messages": [
      { ... }
    ],
    "spc_status": {
      "EMAIL_STANDARD": "IN_CONTROL",
      "LINKEDIN_DM_STANDARD": "WARNING",
      "EMAIL_AGREE_AMPLIFY": "IN_CONTROL"
    },
    "recent_actions": [
      {
        "type": "MESSAGE_INGESTED",
        "channel": "EMAIL",
        "count": 12,
        "timestamp": "2025-11-23T10:00:00Z"
      },
      {
        "type": "DRAFT_GENERATED",
        "count": 8,
        "timestamp": "2025-11-23T10:15:00Z"
      }
    ],
    "automation_tiers": {
      "EMAIL_STANDARD": 1,
      "LINKEDIN_DM_STANDARD": 0,
      "EMAIL_AGREE_AMPLIFY": 2
    }
  }
}
```

---

## EXTERNAL PLATFORM APIs

### Gmail API Integration

**Base URL:** `https://gmail.googleapis.com/gmail/v1`

**Key Endpoints Used:**
- `GET /users/me/messages` - List messages
- `GET /users/me/messages/{id}` - Get message detail
- `POST /users/me/messages/send` - Send message
- `GET /users/me/threads/{id}` - Get thread

**Authentication:** OAuth 2.0 with scopes:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`

**Rate Limits:** 250 quota units/user/second

---

### LinkedIn API Integration

**Base URL:** `https://api.linkedin.com/v2`

**Key Endpoints Used:**
- `GET /me` - Get user profile
- `GET /communications/conversations` - Get DM conversations
- `GET /ugcPosts` - Get feed posts
- `POST /ugcPosts` - Create post/comment
- `GET /socialActions/{shareUrn}/comments` - Get comments

**Authentication:** OAuth 2.0 with scopes:
- `r_liteprofile`
- `r_emailaddress`
- `w_member_social`

**Rate Limits:** Varies by endpoint, typically 100/day for posting

---

### YouTube Data API Integration

**Base URL:** `https://www.googleapis.com/youtube/v3`

**Key Endpoints Used:**
- `GET /commentThreads` - List comment threads
- `GET /comments` - Get comment replies
- `POST /comments` - Post comment reply

**Authentication:** API Key or OAuth 2.0

**Rate Limits:** 10,000 quota units/day

---

## ERROR HANDLING

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., already exists) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "constraint": "format",
      "received": "invalid-email"
    }
  },
  "metadata": {
    "timestamp": "2025-11-23T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## RATE LIMITS

### Per-Endpoint Limits

| Endpoint Pattern | Limit | Window |
|-----------------|-------|---------|
| `/api/auth/*` | 10 | 1 minute |
| `/api/ingestion/*` | 10 | 1 hour |
| `/api/classification/*` | 100 | 1 minute |
| `/api/drafts/*` | 50 | 1 minute |
| `/api/feedback/*` | 200 | 1 minute |
| `/api/kb/*` | 100 | 1 minute |
| `/api/spc/*` | 50 | 1 minute |
| `/api/ui/*` | 200 | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2025-11-23T10:31:00Z
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retry_after": 60
  }
}
```

---

## WEBHOOKS

### POST `/api/webhooks/gmail`

Receive Gmail push notifications (Google Pub/Sub).

**Request:**
```json
{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDU2In0=",
    "messageId": "136969346945",
    "publishTime": "2025-11-23T10:00:00.000Z"
  },
  "subscription": "projects/myproject/subscriptions/mysubscription"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": true
  }
}
```

---

### POST `/api/webhooks/linkedin`

Receive LinkedIn event notifications.

*(LinkedIn webhook structure TBD based on their API)*

---

## VERSIONING

### API Version Header

All requests should include:
```
X-API-Version: 1.0
```

### Deprecation Notice

When endpoints are deprecated, responses include:
```
X-API-Deprecated: true
X-API-Sunset-Date: 2026-01-01
X-API-Migration-Guide: https://docs.screamo.app/migration/v2
```

---

## PAGINATION

### Cursor-Based Pagination

Large result sets use cursor-based pagination:

**Request:**
```
GET /api/ui/inbox?limit=50&cursor=eyJpZCI6IjEyMyIsInNjb3JlIjo4MC4wfQ==
```

**Response:**
```json
{
  "data": {
    "messages": [ ... ],
    "total": 1543,
    "next_cursor": "eyJpZCI6IjE3MyIsInNjb3JlIjo3NS4wfQ==",
    "has_more": true
  }
}
```

---

## TESTING

### Test API Endpoint

**GET `/api/test/echo`**

Echo request for testing.

**Query Parameters:**
- `message` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "echo": "Hello, world!",
    "timestamp": "2025-11-23T10:30:00Z"
  }
}
```

---

**END OF API SPECIFICATIONS**

For code examples and integration guides, see:
- AI_ASSISTANT_GUIDE.md
- DEVELOPMENT_PLAN.md
- Official SDK documentation (coming soon)
