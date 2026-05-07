# NovaSyn Council — Components

## Component Tree

```
App.tsx
├── TitleBar
├── Sidebar (persistent left nav)
│   ├── Persona list (avatars)
│   └── Nav buttons (Dashboard, Meetings, Settings)
│
├── Main Content Area (driven by currentView)
│   ├── Dashboard (default view)
│   │   ├── Persona grid
│   │   ├── Recent meetings
│   │   └── Pending action items
│   ├── PersonaDetail (selected persona)
│   │   ├── PersonaHeader (name, role, model, stats)
│   │   ├── Tabs: Chat | Skill Docs | Memories
│   │   └── SoloChat (active conversation)
│   │       ├── Conversation list
│   │       ├── Message bubbles (with copy, regenerate)
│   │       ├── Search bar (Ctrl+F)
│   │       ├── Streaming text with animated cursor
│   │       └── Export button
│   └── MeetingRoom (active meeting)
│       ├── MeetingHeader (title, type, participants, export, relationships)
│       ├── MessageList (messages with persona avatars + streaming)
│       ├── IntelPanel (sidebar: consensus, insights, action items)
│       ├── ItemsPanel (action items + decision records CRUD)
│       ├── RelationshipPanel (persona relationships)
│       └── MessageInput
│
├── SearchPanel (command palette overlay, Ctrl+K)
│
└── Modals
    ├── PersonaBuilder (create/edit persona)
    ├── SkillDocEditor (create/edit skill doc)
    ├── MemoryEditor (create/edit memory)
    ├── MemoryReviewPanel (review AI-extracted memories)
    ├── MeetingCreator (configure new meeting)
    └── SettingsPanel
```

## Implemented Components

### App.tsx
- Root component
- Renders TitleBar + Sidebar + main content area + modals
- Switches main content based on `currentView` state ('dashboard' | 'persona' | 'meeting')
- Loads initial data on mount (personas, settings, API keys, models, meetings)

### TitleBar
- Draggable title bar with "NovaSyn Council" branding
- Min/max/close buttons

### Sidebar
- Left nav panel (~56px wide, icon-based)
- Persona avatars (click to select → PersonaDetail view)
- Bottom buttons: Dashboard (home), Meetings, Settings
- "+" button to create new persona

### Dashboard
- Persona grid (card per persona with emoji, name, role, model badge)
- Recent meetings section
- Pending action items section with status toggle buttons
- Quick actions: "New Persona", "Start Meeting"

### PersonaDetail
- Full persona view when a persona is selected
- **PersonaHeader**: Name, role, emoji avatar, model badge, stats
- **Tabs**: Chat | Skill Docs | Memories
- **Chat tab**: ConversationList + SoloChat
- **Skill Docs tab**: List with create/edit/delete
- **Memories tab**: Filtered list with search, create/edit/delete

### SoloChat
- 1:1 conversation with selected persona
- Message bubbles (human right-aligned, persona left-aligned)
- **Streaming**: Real-time text with animated cursor during AI responses
- **Inline title editing**: Click title to edit, Enter to save
- **Copy-to-clipboard**: Button on each message with "Copied" feedback
- **Regenerate**: Button on last AI message to re-generate response
- **Export**: Export conversation as markdown via save dialog
- **Search**: Ctrl+F toggle, real-time message filtering, match count, highlight ring
- Conversation selector dropdown at top
- "Extract Memories" button after conversation
- Markdown rendering (code blocks, headers, lists, bold, inline code)

### MeetingRoom
- Full meeting view with transcript and intelligence
- **MeetingHeader**: Title, type badge, participant avatars, export button, relationships button, end meeting button
- **MessageList**: Scrollable messages with persona emoji avatars and names
- **Streaming**: Per-persona streaming with persona identification (avatar + name + animated cursor)
- **IntelPanel** (right sidebar): AI-detected consensus, insights, disagreements, action items
  - "Accept" buttons to save suggested action items
  - "Save" buttons to record consensus as decisions
- **ItemsPanel** (toggle panel): Full CRUD for action items and decision records
  - Action item status cycling: pending → in_progress → completed → cancelled
  - Manual add forms for both action items and decisions
- **MessageInput**: Human input with send button

### MeetingCreator (Modal)
- Configure a new meeting before starting
- Participant selection (checkboxes from all personas)
- Meeting title + agenda input
- Meeting type selector

### PersonaBuilder (Modal)
- Create/edit persona form
- Fields: name, role, department, emoji avatar, bio
- Model selector, temperature slider
- System prompt textarea, behavior rules, communication style
- 7 persona templates (Developer, Marketing, Designer, Analyst, Strategist, Editor, Researcher)

### SkillDocEditor (Modal)
- Create/edit skill doc
- Fields: title, category dropdown, content textarea
- Loading rule toggle, relevance tags input
- Token count display, persona assignment

### MemoryEditor (Modal)
- Create/edit individual memory
- Fields: type selector, content, importance slider, relevance tags, shared toggle

### MemoryReviewPanel (Modal)
- Review AI-extracted memories from conversations
- Accept/edit/reject each extracted memory
- Shows AI-assigned type, importance, and tags

### RelationshipPanel
- Manages persona-to-persona relationships
- Accessible from PersonaDetail header and MeetingRoom header via "Relationships" button
- Displays existing relationships with type badges and descriptions
- Create/edit/delete relationships manually
- "Suggest Relationships" button triggers AI-powered suggestions based on meeting history
- Relationship types: collaborator, reports_to, mentors, conflicts_with, etc.

### SearchPanel
- Global search command palette overlay
- Activated via search button in Sidebar or Ctrl+K global shortcut
- Searches across 7 tables: personas, conversations, conversation_messages, meetings, meeting_messages, memories, skill_docs, action_items
- LIKE-based queries with text snippets and deduplication
- Keyboard navigation (arrow keys, Enter to select, Escape to close)
- Results grouped by type with icons

### AnalyticsPanel
- Cost analytics dashboard showing token usage and cost breakdowns
- Breakdowns by persona, model, and time period
- Aggregates data from conversation and meeting messages
- Accessible from Dashboard via analytics button
- Filterable by date range

### SettingsPanel (Modal)
- Theme selector (dark/light)
- Default model selection
- Default temperature
- API key status display

## Styling Conventions

- Dark theme: `bg-[#16213e]`, `bg-[#1a1a2e]`, `bg-[var(--bg-page)]`
- Tailwind utility classes, no CSS modules
- `text-surface-*` for text colors (200=bright, 400=medium, 500=muted, 600=dim)
- `text-primary-*` for accent colors
- Borders: `border-white/10`, `border-white/5`
- Cards: `bg-white/[0.02]` or `bg-white/[0.03]`
- Modals: `fixed inset-0 bg-black/60 z-50` overlay pattern
- Buttons: `bg-primary-600 hover:bg-primary-500 text-white rounded` for primary
