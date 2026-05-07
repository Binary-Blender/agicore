# NovaSyn Social — Sprint Plan

## App Registry
- **Directory**: novasyn_social
- **Package**: novasyn-social
- **Port**: 5178
- **Database**: social.db
- **App ID**: com.novasyn.social

## Vision
NovaSyn Social is an AI-powered multi-channel communication orchestrator. It ingests messages from email, LinkedIn, YouTube, Twitter, and other platforms into a unified inbox, classifies them by opportunity and priority, generates AI drafts in your voice, and progressively automates proven response patterns using Statistical Process Control (SPC).

The four response modes:
1. **Standard** — AI-style with emojis, polished (DMs, emails)
2. **Agree & Amplify** — enthusiastic AI-style engagement (LinkedIn comments)
3. **Educate** — compliment sandwich corrections (misaligned posts)
4. **Battle** — humanized, no emojis, structured argumentation (hostile posts, ALWAYS manual)

## Sprint 1: App Scaffold + Unified Inbox (CURRENT)
- [x] Project configs (package.json, vite, tsconfig, tailwind)
- [x] Database with 001_social_core.sql (10 tables: settings, accounts, threads, messages, classifications, drafts, feedback_events, spc_metrics, automation_tiers, ai_log)
- [x] src/shared/types.ts (all interfaces, 28 IPC channels, ElectronAPI)
- [x] src/preload/index.ts (all channels wired)
- [x] src/main (db.ts, window.ts, models.ts, index.ts with all handlers + row mappers)
- [x] src/renderer (store, TitleBar, Sidebar, Dashboard, Inbox, MessageDetail, SettingsPanel, App.tsx)
- [x] docs (SPRINT_PLAN.md, ARCHITECTURE.md, DATABASE_SCHEMA.md)

### Sprint 1 Verification
- [ ] `npm install` succeeds
- [ ] `npm run type-check` passes both configs
- [ ] `npm run dev:renderer` starts on port 5178
- [ ] `npm run dev:main` launches Electron window
- [ ] Database auto-creates with all 10 tables
- [ ] Dashboard shows stats (zeroes for fresh db)
- [ ] Can create a manual message
- [ ] Inbox displays messages with filters
- [ ] Message detail shows full message
- [ ] Settings save and persist (theme, API keys)
- [ ] Window controls work (min/max/close)
- [ ] 28 IPC channels wired correctly

## Sprint 2: AI Classification & Draft Generation (COMPLETE)
- [x] Classification service using multi-model AI (classificationService.ts)
  - Opportunity type, sentiment, intent, topic alignment, hostility
  - Manual classify/reclassify from message detail
- [x] Draft generation with the 4 response modes (draftService.ts)
  - Standard: AI-style, emojis, em-dashes, polished
  - Agree & Amplify: enthusiastic, distinctive, emoji-heavy
  - Educate: compliment sandwich structure
  - Battle: humanized, no emojis, structured argumentation (ALWAYS manual)
- [x] Multi-provider AI service (aiService.ts) — Anthropic, OpenAI, Google, xAI
- [x] Streaming AI responses via webContents.send
- [x] AI usage logging to ai_log table
- [x] Draft editor with accept/edit/reject workflow + feedback submission
- [x] Feedback collection on every draft interaction (feeds SPC pipeline)

## Sprint 3: SPC & Automation Engine (COMPLETE)
- [x] SPC metrics calculation from feedback data (spcService.ts)
  - Acceptance rate, light/heavy edit rates, misclassification rate
  - Sample size tracking per channel/mode combo
  - Auto-recalculate after each feedback submission
- [x] Control chart (p-chart) implementation
  - 3-sigma control limits (UCL/LCL)
  - Rolling window analysis (last 10 samples)
  - Control state detection (in_control, warning, out_of_control, monitoring)
- [x] Automation tier management
  - Tier 0: manual only (default, Battle Mode permanent)
  - Tier 1: assisted drafting (50+ samples, 80% acceptance)
  - Tier 2: auto-send low-risk Standard + Agree & Amplify (100+ samples, 95%)
  - Tier 3: autonomous (500+ samples, 98% — experimental)
- [x] SPC dashboard with SVG control chart visualization (SPCDashboard.tsx)
- [x] Tier escalation/de-escalation logic (5% grace buffer)
- [x] Redline topics (force Tier 0 when detected, stored in settings)
- [x] Manual tier override from SPC dashboard
- [x] Fixed row mappers (SpcMetric, AutomationTierEntry, FeedbackEvent) to match actual SQL schema
- [x] Fixed MessageDetail field name mismatches (camelCase alignment)

## Sprint 4: Platform Integrations (COMPLETE)
- [x] OAuth2 service for Electron (oauthService.ts)
  - BrowserWindow-based OAuth flow with redirect catching
  - Platform configs for Gmail, LinkedIn, YouTube, Twitter
  - Token refresh support
- [x] Gmail integration (gmailService.ts)
  - REST API message listing and fetching
  - MIME multipart parsing, base64url decoding, HTML stripping
  - Full sync: list → fetch → parse → upsert into messages table
- [x] Sync service (syncService.ts)
  - Singleton with per-account status tracking
  - Auto token refresh when expired
  - Platform dispatch (Gmail implemented, LinkedIn/YouTube/Twitter stubbed)
  - Auto-sync with configurable interval, restored from settings on startup
- [x] Account management fixes
  - Fixed Account interface/mapper to match SQL schema (platform, accountName, accountHandle, isConnected)
  - Fixed CREATE_ACCOUNT handler column alignment
  - Added CONNECT_PLATFORM, DISCONNECT_ACCOUNT, SYNC_ACCOUNT, SYNC_ALL, GET_SYNC_STATUS, SET_AUTO_SYNC IPC handlers
- [x] Updated types.ts with SyncStatus interface + 6 new IPC channels
- [x] Updated preload with 6 new channel wirings
- [x] Updated socialStore with sync state + 6 new actions
- [x] Account management UI (AccountsPanel)
  - Connect Platform buttons with OAuth flow
  - Auto-sync toggle with interval selector
  - Accounts table with status, sync, disconnect, reconnect, delete
  - Sync status error display
- [x] OAuth credential fields in Settings (gmail_client_id, gmail_client_secret, etc.)

## Sprint 5: Knowledge Base & Style Engine (COMPLETE)
- [x] Database migration 002_knowledge_base.sql
  - kb_entries table: type, title, content, channel, mode, tags, embedding, source
  - 5 entry types: style_example, opinion, gold_reply, persona_note, topic_brief
  - 3 sources: manual, accepted_draft, imported
- [x] Knowledge Base service (knowledgeBaseService.ts)
  - Full CRUD with filtered queries
  - OpenAI text-embedding-3-small for semantic embeddings
  - Cosine similarity semantic search with configurable min similarity
  - Keyword-based fallback search (no API key required)
  - Auto-clears embedding when content is updated
  - Batch embedding for all unembedded active entries
- [x] RAG pipeline: buildRAGContext retrieves relevant KB entries + persona notes → injects into draft prompt
  - Semantic search when OpenAI key available, keyword fallback otherwise
  - Persona notes always included regardless of query relevance
  - Formatted as structured context block in user prompt
- [x] Learning loop: accepted drafts auto-ingested into KB as gold_reply entries
  - Triggered in SUBMIT_FEEDBACK handler when wasAccepted=true
  - Tags with response mode and "auto-ingested"
- [x] Draft generation updated with RAG context injection (draftService.ts + main/index.ts)
- [x] Updated types.ts: KBEntry, CreateKBEntryInput, KBFilters, 7 new IPC channels
- [x] Updated preload with 7 new channel wirings
- [x] 7 new IPC handlers in main/index.ts (GET_KB_ENTRIES, GET_KB_ENTRY, CREATE_KB_ENTRY, UPDATE_KB_ENTRY, DELETE_KB_ENTRY, SEARCH_KB, EMBED_KB_ENTRIES)
- [x] Updated socialStore with KB state (kbEntries, kbSearchResults, isEmbedding) + 6 actions
- [x] Knowledge Base UI (KnowledgeBase.tsx)
  - Create/edit form with type, channel, mode, tags selectors
  - Search with semantic + keyword fallback
  - Filter by type and source
  - Entry cards with type badges, content preview, metadata, embedding status
  - Enable/disable entries, edit, delete with confirmation
  - Batch embed button with progress indicator
- [x] Sidebar updated with Knowledge Base icon navigation
- [x] App.tsx updated with knowledge-base view routing

## Sprint 6: Polish & Advanced Features (COMPLETE)
- [x] Fixed field name mismatches across components
  - mapMessage: removed non-existent senderAvatarUrl/recipientName, added direction/ingestionStatus
  - CREATE_MESSAGE handler: fixed to match actual SQL columns
  - UPDATE_MESSAGE handler: removed recipientName, added channelType/direction
  - Inbox.tsx: all snake_case → camelCase (isRead, isStarred, channelType, senderName, priorityScore, createdAt)
  - Dashboard.tsx: all snake_case → camelCase, compose form fields aligned with CreateMessageInput
- [x] Desktop notification system
  - Electron Notification API fires when sync discovers new messages
  - Configurable via notificationsEnabled toggle in Settings
  - syncService accepts onNewMessages callback, wired in app lifecycle
- [x] Bulk actions in Inbox
  - Multi-select via checkboxes (click) and keyboard (x)
  - Select all toggle
  - Bulk Mark Read, Archive, Delete with action bar
  - Escape to clear selection
- [x] Keyboard shortcuts in Inbox
  - j/k navigate message list with visual focus indicator
  - Enter opens focused message
  - s stars/unstars focused message
  - a archives focused message
  - x toggles selection on focused message
  - Shortcuts hint bar at bottom of inbox
- [x] Export functionality
  - CSV export for messages (with joined classification data)
  - JSON export for SPC report (metrics + tiers + feedback count)
  - Electron save dialog for file location
  - Export buttons on Dashboard
  - 2 new IPC channels: EXPORT_MESSAGES_CSV, EXPORT_SPC_JSON
- [x] Onboarding flow (Onboarding.tsx)
  - 3-step wizard: Welcome → API Keys → Sample Message
  - First-launch detection via onboarding_complete setting
  - Skip option at every step
  - Creates sample high-priority message to explore the app
- [x] Notifications toggle in Settings panel
- [x] Renamed "Battle" → "High Stakes" in all UI labels (internal value unchanged)
- [x] One-click "Add to KB" button for accepted drafts in MessageDetail
- [x] Time-to-tier estimates in SPC Dashboard ("X more samples to Tier N")

## Sprint 7: Gmail v1 "Airtight Loop" (CURRENT)
Goal: sync → triage → draft → edit/accept → send → KB → SPC → Tier 1 unlock

### Channel Priority (Strategic AI Team Decision)
1. Gmail (ship v1) — lowest risk, highest daily utility, best data for voice + SPC
2. YouTube comments — creator traction
3. LinkedIn DMs — high value, fragile integration
4. X/Twitter — highest volatility, last

### Sync Hardening
- [x] Database migration 003_gmail_v1.sql
  - `sync_cursor` on accounts (Gmail historyId for incremental sync)
  - `recipient_email`, `in_reply_to` on messages (reply threading)
  - Indexes on thread_id, external_id, is_accepted
- [x] Retry with exponential backoff for 429/5xx (fetchWithRetry in gmailService)
- [x] Idempotency: external_id UNIQUE constraint + skip-if-exists check
- [x] Message-ID header captured as `in_reply_to` for threading
- [x] Sender email captured as `recipient_email` for reply-to
- [x] historyId stored as `sync_cursor` on account after sync

### Send via Gmail
- [x] `sendGmailReply()` in gmailService.ts
  - RFC 2822 message construction with In-Reply-To + References headers
  - Base64url encoding for Gmail API
  - Thread preservation via threadId
- [x] SEND_DRAFT IPC handler in main/index.ts
  - Loads draft → message → account → sends via Gmail
  - Stores sent message record locally (direction='outbound')
  - Auto-submits feedback (accepted+sent) for SPC
  - Auto-ingests into KB (learning loop)
  - Marks draft is_accepted=1, is_sent=1
- [x] Updated types.ts: SendDraftInput, SEND_DRAFT + GET_AUTOMATION_TIER_FOR channels, ElectronAPI methods
- [x] Updated preload with 2 new channel wirings
- [x] Updated socialStore with sendDraft + getAutomationTierFor actions

### Draft State Fix (Bug Fix)
- [x] SUBMIT_FEEDBACK now updates `drafts.is_accepted` and `drafts.is_sent`
  - Previously these columns were NEVER updated (always 0)

### Tier 1 Auto-Draft (Option A: auto-generate on message open)
- [x] MessageDetail checks automation tier when message opens
- [x] If Tier 1+, auto-triggers draft generation (no existing drafts)
- [x] Tier indicator badge in draft panel header ("Tier 0: Review Required" / "Tier 1: Auto-Draft")

### UX — Send Button & Guardrails
- [x] "Accept & Send via Gmail" button for email drafts (non-accepted)
- [x] "Send via Gmail" button for accepted email drafts (not yet sent)
- [x] "Sent" badge after successful send
- [x] Send status feedback (success/error message)
- [x] Sending spinner state
- [x] "Edit & Accept" renamed from "Edit & Send" (clearer intent)
- [x] High Stakes mode always manual (permanent Tier 0, locked in SPC)
- [x] Redline topics force Tier 0 (existing from Sprint 3)

### Sprint 7 Verification
- [ ] Fresh Gmail account connects and syncs (pulls threads)
- [ ] Open a thread, generate a draft, edit it, accept it
- [ ] Click "Send via Gmail" — reply arrives in recipient inbox
- [ ] Sent message stored locally with direction=outbound
- [ ] Click "Add to KB" on accepted draft
- [ ] SPC dashboard shows counters increment after feedback
- [ ] Tier indicator shows "Tier 0: Review Required" for fresh combos
- [ ] After 50+ accepts at 80%+ rate, Tier 1 unlocks
- [ ] Opening a message at Tier 1 auto-generates a draft
- [ ] Retry/backoff handles 429 errors from Gmail API
- [ ] No duplicate messages on repeated sync
